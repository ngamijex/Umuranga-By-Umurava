import { IJob } from "../models/Job.model";
import { ICandidate, IWorkExperience } from "../models/Candidate.model";
import type { IHrInputsAssessment, IJobRequirementComparisonRow } from "../models/ScreeningResult.model";
import { geminiChatText } from "../config/gemini";
import { buildHrContextStringForJob } from "./pipelineHrContext.service";

export interface ScreeningOutput {
  overallScore: number;
  dimensionScores: {
    skills: number;
    experience: number;
    education: number;
    culture: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  recommendation: "strong_yes" | "yes" | "maybe" | "no";
  aiExplanation: string;
  /** Point-by-point: job needs vs what the candidate offers */
  jobRequirementComparisons: IJobRequirementComparisonRow[];
  /** Explicit alignment with HR pipeline inputs (preferences, criteria, notes) */
  hrInputsAssessment: IHrInputsAssessment;
}

const FIT_LEVELS = new Set(["strong", "partial", "weak", "missing"]);

const calcTotalYears = (exp: IWorkExperience[]): number => {
  if (!exp?.length) return 0;
  return exp.reduce((sum, e) => {
    const sy = parseInt((e.startDate || "").slice(0, 4)) || 0;
    const ey = e.isCurrent ? new Date().getFullYear() : (parseInt((e.endDate || "").slice(0, 4)) || sy);
    return sum + Math.max(0, ey - sy);
  }, 0);
};

function coerceFitLevel(v: unknown): IJobRequirementComparisonRow["fitLevel"] {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  if (FIT_LEVELS.has(s)) return s as IJobRequirementComparisonRow["fitLevel"];
  return "partial";
}

function normalizeScreeningOutput(raw: Record<string, unknown>): ScreeningOutput {
  const rows = Array.isArray(raw.jobRequirementComparisons) ? raw.jobRequirementComparisons : [];
  const jobRequirementComparisons: IJobRequirementComparisonRow[] = rows.map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      aspect: String(r.aspect ?? ""),
      whatJobNeeds: String(r.whatJobNeeds ?? ""),
      whatCandidateOffers: String(r.whatCandidateOffers ?? ""),
      fitLevel: coerceFitLevel(r.fitLevel),
      detail: String(r.detail ?? ""),
    };
  });

  const h = (raw.hrInputsAssessment ?? {}) as Record<string, unknown>;
  const hrInputsAssessment: IHrInputsAssessment = {
    howPreferencesApply: String(h.howPreferencesApply ?? ""),
    howCriteriaApply: String(h.howCriteriaApply ?? ""),
    howNotesApply: String(h.howNotesApply ?? ""),
    overallAlignment: String(h.overallAlignment ?? ""),
  };

  return {
    overallScore: Number(raw.overallScore) || 0,
    dimensionScores: {
      skills: Number((raw.dimensionScores as Record<string, unknown>)?.skills) || 0,
      experience: Number((raw.dimensionScores as Record<string, unknown>)?.experience) || 0,
      education: Number((raw.dimensionScores as Record<string, unknown>)?.education) || 0,
      culture: Number((raw.dimensionScores as Record<string, unknown>)?.culture) || 0,
    },
    matchedSkills: Array.isArray(raw.matchedSkills) ? (raw.matchedSkills as string[]) : [],
    missingSkills: Array.isArray(raw.missingSkills) ? (raw.missingSkills as string[]) : [],
    strengths: Array.isArray(raw.strengths) ? (raw.strengths as string[]) : [],
    gaps: Array.isArray(raw.gaps) ? (raw.gaps as string[]) : [],
    recommendation: (["strong_yes", "yes", "maybe", "no"].includes(String(raw.recommendation))
      ? raw.recommendation
      : "maybe") as ScreeningOutput["recommendation"],
    aiExplanation: String(raw.aiExplanation ?? ""),
    jobRequirementComparisons,
    hrInputsAssessment,
  };
}

// Resume excerpt sent to Gemini — 4000 chars is enough context without bloating the prompt
const RESUME_PROMPT_CHARS = 4000;

const buildPrompt = (job: IJob, candidate: ICandidate, hrContext: string, _stageType?: string): string => {
  const totalYears = calcTotalYears(candidate.experience || []);

  // Compact field summaries — no redundant labels, use semicolons to save tokens
  const skillsSummary = (candidate.skills || [])
    .slice(0, 12)
    .map(s => `${s.name}(${s.level},${s.yearsOfExperience}yr)`).join(", ") || "None";
  const expSummary = (candidate.experience || [])
    .slice(0, 4)
    .map(e => `${e.role}@${e.company}(${e.startDate}-${e.isCurrent ? "now" : e.endDate})${e.description ? ": " + e.description.slice(0, 120) : ""}`)
    .join(" | ") || "None";
  const eduSummary = (candidate.education || [])
    .slice(0, 3)
    .map(e => `${e.degree} ${e.fieldOfStudy}—${e.institution}(${e.startYear}-${e.endYear})`).join("; ") || "None";
  const projSummary = (candidate.projects || [])
    .slice(0, 3)
    .map(p => `${p.name}: ${p.description.slice(0, 80)}[${(p.technologies || []).join(",")}]`).join("; ") || "None";
  const resumeSlice = candidate.resumeText ? candidate.resumeText.slice(0, RESUME_PROMPT_CHARS) : "";
  const hrTrimmed = hrContext.slice(0, 1500); // cap HR context to prevent prompt bloat

  return `You are an expert AI talent screener. Return ONLY a valid JSON object.

JOB: ${job.title} | ${job.department}
Required skills: ${job.requiredSkills.join(", ")}
Preferred skills: ${(job.preferredSkills || []).join(", ") || "none"}
Experience: ${job.experienceYears}yr min | Education: ${job.educationLevel}
Weights: skills=${job.weights.skills}% experience=${job.weights.experience}% education=${job.weights.education}% culture=${job.weights.culture}%
Description (excerpt): ${String(job.description || "").slice(0, 800)}

HR CONTEXT: ${hrTrimmed || "None configured."}

CANDIDATE: ${candidate.firstName} ${candidate.lastName} | ~${totalYears}yr exp
${candidate.bio?.trim() ? `Bio: ${candidate.bio.slice(0, 200)}` : ""}
Skills: ${skillsSummary}
Experience: ${expSummary}
Education: ${eduSummary}
Projects: ${projSummary}
${resumeSlice ? `CV text (read carefully, primary source):\n${resumeSlice}` : "No CV text stored — use structured fields only."}

OUTPUT RULES:
- jobRequirementComparisons: exactly 4 rows (most critical job requirements only)
- hrInputsAssessment: 1 sentence per sub-field; "Not configured." if HR fields were blank
- aiExplanation: 2 sentences MAX
- Scores must reflect actual evidence; do not keyword-match titles

Return exactly this JSON shape:
{"overallScore":<0-100>,"dimensionScores":{"skills":<0-100>,"experience":<0-100>,"education":<0-100>,"culture":<0-100>},"matchedSkills":["..."],"missingSkills":["..."],"strengths":["..."],"gaps":["..."],"recommendation":"strong_yes|yes|maybe|no","aiExplanation":"<2 sentences>","jobRequirementComparisons":[{"aspect":"<label>","whatJobNeeds":"<need>","whatCandidateOffers":"<evidence>","fitLevel":"strong|partial|weak|missing","detail":"<1 sentence>"}],"hrInputsAssessment":{"howPreferencesApply":"<1 sentence>","howCriteriaApply":"<1 sentence>","howNotesApply":"<1 sentence>","overallAlignment":"<1 sentence>"}}
`;
};

/**
 * Screens one candidate. If \`hrContext\` is omitted, loads HR text from Pipeline stage 0 (Initial CV Screen),
 * or a clear fallback when no pipeline exists — so **job + candidate + HR** is always included in the prompt.
 * When running a specific pipeline stage, pass the stage-specific \`hrContext\` from the route (same as today).
 */
export const screenCandidate = async (
  job: IJob,
  candidate: ICandidate,
  hrContext?: string,
  stageType?: string
): Promise<ScreeningOutput> => {
  let combinedHr = hrContext;
  if (combinedHr === undefined || combinedHr === null) {
    combinedHr = await buildHrContextStringForJob(job._id, 0);
  }

  const prompt = buildPrompt(job, candidate, combinedHr, stageType);

  try {
    // jsonMode:true → responseMimeType:"application/json" forces Gemini to always produce valid,
    // complete JSON — eliminates all "Expected ',' or '}'" parse errors.
    // batch:true → uses GEMINI_BATCH_MODEL (gemini-2.0-flash, 5–10× faster than 2.5-flash).
    // 3000 tokens is enough now that the prompt is trimmed to 3–5 comparison rows.
    const text = await geminiChatText(prompt, { maxOutputTokens: 3000, batch: true, jsonMode: true });

    const parsed = JSON.parse(text) as Record<string, unknown>;
    return normalizeScreeningOutput(parsed);
  } catch (error: any) {
    console.error("[screenCandidate] Gemini error:", error?.message || String(error));
    throw new Error(`Gemini API error: ${error?.message || String(error)}`);
  }
};
