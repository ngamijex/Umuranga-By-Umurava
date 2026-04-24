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

function isZeroQuotaForModel(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return msg.includes("quota exceeded") && msg.includes("limit: 0");
}

/**
 * Gemini text generation with retry/backoff for transient limits.
 * Default model: gemini-2.5-flash (override with GEMINI_MODEL).
 */
export async function geminiChatText(
  prompt: string,
  opts?: { maxRetries?: number }
): Promise<string> {
  const maxRetries = opts?.maxRetries ?? 5;
  const rawModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  let modelName = rawModel.startsWith("models/") ? rawModel : `models/${rawModel}`;
  const genAI = getGemini();
  let lastError: unknown;
  let didFallback = false;

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
      // Some keys have a quota of 0 for specific models (often the "free tier" metric).
      // In that case, retrying won't help — fallback to a known-working model once.
      if (!didFallback && isZeroQuotaForModel(e) && modelName !== "models/gemini-2.5-flash") {
        console.warn(`[Gemini] Model quota is 0 for ${modelName}. Falling back to models/gemini-2.5-flash…`);
        modelName = "models/gemini-2.5-flash";
        didFallback = true;
        continue;
      }
      if (!isRateLimitLike(e)) throw e;
      if (attempt >= maxRetries) break;
      const waitMs = Math.min(3000 * Math.pow(2, attempt), 120_000);
      console.warn(`[Gemini] Rate limited. Waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${maxRetries}…`);
      await sleep(waitMs);
    }
  }

  throw lastError;
}

