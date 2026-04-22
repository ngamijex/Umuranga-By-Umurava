import { openaiChatText } from "../config/openai";
import type { IJob } from "../models/Job.model";
import type { IInterviewTurn, IInterviewScore } from "../models/InterviewSession.model";

function stripJsonFence(s: string): string {
  const t = s.trim();
  return t.startsWith("```") ? t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim() : t;
}

/** Candidate profile summary passed to all AI prompts */
export interface CandidateProfile {
  name: string;
  headline?: string;
  bio?: string;
  location?: string;
  skills?: { name: string; level: string; yearsOfExperience: number }[];
  experience?: { company: string; role: string; startDate: string; endDate: string; description: string; technologies: string[]; isCurrent: boolean }[];
  education?: { institution: string; degree: string; fieldOfStudy: string; startYear: number; endYear: number }[];
  projects?: { name: string; description: string; technologies: string[]; role: string }[];
  certifications?: { name: string; issuer: string }[];
  resumeText?: string;
}

/** Build a concise candidate context block for AI prompts */
function buildCandidateContext(c: CandidateProfile): string {
  const lines: string[] = [`Candidate: ${c.name}`];

  if (c.headline) lines.push(`Headline: ${c.headline}`);
  if (c.location) lines.push(`Location: ${c.location}`);
  if (c.bio) lines.push(`Bio: ${c.bio.slice(0, 300)}`);

  if (c.skills?.length) {
    const top = c.skills
      .sort((a, b) => b.yearsOfExperience - a.yearsOfExperience)
      .slice(0, 10)
      .map(s => `${s.name} (${s.level}, ${s.yearsOfExperience}yr${s.yearsOfExperience !== 1 ? "s" : ""})`)
      .join(", ");
    lines.push(`Skills: ${top}`);
  }

  if (c.experience?.length) {
    lines.push("Work Experience:");
    c.experience.slice(0, 4).forEach(e => {
      const dates = e.isCurrent ? `${e.startDate} – present` : `${e.startDate} – ${e.endDate}`;
      lines.push(`  • ${e.role} at ${e.company} (${dates})`);
      if (e.description) lines.push(`    ${e.description.slice(0, 200)}`);
      if (e.technologies?.length) lines.push(`    Tech: ${e.technologies.join(", ")}`);
    });
  }

  if (c.education?.length) {
    lines.push("Education:");
    c.education.slice(0, 3).forEach(ed => {
      lines.push(`  • ${ed.degree} in ${ed.fieldOfStudy} — ${ed.institution} (${ed.startYear}–${ed.endYear})`);
    });
  }

  if (c.projects?.length) {
    lines.push("Notable Projects:");
    c.projects.slice(0, 3).forEach(p => {
      lines.push(`  • ${p.name} (${p.role}): ${p.description.slice(0, 150)}`);
      if (p.technologies?.length) lines.push(`    Tech: ${p.technologies.join(", ")}`);
    });
  }

  if (c.certifications?.length) {
    lines.push(`Certifications: ${c.certifications.map(ce => `${ce.name} (${ce.issuer})`).join(", ")}`);
  }

  // Include raw resume text as extra context if structured data is sparse
  const hasStructured = (c.experience?.length || 0) + (c.skills?.length || 0) + (c.projects?.length || 0);
  if (hasStructured < 3 && c.resumeText) {
    lines.push(`CV Extract:\n${c.resumeText.slice(0, 1500)}`);
  }

  return lines.join("\n");
}

/**
 * Generate conversation areas/topics for the AI to explore naturally.
 * These are NOT rigid questions to ask in order — they are themes to weave
 * into a natural, free-flowing conversation.
 */
export async function generateInterviewQuestions(job: IJob, candidate?: CandidateProfile): Promise<string[]> {
  const skills = (job.requiredSkills || []).join(", ") || "not specified";
  const desc = String(job.description || "").slice(0, 1500);
  const candCtx = candidate ? `\n\nCandidate profile:\n${buildCandidateContext(candidate)}` : "";

  const prompt = `You are preparing for a natural, conversational interview for the role of "${job.title}" (${job.department}).

Job description summary:
${desc}

Key skills required: ${skills}${candCtx}

Generate 6–8 conversation TOPICS/AREAS personalised to this candidate's background.
These are NOT formal questions — they are themes to weave naturally into conversation.
Where relevant, reference specific things from the candidate's experience, projects, or skills.

Examples of good topics:
- "Dig into their experience at [Company] — what they built and what they learned"
- "Their hands-on use of [specific skill they listed] and how deep it goes"
- "That project '[Project Name]' — what challenges came up and how they handled it"

Return ONLY a JSON array of topic strings (no markdown fence):
["topic 1", "topic 2", ...]`;

  const raw = await openaiChatText(prompt, { maxRetries: 2 });
  try {
    const parsed = JSON.parse(stripJsonFence(raw));
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);
  } catch { /* fall through */ }

  return [
    "Their background and what drew them to this field",
    "Relevant experience and projects related to this role",
    "How they approach challenges and problem-solving",
    "Collaboration and teamwork experiences",
    `Technical skills relevant to ${job.title}`,
    "Career goals and what excites them about this opportunity",
    "A situation where they had to learn something quickly",
    "What they would bring to the team",
  ];
}

/**
 * Get the AI's next response in a natural, flowing conversation.
 * The AI is a warm, human-like interviewer — not a formal Q&A machine.
 */
export async function getAIResponse(
  job: IJob,
  topics: string[],
  transcript: IInterviewTurn[],
  candidateMessage: string,
  candidate?: CandidateProfile
): Promise<{ message: string; isComplete: boolean }> {

  const topicList = topics.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const historyText = transcript
    .map(t => `${t.speaker === "ai" ? "You" : "Candidate"}: ${t.text}`)
    .join("\n");

  const exchangeCount = transcript.filter(t => t.speaker === "candidate").length;
  const shouldWrapUp = exchangeCount >= topics.length + 1;

  const candCtx = candidate ? `\nCANDIDATE PROFILE (use this to ask specific, informed follow-ups):\n${buildCandidateContext(candidate)}\n` : "";

  const prompt = `You are a warm, natural HR interviewer having a real human conversation with ${candidate?.name || "a candidate"} for the "${job.title}" role.
${candCtx}
IMPORTANT — behave like a real person, NOT a scripted chatbot:
- You already know the candidate's background (see profile above). Use it! Reference specific experiences, projects, or companies they've worked at.
- Ask follow-up questions that show you read their CV — e.g. "I noticed you worked on [X], how did that go?"
- If they mention something vague, ask for clarification based on what you know about their background
- React genuinely — be curious, interested, or surprised when appropriate
- Never say "Great answer!" or hollow praise — be natural and real
- Never list multiple questions at once
- Speak in short, natural sentences — 2–4 sentences maximum
- Don't announce topic changes — transition smoothly

Topics to naturally weave into the conversation (you don't have to cover all of them, not in order):
${topicList}

Conversation so far:
${historyText || "(you just introduced yourself)"}

Candidate just said: "${candidateMessage}"

${shouldWrapUp
  ? `You have had ${exchangeCount} exchanges and covered the main topics. Wrap up warmly — thank ${candidate?.name || "them"} by name, say a brief genuine word about the chat, and let them know the team will be in touch. Set isComplete to true.`
  : `Continue the conversation naturally. React to what they said. If it connects to something in their profile (a project, a role, a skill), dig into that specifically.`
}

Return ONLY valid JSON (no markdown fence):
{
  "message": "<your spoken response — natural, short, human>",
  "isComplete": <true only if you are wrapping up the interview, false otherwise>
}`;

  const raw = await openaiChatText(prompt, { maxRetries: 2 });
  try {
    const parsed = JSON.parse(stripJsonFence(raw));
    return {
      message: String(parsed.message || "That's interesting. Tell me more."),
      isComplete: Boolean(parsed.isComplete),
    };
  } catch {
    return { message: "That's interesting. Tell me more about that.", isComplete: false };
  }
}

/** AI grades the full interview transcript */
export async function gradeInterview(
  job: IJob,
  transcript: IInterviewTurn[],
  candidate?: CandidateProfile
): Promise<IInterviewScore> {
  const candidateTurns = transcript
    .filter(t => t.speaker === "candidate")
    .map(t => t.text)
    .join("\n\n---\n\n");

  if (!candidateTurns.trim()) {
    return {
      confidence: 0, communication: 0, accuracy: 0, attitude: 0, overall: 0,
      feedback: "No candidate responses were recorded.",
      strengths: [], improvements: ["Complete the interview to receive a grade."],
    };
  }

  const candCtx = candidate ? `\nCandidate background:\n${buildCandidateContext(candidate)}\n` : "";

  const prompt = `You are an expert hiring assessor. Evaluate a conversational job interview for the role of "${job.title}" (${job.department}).
${candCtx}
Required skills: ${(job.requiredSkills || []).join(", ")}

Candidate's responses (in conversation order):
${candidateTurns}

Grade the candidate on these 4 dimensions (each 0–100):
1. **Confidence** — Self-assured, clear, decisive. Speaks with conviction without arrogance.
2. **Communication** — Natural, clear, easy to follow. Structures thoughts well in spoken conversation.
3. **Answer Accuracy** — Technical correctness and relevance to the ${job.title} role. Demonstrates real knowledge.
4. **Attitude & Professionalism** — Positivity, enthusiasm, coachability, cultural fit signals.

Scoring:
- 90-100: Exceptional  - 75-89: Strong  - 60-74: Adequate  - 40-59: Weak  - 0-39: Poor

Return ONLY valid JSON (no markdown fence):
{
  "confidence": <0-100>,
  "communication": <0-100>,
  "accuracy": <0-100>,
  "attitude": <0-100>,
  "overall": <weighted: confidence*0.2 + communication*0.25 + accuracy*0.35 + attitude*0.2>,
  "feedback": "<3-4 sentence honest, specific assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>"]
}`;

  const raw = await openaiChatText(prompt, { maxRetries: 2 });
  try {
    const p = JSON.parse(stripJsonFence(raw));
    const clamp = (n: unknown) => Math.min(100, Math.max(0, Number(n) || 0));
    return {
      confidence: clamp(p.confidence),
      communication: clamp(p.communication),
      accuracy: clamp(p.accuracy),
      attitude: clamp(p.attitude),
      overall: clamp(p.overall),
      feedback: String(p.feedback || ""),
      strengths: Array.isArray(p.strengths) ? p.strengths.map(String) : [],
      improvements: Array.isArray(p.improvements) ? p.improvements.map(String) : [],
    };
  } catch {
    return {
      confidence: 0, communication: 0, accuracy: 0, attitude: 0, overall: 0,
      feedback: "Grading failed — please review the transcript manually.",
      strengths: [], improvements: [],
    };
  }
}

/** Opening message — AI-generated, warm, natural, personalised */
export async function buildOpeningMessage(job: IJob, _firstTopic: string, candidate?: CandidateProfile): Promise<string> {
  const candCtx = candidate ? buildCandidateContext(candidate) : "";
  const firstName = candidate?.name ? candidate.name.split(" ")[0] : "";

  const prompt = `You are an HR interviewer about to start a relaxed, natural video conversation with ${firstName || "a candidate"} for the "${job.title}" role at ${job.department || "the company"}.
${candCtx ? `\nCandidate profile:\n${candCtx}\n` : ""}
Write a short, natural, warm opening greeting — the very first thing you say to kick off the interview.

Rules:
- Greet them by first name (${firstName || "use a friendly generic greeting"})
- Sound like a real person, not a script — casual and warm
- Briefly mention the role
- Reference ONE specific detail from their background (a past company, a skill, a project) if available — to show you've actually looked at their profile
- End with an open invitation for them to introduce themselves — but phrase it naturally, not as a formal question
- 2–4 sentences MAXIMUM
- Do NOT say "Great to meet you" or hollow openers
- Return ONLY the spoken text, no quotes, no formatting`;

  try {
    const text = await openaiChatText(prompt, { maxRetries: 2 });
    if (text && text.trim().length > 10) return text.trim();
  } catch { /* fall through to fallback */ }

  // Fallback if AI fails
  const name = firstName ? ` ${firstName}` : "";
  return `Hey${name}, welcome! I'm glad you could make it. We're just going to have a casual chat about your experience for the ${job.title} role — nothing too formal. Go ahead and tell me a bit about yourself.`;
}
