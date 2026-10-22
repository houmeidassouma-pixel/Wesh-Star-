import { NextResponse } from "next/server";
import { getPool, withTransaction } from "@/lib/db/pool";
import { hashPassword } from "@/lib/auth/password";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { getSettings } from "@/lib/settings";

export async function POST(req: Request) {
  if (!rateLimit("signup:" + clientKey(req), 10, 60_000)) {
    return NextResponse.json({ error: { message: "Too many attempts, try again shortly." } }, { status: 429 });
  }
  const settings = await getSettings();
  if (settings.site.allowUserAccounts === false) return NextResponse.json({ error: { message: "New user accounts are currently disabled." } }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: { message: "Invalid email" } }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: { message: "Password must be at least 6 characters" } }, { status: 400 });

  const { rows: existing } = await getPool().query("select id from public.auth_users where email = $1", [email]);
  if (existing.length) return NextResponse.json({ error: { message: "An account with this email already exists" } }, { status: 400 });

  const passwordHash = await hashPassword(password);
  const user = await withTransaction(async (client) => {
    const u = await client.query(
      "insert into public.auth_users (email, password_hash, email_verified) values ($1,$2,true) returning id, email",
      [email, passwordHash]
    );
    const baseName = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "membre";
    const username = `${baseName}_${String(u.rows[0].id).slice(0, 6)}`;
    await client.query("insert into public.profiles (id, email, username) values ($1,$2,$3)", [u.rows[0].id, email, username]);
    return u.rows[0];
  });

  const token = await signSession({ uid: user.id, email: user.email });
  const res = NextResponse.json({ data: { user: { id: user.id, email: user.email } }, error: null });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
