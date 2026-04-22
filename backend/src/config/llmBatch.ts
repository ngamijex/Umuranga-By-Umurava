export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Pause between bulk/pipeline LLM calls (ms). Supports legacy GEMINI_MS_BETWEEN_CANDIDATES. */
export function getMsBetweenCandidates(): number {
  const raw = process.env.LLM_MS_BETWEEN_CANDIDATES || process.env.GEMINI_MS_BETWEEN_CANDIDATES || "0";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
