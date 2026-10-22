import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAccess } from "@/lib/access";
import { hasPerm } from "@/lib/permissions";
import { saveSocialAccount } from "@/lib/social-tokens";

export async function GET(req: Request) {
  const access = await getAccess();
  if (!(access.isAdmin || (access.isModerator && hasPerm((access.profile as any)?.permissions, "autopilot")))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const err = searchParams.get("error_description") || searchParams.get("error");
  const state = searchParams.get("state");
  const savedState = cookies().get("facebook_oauth_state")?.value;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  if (!state || !savedState || state !== savedState) return NextResponse.redirect(site + "/admin?social_error=facebook_state_invalid");
  if (err) return NextResponse.redirect(site + "/admin?social_error=" + encodeURIComponent(err));
  if (!code) return NextResponse.redirect(site + "/admin?social_error=missing_code");

  try {
    const redirect = site + "/api/auth/facebook/callback";
    // 1) short-lived user token
    const tokenRes = await fetch(
      "https://graph.facebook.com/v19.0/oauth/access_token" +
        "?client_id=" + process.env.FACEBOOK_APP_ID +
        "&client_secret=" + process.env.FACEBOOK_APP_SECRET +
        "&redirect_uri=" + encodeURIComponent(redirect) +
        "&code=" + code
    );
    const tokenData: any = await tokenRes.json();
    if (!tokenData.access_token) throw new Error(JSON.stringify(tokenData));

    // 2) exchange for a long-lived user token (~60 days)
    const longRes = await fetch(
      "https://graph.facebook.com/v19.0/oauth/access_token" +
        "?grant_type=fb_exchange_token" +
        "&client_id=" + process.env.FACEBOOK_APP_ID +
        "&client_secret=" + process.env.FACEBOOK_APP_SECRET +
        "&fb_exchange_token=" + tokenData.access_token
    );
    const longData: any = await longRes.json();
    const userToken = longData.access_token || tokenData.access_token;

    // 3) the Pages the user manages -> Page tokens don't expire while the
    //    user token is valid, which is what we actually want for autopilot
    const pagesRes = await fetch("https://graph.facebook.com/v19.0/me/accounts?access_token=" + userToken);
    const pagesData: any = await pagesRes.json();
    const page = pagesData?.data?.[0];
    if (!page) throw new Error("No Facebook Page found for this account — you need to manage at least one Page.");

    await saveSocialAccount("facebook", {
      access_token: page.access_token,
      account_name: page.name,
      page_id: page.id
    }, access.isModerator ? access.user!.id : undefined);

    const out = NextResponse.redirect(site + (access.isAdmin ? "/admin?social_connected=facebook" : "/moderator?social_connected=facebook"));
    out.cookies.delete("facebook_oauth_state");
    return out;
  } catch (e: any) {
    return NextResponse.redirect(site + "/admin?social_error=" + encodeURIComponent(e.message || "facebook_link_failed"));
  }
}
