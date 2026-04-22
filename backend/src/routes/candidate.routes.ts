import { Router, Response } from "express";
import multer from "multer";
import AdmZip from "adm-zip";
import pdfParse from "pdf-parse";
import { protect, AuthRequest } from "../middleware/auth.middleware";
import { Candidate } from "../models/Candidate.model";
import { InterviewSession } from "../models/InterviewSession.model";
import { ScreeningResult } from "../models/ScreeningResult.model";
import { PracticalSubmission } from "../models/PracticalSubmission.model";
import { openaiChatText } from "../config/openai";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

/** Normalize JSON/CSV bulk rows so Mongoose always gets required fields (headline, location, valid nested docs). */
function sanitizeBulkCandidate(raw: unknown, jobId: string): Record<string, unknown> {
  const c = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const exp = Array.isArray(c.experience) ? c.experience : [];
  const exp0 = exp[0] && typeof exp[0] === "object" ? (exp[0] as Record<string, unknown>) : null;
  const headline =
    (typeof c.headline === "string" && c.headline.trim()) ||
    (typeof c.title === "string" && c.title.trim()) ||
    (typeof c.role === "string" && c.role.trim()) ||
    (exp0 && typeof exp0.role === "string" && exp0.role.trim()) ||
    "Candidate";

  const email = String(c.email ?? "").toLowerCase().trim();
  if (!email) {
    throw new Error("missing email");
  }

  const skills = Array.isArray(c.skills)
    ? (c.skills as unknown[])
        .filter(s => s && typeof s === "object" && String((s as { name?: string }).name || "").trim())
        .map(s => {
          const sk = s as { name?: string; level?: string; yearsOfExperience?: number };
          return {
            name: String(sk.name).trim(),
            level: ["Beginner", "Intermediate", "Advanced", "Expert"].includes(String(sk.level))
              ? sk.level
              : "Intermediate",
            yearsOfExperience:
              typeof sk.yearsOfExperience === "number" && !Number.isNaN(sk.yearsOfExperience)
                ? sk.yearsOfExperience
                : 0,
          };
        })
    : [];

  const certifications = Array.isArray(c.certifications)
    ? (c.certifications as unknown[]).filter(x => x && typeof x === "object" && String((x as { name?: string }).name || "").trim())
    : [];

  const projects = Array.isArray(c.projects)
    ? (c.projects as unknown[]).filter(p => p && typeof p === "object" && String((p as { name?: string }).name || "").trim())
    : [];

  const LANG_PROF = ["Basic", "Conversational", "Fluent", "Native"] as const;
  const languages = Array.isArray(c.languages)
    ? (c.languages as unknown[])
        .filter(l => l && typeof l === "object" && String((l as { name?: string }).name || "").trim())
        .map(l => {
          const x = l as { name?: string; proficiency?: string };
          const prof = String(x.proficiency || "");
          return {
            name: String(x.name).trim(),
            proficiency: (LANG_PROF as readonly string[]).includes(prof) ? prof : "Conversational",
          };
        })
    : [];

  const fullName =
    typeof (c as Record<string, unknown>).name === "string"
      ? String((c as Record<string, unknown>).name).trim()
      : "";
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const fnRaw = String(c.firstName ?? "").trim();
  const lnRaw = String(c.lastName ?? "").trim();
  const firstNameResolved =
    fnRaw || (nameParts.length ? nameParts[0] : "") || "Unknown";
  const lastNameResolved =
    lnRaw ||
    (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "") ||
    (nameParts.length === 1 && !fnRaw && !lnRaw ? "—" : "") ||
    "Unknown";

  let availability: Record<string, unknown> = { status: "Available", type: "Full-time" };
  if (c.availability && typeof c.availability === "object") {
    const a = c.availability as Record<string, unknown>;
    availability = {
      status: ["Available", "Open to Opportunities", "Not Available"].includes(String(a.status))
        ? a.status
        : "Available",
      type: ["Full-time", "Part-time", "Contract"].includes(String(a.type)) ? a.type : "Full-time",
    };
    if (typeof a.startDate === "string") availability.startDate = a.startDate;
  }

  return {
    jobId,
    firstName: firstNameResolved,
    lastName: lastNameResolved,
    email,
    headline,
    ...(typeof c.bio === "string" ? { bio: c.bio } : {}),
    location: String(c.location ?? "").trim() || "—",
    skills,
    languages,
    experience: Array.isArray(c.experience) ? c.experience : [],
    education: Array.isArray(c.education) ? c.education : [],
    certifications,
    projects,
    availability,
    socialLinks:
      c.socialLinks && typeof c.socialLinks === "object"
        ? (() => {
            const sl = c.socialLinks as Record<string, unknown>;
            return {
              ...(typeof sl.linkedin === "string" ? { linkedin: sl.linkedin } : {}),
              ...(typeof sl.github === "string" ? { github: sl.github } : {}),
              ...(typeof sl.portfolio === "string" ? { portfolio: sl.portfolio } : {}),
            };
          })()
        : {},
    ...(typeof c.resumeText === "string" ? { resumeText: c.resumeText } : {}),
    status: ["pending", "screened", "shortlisted", "rejected"].includes(String(c.status)) ? c.status : "pending",
  };
}

async function parseCVWithOpenAI(resumeText: string): Promise<any> {
  const prompt = `You are an expert HR data extractor. Given the CV/resume text below, extract the candidate's full talent profile.
Return ONLY a valid JSON object — no markdown fences, no explanation outside the JSON.
If a field cannot be determined, use an empty string, empty array, or sensible default.

Resume Text:
${resumeText.slice(0, 5000)}

Required Output Format (JSON only — follow this structure exactly):
{
  "firstName": "candidate first name",
  "lastName": "candidate last name",
  "email": "email address or empty string",
  "headline": "short professional headline, e.g. Backend Engineer – Node.js & AI",
  "bio": "1-2 sentence professional bio or empty string",
  "location": "City, Country or empty string",
  "skills": [
    { "name": "Node.js", "level": "Beginner|Intermediate|Advanced|Expert", "yearsOfExperience": 3 }
  ],
  "languages": [
    { "name": "English", "proficiency": "Basic|Conversational|Fluent|Native" }
  ],
  "experience": [
    { "company": "Company Name", "role": "Job Title", "startDate": "YYYY-MM", "endDate": "YYYY-MM or Present", "description": "key responsibilities", "technologies": ["Tech1"], "isCurrent": false }
  ],
  "education": [
    { "institution": "University Name", "degree": "Bachelor's", "fieldOfStudy": "Computer Science", "startYear": 2018, "endYear": 2022 }
  ],
  "certifications": [
    { "name": "AWS Certified Developer", "issuer": "Amazon", "issueDate": "YYYY-MM" }
  ],
  "projects": [
    { "name": "Project Name", "description": "what it does", "technologies": ["Next.js"], "role": "Lead Dev", "link": "", "startDate": "YYYY-MM", "endDate": "YYYY-MM" }
  ],
  "availability": { "status": "Available|Open to Opportunities|Not Available", "type": "Full-time|Part-time|Contract" },
  "socialLinks": { "linkedin": "", "github": "", "portfolio": "" }
}`;

  const text = await openaiChatText(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("OpenAI returned no JSON");
  return JSON.parse(jsonMatch[0]);
}

const router = Router();
router.use(protect);

router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.query;
    const filter: Record<string, unknown> = {};
    if (jobId) filter.jobId = jobId;
    const candidates = await Candidate.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: candidates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const candidate = await Candidate.create(req.body);
    res.status(201).json({ success: true, data: candidate });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/bulk", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { candidates, jobId } = req.body;
    if (!Array.isArray(candidates) || !jobId) {
      res.status(400).json({ success: false, error: "candidates array and jobId required" });
      return;
    }
    if (candidates.length === 0) {
      res.status(400).json({ success: false, error: "candidates array is empty" });
      return;
    }

    const skipped: string[] = [];
    const docs: Record<string, unknown>[] = [];
    candidates.forEach((raw: unknown, idx: number) => {
      try {
        docs.push(sanitizeBulkCandidate(raw, jobId));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "invalid row";
        skipped.push(`Row ${idx + 1}: ${msg}`);
      }
    });

    if (!docs.length) {
      res.status(400).json({
        success: false,
        error:
          skipped.length > 0
            ? `No valid candidates. ${skipped.slice(0, 5).join("; ")}${skipped.length > 5 ? ` … (+${skipped.length - 5} more)` : ""}`
            : "No valid candidates to import.",
      });
      return;
    }

    const inserted = await Candidate.insertMany(docs, { ordered: false });
    res.status(201).json({
      success: true,
      data: inserted,
      count: inserted.length,
      ...(skipped.length ? { warnings: skipped } : {}),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("E11000") || msg.includes("duplicate")) {
      res.status(400).json({
        success: false,
        error:
          "Duplicate email: one or more candidates already exist for this job. Remove duplicates or use different emails.",
      });
      return;
    }
    res.status(400).json({ success: false, error: msg });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) { res.status(404).json({ success: false, error: "Candidate not found" }); return; }
    res.json({ success: true, data: candidate });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!candidate) { res.status(404).json({ success: false, error: "Candidate not found" }); return; }
    res.json({ success: true, data: candidate });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) { res.status(404).json({ success: false, error: "Candidate not found" }); return; }
    // Cascade delete all data tied to this candidate
    await Promise.all([
      InterviewSession.deleteMany({ candidateId: candidate._id }),
      ScreeningResult.deleteMany({ candidateId: candidate._id }),
      PracticalSubmission.deleteMany({ candidateId: candidate._id }),
    ]);
    res.json({ success: true, message: "Candidate deleted" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── ZIP / PDF bulk ingestion with OpenAI CV parsing ── */
router.post("/upload-zip", upload.single("zipFile"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.body;
    if (!jobId) { res.status(400).json({ success: false, error: "jobId is required" }); return; }
    if (!req.file) { res.status(400).json({ success: false, error: "zipFile is required" }); return; }

    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries().filter(e =>
      !e.isDirectory && e.entryName.toLowerCase().endsWith(".pdf")
    );

    if (entries.length === 0) {
      res.status(400).json({ success: false, error: "No PDF files found in the ZIP archive" });
      return;
    }

    const results: { file: string; status: "ok" | "failed"; name?: string; error?: string }[] = [];

    for (const entry of entries) {
      try {
        const pdfBuffer = entry.getData();
        const parsed = await pdfParse(pdfBuffer);
        const resumeText = parsed.text || "";
        const cvData = await parseCVWithOpenAI(resumeText);
        const doc = sanitizeBulkCandidate(
          { ...cvData, resumeText: resumeText.slice(0, 6000) },
          jobId
        );
        const created = await Candidate.create(doc);
        results.push({
          file: entry.entryName,
          status: "ok",
          name: `${created.firstName} ${created.lastName}`.trim(),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const dup = msg.includes("E11000") || msg.includes("duplicate");
        results.push({
          file: entry.entryName,
          status: "failed",
          error: dup ? "Duplicate email for this job (already imported)." : msg,
        });
      }
    }

    const imported = results.filter(r => r.status === "ok").length;
    const failed = results.filter(r => r.status === "failed").length;

    res.status(201).json({
      success: true,
      imported,
      failed,
      total: entries.length,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
