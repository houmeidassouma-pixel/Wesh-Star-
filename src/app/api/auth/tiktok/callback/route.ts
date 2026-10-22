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
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const state = searchParams.get("state");
  const savedState = cookies().get("tiktok_oauth_state")?.value;
  if (!state || !savedState || state !== savedState) return NextResponse.redirect(site + "/admin?social_error=tiktok_state_invalid");
  if (!code) return NextResponse.redirect(site + "/admin?social_error=missing_code");

  try {
    const redirect = site + "/api/auth/tiktok/callback";
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || "",
        client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirect
      })
    });
    const data: any = await res.json();
    if (!data.access_token) throw new Error(JSON.stringify(data));

    // account display name, for the admin panel only
    let name = "TikTok account";
    try {
      const info = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=display_name",
        { headers: { Authorization: "Bearer " + data.access_token } }
      );
      const infoData: any = await info.json();
      name = infoData?.data?.user?.display_name || name;
    } catch { /* non-fatal, keep default label */ }

    await saveSocialAccount("tiktok", {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      account_name: name
    }, access.isModerator ? access.user!.id : undefined);

    const out = NextResponse.redirect(site + (access.isAdmin ? "/admin?social_connected=tiktok" : "/moderator?social_connected=tiktok"));
    out.cookies.delete("tiktok_oauth_state");
    return out;
  } catch (e: any) {
    return NextResponse.redirect(site + "/admin?social_error=" + encodeURIComponent(e.message || "tiktok_link_failed"));
  }
}
