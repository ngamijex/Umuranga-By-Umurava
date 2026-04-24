import { GoogleGenerativeAI } from "@google/generative-ai";
import { sleep } from "./llmBatch";

let client: GoogleGenerativeAI | null = null;

function getGemini(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not defined in environment variables.");
  if (!client) client = new GoogleGenerativeAI(key);
  return client;
}

function isRateLimitLike(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return msg.includes("429") || msg.includes("rate") || msg.includes("quota") || msg.includes("resource has been exhausted");
}

/**
 * Gemini text generation with retry/backoff for transient limits.
 * Default model: gemini-1.5-flash (override with GEMINI_MODEL).
 */
export async function geminiChatText(
  prompt: string,
  opts?: { maxRetries?: number }
): Promise<string> {
  const maxRetries = opts?.maxRetries ?? 5;
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const genAI = getGemini();
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return (text ?? "").trim();
    } catch (e) {
      lastError = e;
      if (!isRateLimitLike(e)) throw e;
      if (attempt >= maxRetries) break;
      const waitMs = Math.min(3000 * Math.pow(2, attempt), 120_000);
      console.warn(`[Gemini] Rate limited. Waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${maxRetries}…`);
      await sleep(waitMs);
    }
  }

  throw lastError;
}

