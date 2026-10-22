import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { hasPerm } from "@/lib/permissions";
import { newOAuthState } from "@/lib/social-tokens";

// Requires a TikTok developer app (developers.tiktok.com) with the
// "video.publish" scope APPROVED for your app — TikTok reviews this before
// unattended posting is allowed. Nothing here can skip that review; this
// route just becomes usable the moment TikTok approves your app.
export async function GET() {
  const access = await getAccess();
  if (!(access.isAdmin || (access.isModerator && hasPerm((access.profile as any)?.permissions, "autopilot")))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const key = process.env.TIKTOK_CLIENT_KEY;
  if (!key) return NextResponse.json({ error: "TIKTOK_CLIENT_KEY not set" }, { status: 500 });

  const redirect = (process.env.NEXT_PUBLIC_SITE_URL || "") + "/api/auth/tiktok/callback";
  const state = newOAuthState();
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", key);
  url.searchParams.set("scope", "video.publish,user.info.basic");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url.toString());
  res.cookies.set("tiktok_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
