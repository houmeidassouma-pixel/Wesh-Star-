import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAccess } from "@/lib/access";
import { hasPerm } from "@/lib/permissions";
import { saveSocialAccount } from "@/lib/social-tokens";

export async function GET(req: Request) {
  const access = await getAccess();
  if (!(access.isAdmin || (access.isModerator && hasPerm((access.profile as any)?.permissions, "autopilot")))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const saved = cookies().get("instagram_oauth_state")?.value;
  if (!state || !saved || state !== saved) return NextResponse.redirect(site + "/admin?social_error=instagram_state_invalid");
  if (!code) return NextResponse.redirect(site + "/admin?social_error=instagram_missing_code");
  try {
    const redirect = site + "/api/auth/instagram/callback";
    const tokenRes = await fetch("https://graph.facebook.com/v19.0/oauth/access_token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: process.env.FACEBOOK_APP_ID || "", client_secret: process.env.FACEBOOK_APP_SECRET || "", redirect_uri: redirect, code })
    });
    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) throw new Error(JSON.stringify(tokenData));
    const pages = await fetch("https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=" + encodeURIComponent(tokenData.access_token));
    const pagesData: any = await pages.json();
    const page = (pagesData?.data || []).find((x: any) => x?.instagram_business_account?.id);
    if (!page) throw new Error("No Instagram Business/Creator account linked to a managed Facebook Page.");
    await saveSocialAccount("instagram", { access_token: page.access_token || tokenData.access_token, account_name: page.name || "Instagram account", page_id: page.instagram_business_account.id }, access.isModerator ? access.user!.id : undefined);
    const out = NextResponse.redirect(site + (access.isAdmin ? "/admin?social_connected=instagram" : "/moderator?social_connected=instagram"));
    out.cookies.delete("instagram_oauth_state");
    return out;
  } catch (e: any) {
    return NextResponse.redirect(site + "/admin?social_error=" + encodeURIComponent(e.message || "instagram_link_failed"));
  }
}
