// Lightweight in-memory rate limiter for API routes.
// On serverless each instance has its own window, which still effectively
// slows down abuse. For strict global limits, put a reverse proxy
// (Cloudflare, Vercel Firewall) in front.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const nowTs = Date.now();
  const arr = (hits.get(key) || []).filter((t) => nowTs - t < windowMs);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return false;
  }
  arr.push(nowTs);
  hits.set(key, arr);

  // crude periodic cleanup to bound memory
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      const fresh = v.filter((t) => nowTs - t < windowMs);
      if (fresh.length === 0) hits.delete(k);
      else hits.set(k, fresh);
    }
  }
  return true;
}

// Best-effort client key: user id (when logged in) + forwarded IP.
export function clientKey(req: Request, userId?: string): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "local";
  return (userId ? userId + ":" : "") + ip;
}
