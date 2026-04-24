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
  return (
    msg.includes("429") ||
    msg.includes("rate") ||
    msg.includes("quota") ||
    msg.includes("resource has been exhausted") ||
    msg.includes("503") ||
    msg.includes("service unavailable") ||
    msg.includes("high demand") ||
    msg.includes("unavailable")
  );
}

function isZeroQuotaForModel(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return msg.includes("quota exceeded") && msg.includes("limit: 0");
}

function isServiceUnavailable(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return msg.includes("503") || msg.includes("service unavailable") || msg.includes("high demand");
}

/** 404 = model retired/unavailable for this account — immediately fall back, never retry. */
function isModelUnavailable(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    (msg.includes("404") || msg.includes("not found")) &&
    (msg.includes("no longer available") || msg.includes("model") || msg.includes("deprecated"))
  );
}

function parseRetryAfterMs(error: unknown): number | null {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const m = msg.match(/retry in\s+(\d+(?:\.\d+)?)s/);
  if (!m) return null;
  const secs = Number(m[1]);
  if (!Number.isFinite(secs) || secs <= 0) return null;
  return Math.ceil(secs * 1000);
}

/**
 * Build model candidate list from an env var name (primary) + fallbacks.
 * Batch/pipeline ops use GEMINI_BATCH_MODEL (default: gemini-2.0-flash-lite) which is
 * fast and available on free tier. Quality ops use GEMINI_MODEL (gemini-2.5-flash).
 */
function getModelCandidates(primaryEnvVar = "GEMINI_MODEL"): string[] {
  const raw = process.env[primaryEnvVar] || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const primary = raw.startsWith("models/") ? raw : `models/${raw}`;
  const fallbacksRaw = process.env.GEMINI_FALLBACK_MODELS;
  const fallbacks = fallbacksRaw
    ? fallbacksRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((m) => (m.startsWith("models/") ? m : `models/${m}`))
    : [
        "models/gemini-2.5-pro",          // fallback when gemini-2.5-flash is under demand
      ];

  return [primary, ...fallbacks.filter((m) => m !== primary)];
}

/**
 * Gemini text generation with retry/backoff for transient limits.
 * Default model: GEMINI_MODEL (or GEMINI_BATCH_MODEL when batch:true).
 *
 * jsonMode:true → sets responseMimeType:"application/json" which forces Gemini to always
 * produce valid, complete JSON (no truncation mid-structure, no markdown fences, no prose).
 * Always use this when you intend to JSON.parse the response.
 */
export async function geminiChatText(
  prompt: string,
  opts?: { maxRetries?: number; maxOutputTokens?: number; temperature?: number; batch?: boolean; jsonMode?: boolean }
): Promise<string> {
  const maxRetries = opts?.maxRetries ?? 5;
  // batch:true → use GEMINI_BATCH_MODEL (fast, non-thinking) for bulk pipeline ops
  const primaryEnv = opts?.batch ? "GEMINI_BATCH_MODEL" : "GEMINI_MODEL";
  const modelCandidates = getModelCandidates(primaryEnv);
  let modelName = modelCandidates[0];
  const genAI = getGemini();
  let lastError: unknown;
  let didFallback = false;
  let candidateIdx = 0;
  const perModelServiceUnavailableAttempts = 2;
  let serviceUnavailableAttemptsOnThisModel = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: opts?.temperature ?? 0.2,
          maxOutputTokens: opts?.maxOutputTokens ?? 8192,
          // Force valid JSON output — eliminates all "Expected ',' or '}'" parse errors
          ...(opts?.jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return (text ?? "").trim();
    } catch (e) {
      lastError = e;

      // 404 = model is retired/unavailable — immediately switch to next fallback, never wait/retry.
      if (isModelUnavailable(e)) {
        const next = modelCandidates.slice(candidateIdx + 1).find(Boolean);
        if (next) {
          candidateIdx++;
          modelName = next;
          serviceUnavailableAttemptsOnThisModel = 0;
          console.warn(`[Gemini] Model ${modelCandidates[candidateIdx - 1]} unavailable (404). Switching immediately to ${modelName}…`);
          continue;
        }
        // No more fallbacks — fail fast.
        throw e;
      }

      // Some keys have a quota of 0 for specific models (often the "free tier" metric).
      // In that case, retrying won't help — fallback to a known-working model once.
      if (!didFallback && isZeroQuotaForModel(e) && modelName !== "models/gemini-2.5-flash") {
        console.warn(`[Gemini] Model quota is 0 for ${modelName}. Falling back to models/gemini-2.5-flash…`);
        modelName = "models/gemini-2.5-flash";
        didFallback = true;
        continue;
      }

      // If the model is under high demand (503), try switching models after a couple of attempts.
      if (isServiceUnavailable(e)) {
        serviceUnavailableAttemptsOnThisModel++;
        if (serviceUnavailableAttemptsOnThisModel >= perModelServiceUnavailableAttempts) {
          const next = modelCandidates.slice(candidateIdx + 1).find(Boolean);
          if (next) {
            candidateIdx++;
            modelName = next;
            serviceUnavailableAttemptsOnThisModel = 0;
            console.warn(`[Gemini] ${modelCandidates[candidateIdx - 1]} is under high demand. Switching to ${modelName}…`);
            continue;
          }
        }
      }

      if (!isRateLimitLike(e)) throw e;
      if (attempt >= maxRetries) break;
      const hinted = parseRetryAfterMs(e);
      const base = hinted ?? Math.min(3000 * Math.pow(2, attempt), 120_000);
      const jitter = Math.floor(Math.random() * 750);
      const waitMs = Math.min(base + jitter, 180_000);
      console.warn(`[Gemini] Temporary limit/unavailable. Waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${maxRetries}…`);
      await sleep(waitMs);
    }
  }

  throw lastError;
}

