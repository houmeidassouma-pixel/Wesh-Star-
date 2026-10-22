import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { hasPerm } from "@/lib/permissions";
import { newOAuthState } from "@/lib/social-tokens";

// Instagram publishing uses Meta OAuth and requires an Instagram Business or Creator account.
export async function GET() {
  const access = await getAccess();
  if (!(access.isAdmin || (access.isModerator && hasPerm((access.profile as any)?.permissions, "autopilot")))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) return NextResponse.json({ error: "FACEBOOK_APP_ID not set" }, { status: 500 });
  const redirect = (process.env.NEXT_PUBLIC_SITE_URL || "") + "/api/auth/instagram/callback";
  const state = newOAuthState();
  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("scope", "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url.toString());
  res.cookies.set("instagram_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
