import type { CorsOptions } from "cors";

const normalizeOrigin = (o: string) => o.trim().replace(/\/$/, "");

export function corsOptionsFromEnv(): CorsOptions {
  const allowVercelApp =
    process.env.CORS_ALLOW_VERCEL_APP === "true" ||
    process.env.CORS_ALLOW_VERCEL_APP === "1";

  const raw = process.env.FRONTEND_URL;
  const allowedList = raw
    ? raw.split(",").map(normalizeOrigin).filter(Boolean)
    : [normalizeOrigin("http://localhost:3000")];

  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const n = normalizeOrigin(origin);
      if (allowedList.includes(n)) {
        callback(null, true);
        return;
      }
      if (allowVercelApp) {
        try {
          const host = new URL(origin).hostname;
          if (host === "vercel.app" || host.endsWith(".vercel.app")) {
            callback(null, true);
            return;
          }
        } catch {
          /* ignore */
        }
      }
      callback(null, false);
    },
  };
}
