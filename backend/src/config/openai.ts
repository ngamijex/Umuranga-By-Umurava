import OpenAI from "openai";
import { sleep } from "./llmBatch";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not defined in environment variables.");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

function isRateLimitError(error: unknown): boolean {
  return (error as { status?: number })?.status === 429;
}

/** OpenAI returns 429 for rate limits; insufficient_quota may not recover with short waits. */
function shouldNotRetryOpenAI(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return msg.includes("insufficient_quota") || msg.includes("billing_hard_limit");
}

/**
 * Chat completion with retries on 429. Default model: gpt-4o-mini (override with OPENAI_MODEL).
 */
export async function openaiChatText(
  prompt: string,
  opts?: { maxRetries?: number }
): Promise<string> {
  const maxRetries = opts?.maxRetries ?? 5;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const openai = getOpenAI();
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 8192,
      });
      return (completion.choices[0]?.message?.content ?? "").trim();
    } catch (e) {
      lastError = e;
      if (!isRateLimitError(e)) throw e;
      if (shouldNotRetryOpenAI(e)) {
        console.error("[OpenAI] Quota / billing limit — not retrying. Check https://platform.openai.com/account/billing");
        throw e;
      }
      if (attempt >= maxRetries) break;
      const waitMs = Math.min(4000 * Math.pow(2, attempt), 120_000);
      console.warn(`[OpenAI] Rate limited (429). Waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${maxRetries}…`);
      await sleep(waitMs);
    }
  }
  throw lastError;
}
