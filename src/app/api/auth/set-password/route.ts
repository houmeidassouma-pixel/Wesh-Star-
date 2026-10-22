import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";
import { hashPassword } from "@/lib/auth/password";
import { consumeAuthToken } from "@/lib/auth/tokens";
import { verifySession } from "@/lib/auth/session";
import { rateLimit, clientKey } from "@/lib/ratelimit";

// Handles BOTH flows the old Supabase `auth.updateUser({password})` call
// covered: (1) a logged-in user changing their own password (session
// cookie, no token), and (2) completing a "forgot password" / moderator
// invite link (one-time token, no session needed yet).
export async function POST(req: Request) {
  if (!rateLimit("setpw:" + clientKey(req), 20, 60_000)) {
    return NextResponse.json({ error: { message: "Too many attempts, try again shortly." } }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  if (password.length < 6) return NextResponse.json({ error: { message: "Password must be at least 6 characters" } }, { status: 400 });

  let userId: string | null = null;
  if (body.token) {
    const consumed = await consumeAuthToken(String(body.token));
    if (!consumed) return NextResponse.json({ error: { message: "This link is invalid or has expired." } }, { status: 400 });
    userId = consumed.userId;
  } else {
    const session = await verifySession(req.headers.get("cookie")?.match(/ws_session=([^;]+)/)?.[1]);
    if (!session) return NextResponse.json({ error: { message: "Authentication required" } }, { status: 401 });
    userId = session.uid;
  }

  const passwordHash = await hashPassword(password);
  await getPool().query(
    "update public.auth_users set password_hash = $1, email_verified = true where id = $2",
    [passwordHash, userId]
  );
  return NextResponse.json({ error: null });
}
