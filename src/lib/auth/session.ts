// Stateless signed session cookie. Uses the Web Crypto API only, so this
// file works both in Next.js middleware (Edge runtime) and in ordinary
// Node.js API routes — no database round-trip needed to verify a session.

export const SESSION_COOKIE = "ws_session";
const SESSION_MAX_AGE_S = 30 * 24 * 3600; // 30 days

export type SessionPayload = { uid: string; email: string; exp: number };

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET is not configured (set a long random value)");
  if (process.env.NODE_ENV === "production" && /^change-me|^replace-with/i.test(secret)) throw new Error("SESSION_SECRET still has its placeholder value — generate a real one (openssl rand -hex 32)");
  return crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}

export async function signSession(payload: Omit<SessionPayload, "exp">, maxAgeS = SESSION_MAX_AGE_S): Promise<string> {
  const full: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeS };
  const body = b64url(new TextEncoder().encode(JSON.stringify(full)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(body));
  return body + "." + b64url(new Uint8Array(sig));
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(), b64urlToBytes(sig), new TextEncoder().encode(body));
    if (!ok) return null;
    const payload: SessionPayload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_S
};
