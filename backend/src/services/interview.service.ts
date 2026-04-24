import { geminiChatText } from "../config/gemini";
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

  const raw = await geminiChatText(prompt, { maxRetries: 2 });
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
 * The AI balances brief follow-ups with moving through role-relevant topics.
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
  const shouldWrapUp = exchangeCount >= topics.length + 2;

  const candCtx = candidate ? `\nCANDIDATE PROFILE:\n${buildCandidateContext(candidate)}\n` : "";

  const prompt = `You are a warm, professional HR interviewer having a real conversation with ${candidate?.name || "a candidate"} for the "${job.title}" role (${job.department || "company"}).
${candCtx}
YOUR CONVERSATION STRATEGY — follow this pattern for EVERY turn:
1. ACKNOWLEDGE (1 sentence max): Briefly react to what the candidate just said — show you listened. Be genuine, not hollow. No "Great answer!" praise.
2. TRANSITION + NEW QUESTION: After acknowledging, smoothly move to a NEW topic from the uncovered list below. Ask ONE clear, specific question about the role, their skills, or a scenario relevant to "${job.title}".

CRITICAL RULES:
- You MUST ask a new question every turn — do NOT just follow up endlessly on the same thread
- Cover as many different topics as possible across the interview — breadth matters
- Mix question styles: some about their background, some technical/role-specific, some situational ("How would you handle…"), some about motivations and goals
- If their profile mentions specific companies, projects, or skills, reference those when transitioning to a new topic — this shows you've read their CV
- Never list multiple questions at once — ask exactly ONE question per turn
- Speak in 2–3 sentences total (1 acknowledgment + 1–2 sentence question)
- Don't announce topic changes — transition naturally

TOPICS TO COVER (prioritize ones NOT yet discussed — you have ${topics.length} topics and ${exchangeCount} exchanges so far):
${topicList}

Conversation so far:
${historyText || "(you just introduced yourself)"}

Candidate just said: "${candidateMessage}"

${shouldWrapUp
  ? `You have had ${exchangeCount} exchanges and covered enough topics. Wrap up warmly — thank ${candidate?.name || "them"} by name, say a brief genuine word about the conversation, and let them know the team will be in touch. Set isComplete to true.`
  : `Pick a topic from the list that has NOT been discussed yet and ask a clear, specific question about it. Remember: 1 sentence acknowledgment + 1 new question.`
}

Return ONLY valid JSON (no markdown fence):
{
  "message": "<your spoken response — 2-3 sentences: brief acknowledgment + new question>",
  "isComplete": <true only if wrapping up, false otherwise>
}`;

  // Keep tokens tight — response is only 2-3 sentences, so 300 tokens is plenty.
  // This significantly reduces Gemini response latency.
  const raw = await geminiChatText(prompt, { maxRetries: 2, maxOutputTokens: 300, temperature: 0.4 });
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

  const raw = await geminiChatText(prompt, { maxRetries: 2 });
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

  const prompt = `You are a friendly HR interviewer starting a relaxed video conversation with ${firstName || "a candidate"} for the "${job.title}" role at ${job.department || "the company"}.
${candCtx ? `\nHere is what you know about the candidate:\n${candCtx}\n` : ""}
Generate the very first thing you would naturally say to open this interview — as if you just connected on a video call.

Requirements:
- Use their first name "${firstName || "there"}" naturally in the greeting
- Be genuinely warm and unique — every interview opening should feel different, NOT like a template
- Mention the role title naturally
- If you have profile info, reference ONE specific thing from their background (e.g. "I saw you worked at [company]" or "Your experience with [skill] caught our eye") — this makes it feel personal
- Invite them to start talking — e.g. ask them to share a bit about themselves, or what they've been up to, or what got them interested in the role
- Keep it to 2–3 short, spoken sentences — this will be read aloud
- Sound like a real human on a video call, not a script or a chatbot
- Do NOT start with clichés like "Thank you for joining" or "Great to meet you"
- Return ONLY the spoken text — no quotes, no formatting, no JSON`;

  try {
    const text = await geminiChatText(prompt, { maxRetries: 2, maxOutputTokens: 200, temperature: 0.6 });
    if (text && text.trim().length > 10) {
      console.log("[interview] AI opening message generated successfully");
      return text.trim();
    }
    console.warn("[interview] AI opening message was empty or too short, using fallback");
  } catch (err: any) {
    console.error("[interview] AI opening message failed:", err?.message || err);
  }

  // Fallback if AI fails
  const name = firstName ? ` ${firstName}` : "";
  return `Hey${name}, welcome! I'm glad you could make it. We're just going to have a casual chat about your experience for the ${job.title} role — nothing too formal. Go ahead and tell me a bit about yourself.`;
}
