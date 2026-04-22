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
  candidateInterviewLinks?: Record<string, string>
): Promise<EmailDraft[]> {
  const shortSet = new Set(shortlistedIds.map(id => String(id)));
  const byId = new Map(candidates.map(c => [String(c._id), c]));

  const nextName = nextStage?.name || "the next step";
  const nextType = nextStage?.type || "";
  const comms = nextApplicantComms || ({} as IApplicantComms);

  // Build per-candidate rows; advance candidates get a personalised link depending on next stage type
  const hrOverrideLink = comms.assessmentUrl?.trim();
  const rows: Array<{ id: string; name: string; email: string; kind: DraftKind; assessmentLink?: string; interviewLink?: string }> = [];
  for (const c of candidates) {
    const id = String(c._id);
    const kind: DraftKind = shortSet.has(id) ? "advance" : "regret";
    const row: { id: string; name: string; email: string; kind: DraftKind; assessmentLink?: string; interviewLink?: string } = {
      id,
      name: `${c.firstName} ${c.lastName}`.trim(),
      email: c.email,
      kind,
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

  // Build the assessment/next-step context block for the AI prompt
  let nextStepBlock: string;
  if (nextType === "practical") {
    const deadline = comms.submissionDeadlineAt
      ? new Date(comms.submissionDeadlineAt).toLocaleString()
      : "as communicated by HR";
    const format = comms.assessmentFormat?.trim() || "to be described by HR";
    nextStepBlock = `Next step is a PRACTICAL ASSESSMENT ("${nextName}").
For ADVANCE candidates, the email must also serve as their assessment invitation:
- Warmly congratulate them on advancing
- Clearly state the deadline: ${deadline}
- Briefly describe the format: ${format}
- Tell them to use THEIR OWN personal assessment link (each advance row has an "assessmentLink" field — include it verbatim in their email)
- They submit answers directly through that link
Extra HR notes: ${comms.extraInstructions || "none"}`;
  } else if (nextType === "ai_interview") {
    nextStepBlock = `Next step is an AI INTERVIEW ("${nextName}").
For ADVANCE candidates, the email must congratulate them on passing the practical assessment AND serve as their interview invitation:
- Warmly congratulate them on their strong practical assessment performance
- Explain this is a live AI-conducted video interview (approximately 15–20 minutes)
- Tell them to find a quiet, well-lit place with a reliable camera and microphone
- Include THEIR UNIQUE personal interview link (each advance row has an "interviewLink" field — include it verbatim in the email body, clearly labelled as "Your Interview Link:")
- They can complete the interview anytime at their convenience using that link
- No scheduling needed — the link is always available during the interview window
Extra HR notes: ${comms.extraInstructions || "none"}`;
  } else {
    nextStepBlock = `Next step: "${nextName}".
Extra HR notes: ${comms.extraInstructions || "none"}`;
  }

  const prompt = `You are helping HR send professional, warm, personalised applicant emails for a hiring process.

Job title: ${job.title}
Department: ${job.department}
Stage just completed: "${completedStage.name}"
${nextStage ? nextStepBlock : "There is no further stage — this is the final decision."}

For EACH candidate below, write ONE email:
- kind "advance": congratulate them, include ALL next-step details described above (link, deadline, format, instructions). Personalised, professional, encouraging. 160–280 words.
- kind "regret": thank them sincerely, politely decline after this stage, do not give false hope. 80–150 words.

Candidates:
${JSON.stringify(rows, null, 2)}

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "messages": [
    { "candidateId": "<id>", "kind": "advance"|"regret", "subject": "...", "body": "..." }
  ]
}

Use the same candidateId values as input. Subject lines must be clear and specific.`;

  const raw = await openaiChatText(prompt, { maxRetries: 3 });
  let parsed: { messages?: Array<{ candidateId?: string; kind?: string; subject?: string; body?: string }> };
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("AI returned invalid JSON for email drafts. Try again.");
  }

  const out: EmailDraft[] = [];
  const list = parsed.messages || [];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("No drafts returned from AI.");
  }

  // Build a map of interviewLink per candidate for post-processing
  const interviewLinkMap = new Map<string, string>();
  for (const row of rows) {
    if (row.interviewLink) interviewLinkMap.set(row.id, row.interviewLink);
  }

  for (const m of list) {
    const id = m.candidateId ? String(m.candidateId) : "";
    const cand = byId.get(id);
    if (!cand || !m.subject || !m.body) continue;
    const kind = m.kind === "regret" ? "regret" : "advance";

    let body = String(m.body).trim();

    // Guarantee the unique interview link is present in advance emails
    if (kind === "advance" && nextType === "ai_interview") {
      const link = interviewLinkMap.get(id);
      if (link && link !== "(HR will share the link)" && !body.includes(link)) {
        body += `\n\n──────────────────────────\nYour Personal Interview Link:\n${link}\n──────────────────────────\n\nThis link is unique to you. Do not share it with others.`;
      }
    }

    out.push({
      candidateId: id,
      kind,
      to: cand.email,
      subject: String(m.subject).trim(),
      body,
    });
  }

  if (out.length === 0) {
    throw new Error("Could not parse any valid drafts from AI response.");
  }

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

  const prompt = `You are helping HR email candidates who were selected for a practical assessment.

Job: ${job.title} (${job.department})
Practical stage: "${practicalStage.name}"

Each candidate below must receive a professional, warm, personalised email that:
- Congratulates them warmly on advancing to the practical assessment stage
- States the submission deadline clearly: ${deadline}
- Describes the assessment format briefly: ${format}
- Tells them to use THEIR OWN personalised assessment link (each row has an assessmentLink field — include it verbatim in their email)
- Mentions they will submit written answers (and files if applicable) directly through that link
- Extra HR notes: ${comms.extraInstructions || "none"}

Candidates (each has their own personal link — use it exactly):
${JSON.stringify(rows, null, 2)}

Return ONLY valid JSON:
{
  "messages": [
    { "candidateId": "<id>", "kind": "advance", "subject": "...", "body": "..." }
  ]
}

kind must always be "advance". Subject and body personalised with their name. Body 150–260 words.`;

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
    let body = String(m.body).trim();
    // Guarantee the personal assessment link is always present
    const link = linkById.get(id);
    if (link && link !== "(HR will share the link)" && !body.includes(link)) {
      body += `\n\n──────────────────────────\nYour Personal Assessment Link:\n${link}\n──────────────────────────`;
    }
    out.push({
      candidateId: id,
      kind: "advance",
      to: cand.email,
      subject: String(m.subject).trim(),
      body,
    });
  }

  if (out.length === 0) {
    throw new Error("Could not parse practical invitation drafts from AI.");
  }

  return out;
}
