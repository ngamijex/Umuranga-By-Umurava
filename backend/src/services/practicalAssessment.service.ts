import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import pdfParse from "pdf-parse";
import { geminiChatText } from "../config/gemini";
import { jsonrepair } from "jsonrepair";
import { Job } from "../models/Job.model";
import { Candidate } from "../models/Candidate.model";
import { PracticalSubmission, IPracticalSubmission } from "../models/PracticalSubmission.model";

function stripJsonFence(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return t;
}

async function buildSubmissionTextForPrompt(sub: IPracticalSubmission): Promise<string> {
  const raw = sub.answers || "";
  try {
    const j = JSON.parse(raw) as {
      version?: number;
      textAnswers?: Record<string, string>;
      files?: Array<{ originalName?: string; storedPath?: string; mimeType?: string; questionId?: string }>;
    };
    if (j && typeof j === "object" && j.textAnswers && typeof j.textAnswers === "object") {
      let out = "Structured answers:\n" + JSON.stringify(j.textAnswers, null, 2);
      if (Array.isArray(j.files) && j.files.length > 0) {
        out += "\n\n--- Uploaded files ---\n";
        for (const f of j.files) {
          out += `\nFile: ${f.originalName || "?"} (${f.mimeType || "?"}) [question: ${f.questionId || "—"}]\n`;
          if (f.storedPath && f.mimeType?.includes("pdf")) {
            try {
              const buf = await fs.readFile(f.storedPath);
              const data = await pdfParse(buf);
              out += `PDF text excerpt:\n${String(data.text).slice(0, 14_000)}\n`;
            } catch {
              out += "(Could not read PDF text.)\n";
            }
          } else if (f.storedPath && (f.mimeType?.includes("text") || f.originalName?.endsWith(".txt"))) {
            try {
              const txt = await fs.readFile(f.storedPath, "utf8");
              out += `Text excerpt:\n${txt.slice(0, 12_000)}\n`;
            } catch {
              out += "(Could not read file.)\n";
            }
          } else if (f.storedPath) {
            out += `Stored at: ${path.basename(f.storedPath)} (binary or code archive — evaluate from description in answers if provided.)\n`;
          }
        }
      }
      return out.slice(0, 55_000);
    }
  } catch {
    /* legacy plain string */
  }
  return raw.slice(0, 50_000);
}

export async function gradeSubmission(sub: IPracticalSubmission): Promise<{ score: number; feedback: string }> {
  const job = await Job.findById(sub.jobId);
  const cand = await Candidate.findById(sub.candidateId);
  if (!job || !cand) throw new Error("Job or candidate not found");

  const body = await buildSubmissionTextForPrompt(sub);

  const prompt = `You are an expert hiring assessor. Grade this practical assessment submission for the role.

Job title: ${job.title}
Department: ${job.department}
Job description (excerpt): ${String(job.description).slice(0, 4000)}

Candidate: ${cand.firstName} ${cand.lastName}

Their submission (written answers, file excerpts where available):
---
${body}
---

Return ONLY valid JSON:
{ "score": <number 0-100>, "feedback": "<2-4 sentences: strengths, gaps, and whether they demonstrated role-relevant skills>" }`;

  const raw = await geminiChatText(prompt, { maxRetries: 3, maxOutputTokens: 1024, jsonMode: true });
  const fb = raw.indexOf("{"); const lb = raw.lastIndexOf("}");
  const jsonStr = fb !== -1 && lb > fb ? raw.slice(fb, lb + 1) : raw;

  let parsed: { score?: number; feedback?: string };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    try { parsed = JSON.parse(jsonrepair(jsonStr)); }
    catch { throw new Error("AI returned invalid JSON for grading."); }
  }
  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
  const feedback = String(parsed.feedback || "").trim() || "No feedback provided.";
  return { score, feedback };
}

export async function compareAndRankSubmissions(
  jobId: mongoose.Types.ObjectId | string,
  pipelineStageIndex: number
): Promise<{ ranked: { candidateId: string; compareRank: number; comparisonSummary: string }[] }> {
  const subs = await PracticalSubmission.find({
    jobId,
    pipelineStageIndex,
    score: { $exists: true, $ne: null },
  }).sort({ score: -1 });

  if (subs.length === 0) {
    return { ranked: [] };
  }

  const job = await Job.findById(jobId);
  if (!job) throw new Error("Job not found");

  const lines: string[] = [];
  for (const s of subs) {
    const c = await Candidate.findById(s.candidateId).select("firstName lastName email");
    lines.push(
      `CandidateId=${s.candidateId} | Name=${c?.firstName} ${c?.lastName} | PriorScore=${s.score} | Feedback=${(s.feedback || "").slice(0, 500)}`
    );
  }

  const prompt = `You compare candidates who completed the same practical assessment for: ${job.title}.

Here are their AI grades and feedback summaries:
${lines.join("\n")}

Task: Assign a relative rank 1 (strongest overall fit for this role based on practical work) to ${subs.length} (weakest among this group). Break ties using holistic judgment.

Return ONLY valid JSON:
{
  "ranking": [
    { "candidateId": "<mongo id string>", "rank": 1, "note": "<one short sentence why this position>" }
  ]
}

Include every candidate exactly once. Ranks must be 1..${subs.length} with no duplicates.`;

  const raw = await geminiChatText(prompt, { maxRetries: 3, maxOutputTokens: 1024, jsonMode: true });
  const fb2 = raw.indexOf("{"); const lb2 = raw.lastIndexOf("}");
  const jsonStr2 = fb2 !== -1 && lb2 > fb2 ? raw.slice(fb2, lb2 + 1) : raw;

  let parsed: { ranking?: Array<{ candidateId?: string; rank?: number; note?: string }> };
  try {
    parsed = JSON.parse(jsonStr2);
  } catch {
    try { parsed = JSON.parse(jsonrepair(jsonStr2)); }
    catch { throw new Error("AI returned invalid JSON for comparison."); }
  }

  const ranking = parsed.ranking || [];
  const out: { candidateId: string; compareRank: number; comparisonSummary: string }[] = [];

  for (const r of ranking) {
    const id = r.candidateId ? String(r.candidateId) : "";
    if (!id || typeof r.rank !== "number") continue;
    await PracticalSubmission.updateOne(
      { jobId, candidateId: id, pipelineStageIndex },
      {
        $set: {
          compareRank: r.rank,
          comparisonSummary: String(r.note || "").trim(),
        },
      }
    );
    out.push({
      candidateId: id,
      compareRank: r.rank,
      comparisonSummary: String(r.note || "").trim(),
    });
  }

  return { ranked: out.sort((a, b) => a.compareRank - b.compareRank) };
}

export async function gradeAllPending(jobId: string, pipelineStageIndex: number): Promise<{ graded: number }> {
  const subs = await PracticalSubmission.find({
    jobId,
    pipelineStageIndex,
    $or: [{ score: { $exists: false } }, { score: null }],
  });

  let graded = 0;
  for (const sub of subs) {
    const { score, feedback } = await gradeSubmission(sub);
    sub.score = score;
    sub.feedback = feedback;
    await sub.save();
    graded++;
  }

  if (graded > 0) {
    await compareAndRankSubmissions(jobId, pipelineStageIndex);
  }

  return { graded };
}
