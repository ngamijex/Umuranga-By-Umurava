import { openaiChatText } from "../config/openai";
import type { IJob } from "../models/Job.model";
import type { IInterviewTurn, IInterviewScore } from "../models/InterviewSession.model";

function stripJsonFence(s: string): string {
  const t = s.trim();
  return t.startsWith("```") ? t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim() : t;
}

/**
 * Generate conversation areas/topics for the AI to explore naturally.
 * These are NOT rigid questions to ask in order — they are themes to weave
 * into a natural, free-flowing conversation.
 */
export async function generateInterviewQuestions(job: IJob): Promise<string[]> {
  const skills = (job.requiredSkills || []).join(", ") || "not specified";
  const desc = String(job.description || "").slice(0, 2000);

  const prompt = `You are preparing for a natural, conversational interview for the role of "${job.title}" (${job.department}).

Job description summary:
${desc}

Key skills: ${skills}

Generate 6–8 conversation TOPICS/AREAS to explore naturally in a flowing discussion.
These are NOT formal questions — they are themes the interviewer should weave into conversation, like a real human interviewer would.
Each topic should be broad enough to allow natural follow-up.

Examples of good topics:
- "Their background and journey into this field"
- "How they handle pressure and unexpected problems"
- "Their experience with [specific skill from the role]"

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
  candidateMessage: string
): Promise<{ message: string; isComplete: boolean }> {

  const topicList = topics.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const historyText = transcript
    .map(t => `${t.speaker === "ai" ? "You" : "Candidate"}: ${t.text}`)
    .join("\n");

  const exchangeCount = transcript.filter(t => t.speaker === "candidate").length;
  const shouldWrapUp = exchangeCount >= topics.length + 1;

  const prompt = `You are a warm, natural HR interviewer having a real human conversation with a candidate for the "${job.title}" role.

IMPORTANT — you must behave like a real person talking, NOT like a chatbot reading from a script:
- React genuinely to what they just said (be curious, interested, surprised when appropriate)
- Ask follow-up questions if something they said is interesting or unclear
- Transition smoothly between topics — don't announce "Next question:"
- Speak in short, natural sentences — like how people actually talk
- Never say "Great answer!", "Excellent!", or hollow praise — be genuine
- Never list multiple questions at once — ask one thing and wait
- Keep your response to 2–4 sentences maximum

Topics to naturally weave into the conversation (you don't have to cover all of them, and not in order):
${topicList}

Conversation so far:
${historyText || "(you just introduced yourself)"}

Candidate just said: "${candidateMessage}"

${shouldWrapUp
  ? `You have had ${exchangeCount} exchanges and covered the main topics. Wrap up warmly and naturally — thank them, say a brief kind word, and let them know the team will be in touch. Set isComplete to true.`
  : `Continue the conversation naturally. React to what they said, then guide to a new area if the current topic is exhausted. Keep it flowing.`
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
  transcript: IInterviewTurn[]
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

  const prompt = `You are an expert hiring assessor. Evaluate a conversational job interview for the role of "${job.title}" (${job.department}).

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

/** Opening message — warm, natural, conversational */
export function buildOpeningMessage(job: IJob, _firstTopic: string): string {
  return `Hi there! Thanks for joining. I'm your interviewer today. We're just going to have a relaxed chat about your background and experience for the ${job.title} role. Nothing too formal — just talk naturally. So, to kick things off, why don't you tell me a little about yourself?`;
}
