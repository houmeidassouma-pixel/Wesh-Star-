import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";
import { createAuthToken } from "@/lib/auth/tokens";
import { sendMail } from "@/lib/auth/mailer";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!rateLimit("forgot:" + clientKey(req), 10, 60_000)) {
    return NextResponse.json({ error: { message: "Too many attempts, try again shortly." } }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const redirectTo = String(body.redirectTo || (process.env.NEXT_PUBLIC_SITE_URL || "") + "/reset");

  const { rows } = await getPool().query("select id from public.auth_users where email = $1", [email]);
  // Always respond the same way — never reveal whether the address exists.
  if (rows[0]) {
    const token = await createAuthToken(rows[0].id, "reset");
    const link = redirectTo + (redirectTo.includes("?") ? "&" : "?") + "token=" + token;
    await sendMail(email, "Wesh Star IA — Passwort zurücksetzen",
      `<p>Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen (gültig 1 Stunde):</p><p><a href="${link}">${link}</a></p>`);
  }
  return NextResponse.json({ error: null });
}
