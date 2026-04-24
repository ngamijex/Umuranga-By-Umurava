export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Pause between bulk/pipeline LLM calls (ms). Supports legacy GEMINI_MS_BETWEEN_CANDIDATES. */
export function getMsBetweenCandidates(): number {
  const raw = process.env.LLM_MS_BETWEEN_CANDIDATES || process.env.GEMINI_MS_BETWEEN_CANDIDATES || "0";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Concurrent workers to use for pipeline screening.
 * Free Gemini tier: 15 RPM → use 5-8.
 * Paid Gemini tier: 2000 RPM → use 20-30.
 * Override with LLM_CONCURRENCY env var.
 */
export function getLlmConcurrency(defaultVal = 10): number {
  const raw = process.env.LLM_CONCURRENCY || String(defaultVal);
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : defaultVal;
}
