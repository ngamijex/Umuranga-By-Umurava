import mongoose from "mongoose";
import { openaiChatText } from "../config/openai";
import type { IApplicantComms, IPipelineStage } from "../models/Pipeline.model";
import type { IJob } from "../models/Job.model";
import type { ICandidate } from "../models/Candidate.model";

export type DraftKind = "advance" | "regret";

export interface EmailDraft {
  candidateId: string;
  kind: DraftKind;
  to: string;
  subject: string;
  body: string;
}

const SIGNATURE = `\n\nBest regards,\nThe Umuranga Hiring Team\nUmuranga | AI-Powered Talent Screening\numuranga.hire@gmail.com`;

function appendSignature(body: string): string {
  // Only append if signature not already present
  if (body.includes("Umuranga Hiring Team")) return body;
  return body.trimEnd() + SIGNATURE;
}

function stripJsonFence(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return t;
}

export async function draftEmailsForStageOutcome(
  job: IJob,
  completedStage: IPipelineStage,
  stageIndex: number,
  nextStage: IPipelineStage | undefined,
  nextApplicantComms: IApplicantComms | undefined,
  candidates: ICandidate[],
  shortlistedIds: mongoose.Types.ObjectId[],
  internalAssessmentBaseUrl?: string,
  candidateInterviewLinks?: Record<string, string>,
  /** If true, only draft regret emails — shortlisted candidates get no email at this stage */
  regretOnly?: boolean
): Promise<EmailDraft[]> {
  const shortSet = new Set(shortlistedIds.map(id => String(id)));
  const byId = new Map(candidates.map(c => [String(c._id), c]));

  const nextName = nextStage?.name || "the next step";
  const nextType = nextStage?.type || "";
  const comms = nextApplicantComms || ({} as IApplicantComms);

  // Build per-candidate rows
  const hrOverrideLink = comms.assessmentUrl?.trim();
  const rows: Array<{ id: string; name: string; email: string; kind: DraftKind; assessmentLink?: string; interviewLink?: string }> = [];
  for (const c of candidates) {
    const id = String(c._id);
    const kind: DraftKind = shortSet.has(id) ? "advance" : "regret";
    // When regretOnly, skip advance candidates entirely
    if (regretOnly && kind === "advance") continue;
    const row: { id: string; name: string; email: string; kind: DraftKind; assessmentLink?: string; interviewLink?: string } = {
      id, name: `${c.firstName} ${c.lastName}`.trim(), email: c.email, kind,
    };
    if (kind === "advance" && nextType === "practical") {
      row.assessmentLink = hrOverrideLink
        ? hrOverrideLink
        : internalAssessmentBaseUrl
          ? `${internalAssessmentBaseUrl}?jobId=${String(job._id)}&email=${encodeURIComponent(c.email)}`
          : "(HR will share the link)";
    }
    if (kind === "advance" && nextType === "ai_interview") {
      row.interviewLink = (candidateInterviewLinks && candidateInterviewLinks[id])
        ? candidateInterviewLinks[id]
        : "(HR will share the link)";
    }
    rows.push(row);
  }

  if (rows.length === 0) return [];

  // Build the next-step context block
  let nextStepBlock: string;
  if (nextType === "practical") {
    const deadline = comms.submissionDeadlineAt
      ? new Date(comms.submissionDeadlineAt).toLocaleString()
      : "as communicated by HR";
    const format = comms.assessmentFormat?.trim() || "to be described by HR";
    nextStepBlock = `Next step is a PRACTICAL ASSESSMENT ("${nextName}").
For ADVANCE candidates: congratulate them, state the deadline (${deadline}), briefly describe format (${format}), include their personal assessmentLink verbatim.
Extra HR notes: ${comms.extraInstructions || "none"}`;
  } else if (nextType === "ai_interview") {
    nextStepBlock = `Next step is an AI INTERVIEW ("${nextName}").
For ADVANCE candidates: congratulate them on the practical assessment, explain it's a 15–20 min live AI video interview, include their unique interviewLink verbatim labelled "Your Interview Link:".
Extra HR notes: ${comms.extraInstructions || "none"}`;
  } else {
    nextStepBlock = `Next step: "${nextName}". Extra HR notes: ${comms.extraInstructions || "none"}`;
  }

  const prompt = `You are writing professional hiring emails on behalf of Umuranga (an AI-powered talent screening platform).

Job: ${job.title} — ${job.department}
Stage completed: "${completedStage.name}"
${nextStage ? nextStepBlock : "This is the final decision — no further stages."}

Write ONE personalised email per candidate:
- kind "advance": congratulate, include all next-step details. 160–250 words.
- kind "regret": warm, sincere decline — thank them for their time, wish them well. 80–130 words.

Use ONE consistent email structure per kind (same tone and format), just personalise the name and any links/details.

Do NOT include a signature block — it will be added automatically.

Candidates:
${JSON.stringify(rows, null, 2)}

Return ONLY valid JSON (no markdown):
{
  "messages": [
    { "candidateId": "<id>", "kind": "advance"|"regret", "subject": "...", "body": "..." }
  ]
}`;

  const raw = await openaiChatText(prompt, { maxRetries: 3 });
  let parsed: { messages?: Array<{ candidateId?: string; kind?: string; subject?: string; body?: string }> };
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("AI returned invalid JSON for email drafts. Try again.");
  }

  const list = parsed.messages || [];
  if (!Array.isArray(list) || list.length === 0) throw new Error("No drafts returned from AI.");

  const interviewLinkMap = new Map<string, string>();
  for (const row of rows) { if (row.interviewLink) interviewLinkMap.set(row.id, row.interviewLink); }

  const out: EmailDraft[] = [];
  for (const m of list) {
    const id = m.candidateId ? String(m.candidateId) : "";
    const cand = byId.get(id);
    if (!cand || !m.subject || !m.body) continue;
    const kind = m.kind === "regret" ? "regret" : "advance";
    let body = appendSignature(String(m.body).trim());

    // Guarantee the unique interview link is present in advance emails
    if (kind === "advance" && nextType === "ai_interview") {
      const link = interviewLinkMap.get(id);
      if (link && link !== "(HR will share the link)" && !body.includes(link)) {
        body = body.replace(SIGNATURE, "") + `\n\n──────────────────────────\nYour Personal Interview Link:\n${link}\n──────────────────────────\n\nThis link is unique to you. Do not share it with others.` + SIGNATURE;
      }
    }

    out.push({ candidateId: id, kind, to: cand.email, subject: String(m.subject).trim(), body });
  }

  if (out.length === 0) throw new Error("Could not parse any valid drafts from AI response.");
  return out;
}

/**
 * Practical stage only: everyone in the pool was selected to take the exam.
 * Congratulations + exam link + deadline + how to submit (no regret in this pool).
 */
export async function draftPracticalInvitationEmails(
  job: IJob,
  practicalStage: IPipelineStage,
  practicalComms: IApplicantComms | undefined,
  candidates: ICandidate[],
  internalAssessmentBaseUrl?: string
): Promise<EmailDraft[]> {
  if (candidates.length === 0) return [];

  const comms = practicalComms || ({} as IApplicantComms);
  const deadline = comms.submissionDeadlineAt
    ? new Date(comms.submissionDeadlineAt).toLocaleString()
    : "as communicated by HR";
  const hrOverrideLink = comms.assessmentUrl?.trim();
  const format = comms.assessmentFormat?.trim() || "the assessment format described by HR";

  const rows = candidates.map(c => {
    const personalLink = hrOverrideLink
      ? hrOverrideLink
      : internalAssessmentBaseUrl
        ? `${internalAssessmentBaseUrl}?jobId=${String(job._id)}&email=${encodeURIComponent(c.email)}`
        : "(HR will share the link)";
    return {
      id: String(c._id),
      name: `${c.firstName} ${c.lastName}`.trim(),
      email: c.email,
      assessmentLink: personalLink,
    };
  });

  const prompt = `You are writing hiring emails on behalf of Umuranga (AI-powered talent screening).

Job: ${job.title} (${job.department})
Practical stage: "${practicalStage.name}"

Each candidate below must receive a professional, warm email that:
- Congratulates them on advancing to the practical assessment stage
- States the submission deadline clearly: ${deadline}
- Describes the assessment format: ${format}
- Tells them to use THEIR OWN personal assessment link (each row has an assessmentLink — include it verbatim)
- Extra HR notes: ${comms.extraInstructions || "none"}

Use ONE consistent email structure for all candidates — just change the name and their personal link.
Do NOT include a signature block — it will be added automatically.

Candidates (each with their own link):
${JSON.stringify(rows, null, 2)}

Return ONLY valid JSON:
{
  "messages": [
    { "candidateId": "<id>", "kind": "advance", "subject": "...", "body": "..." }
  ]
}

kind always "advance". Body 130–220 words.`;

  const raw = await openaiChatText(prompt, { maxRetries: 3 });
  let parsed: { messages?: Array<{ candidateId?: string; kind?: string; subject?: string; body?: string }> };
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("AI returned invalid JSON for practical invitation drafts.");
  }

  const byId = new Map(candidates.map(c => [String(c._id), c]));
  const linkById = new Map(rows.map(r => [r.id, r.assessmentLink]));
  const out: EmailDraft[] = [];
  for (const m of parsed.messages || []) {
    const id = m.candidateId ? String(m.candidateId) : "";
    const cand = byId.get(id);
    if (!cand || !m.subject || !m.body) continue;
    let body = appendSignature(String(m.body).trim());
    // Guarantee the personal assessment link is always present
    const link = linkById.get(id);
    if (link && link !== "(HR will share the link)" && !body.includes(link)) {
      body = body.replace(SIGNATURE, "") + `\n\n──────────────────────────\nYour Personal Assessment Link:\n${link}\n──────────────────────────` + SIGNATURE;
    }
    out.push({ candidateId: id, kind: "advance", to: cand.email, subject: String(m.subject).trim(), body });
  }

  if (out.length === 0) {
    throw new Error("Could not parse practical invitation drafts from AI.");
  }

  return out;
}
