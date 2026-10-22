// One-time tokens for "forgot password" and moderator invitations.
// The raw token is emailed once and never stored; only its SHA-256 hash
// lives in the database, so a database leak alone cannot be used to take
// over an account.
import { randomBytes, createHash } from "crypto";
import { getPool } from "@/lib/db/pool";

const TOKEN_TTL_S = 3600; // 1 hour

export function newRawToken(): string {
  return randomBytes(32).toString("hex");
}
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAuthToken(userId: string, purpose: "reset" | "invite"): Promise<string> {
  const raw = newRawToken();
  await getPool().query(
    `insert into public.password_reset_tokens (user_id, token_hash, purpose, expires_at)
     values ($1,$2,$3, now() + make_interval(secs => $4))`,
    [userId, hashToken(raw), purpose, TOKEN_TTL_S]
  );
  return raw;
}

export async function consumeAuthToken(raw: string): Promise<{ userId: string; purpose: string } | null> {
  const r = await getPool().query(
    `update public.password_reset_tokens
       set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now()
     returning user_id, purpose`,
    [hashToken(raw)]
  );
  if (!r.rows.length) return null;
  return { userId: r.rows[0].user_id, purpose: r.rows[0].purpose };
}
