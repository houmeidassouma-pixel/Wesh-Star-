import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Fail-closed: if CRON_SECRET is missing/too short, every call is refused
 * (previously an unset CRON_SECRET left /api/worker/* open to anyone).
 */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (secret.length < 16) return false;
  const bearer = req.headers.get("authorization") || "";
  const header = req.headers.get("x-cron-secret") || "";
  return safeEqual(bearer, "Bearer " + secret) || safeEqual(header, secret);
}
