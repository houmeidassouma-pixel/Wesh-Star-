import { NextResponse } from "next/server";
import { newOAuthState } from "@/lib/social-tokens";
import { getAccess } from "@/lib/access";
import { hasPerm } from "@/lib/permissions";

// Requires a Meta app (developers.facebook.com) with "pages_manage_posts",
// "pages_read_engagement" and a valid OAuth redirect URI pointing to
// NEXT_PUBLIC_SITE_URL + /api/auth/facebook/callback (must match exactly
// what you register in the Meta App dashboard).
export async function GET() {
  const access = await getAccess();
  if (!(access.isAdmin || (access.isModerator && hasPerm((access.profile as any)?.permissions, "autopilot")))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) return NextResponse.json({ error: "FACEBOOK_APP_ID not set" }, { status: 500 });

  const redirect = (process.env.NEXT_PUBLIC_SITE_URL || "") + "/api/auth/facebook/callback";
  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("scope", "pages_manage_posts,pages_read_engagement,pages_show_list");
  const state = newOAuthState();
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url.toString());
  res.cookies.set("facebook_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
