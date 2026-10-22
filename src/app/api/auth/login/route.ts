import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";
import { verifyPassword } from "@/lib/auth/password";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!rateLimit("login:" + clientKey(req), 20, 60_000)) {
    return NextResponse.json({ error: { message: "Too many attempts, try again shortly." } }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  const { rows } = await getPool().query(
    "select a.id, a.email, a.password_hash, p.blocked from public.auth_users a left join public.profiles p on p.id=a.id where a.email = $1", [email]
  );
  const row = rows[0];
  // Constant response shape whether the email exists or not (no enumeration).
  if (!row || !row.password_hash || row.blocked || !(await verifyPassword(password, row.password_hash))) {
    return NextResponse.json({ error: { message: "Invalid email or password" } }, { status: 400 });
  }

  const token = await signSession({ uid: row.id, email: row.email });
  const res = NextResponse.json({ data: { user: { id: row.id, email: row.email } }, error: null });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
