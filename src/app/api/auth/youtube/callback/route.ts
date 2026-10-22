import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAccess } from "@/lib/access";
import { hasPerm } from "@/lib/permissions";
import { saveSocialAccount } from "@/lib/social-tokens";

export async function GET(req: Request) {
  const access = await getAccess();
  if (!(access.isAdmin || (access.isModerator && hasPerm((access.profile as any)?.permissions, "autopilot")))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const u = new URL(req.url);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const saved = cookies().get("youtube_oauth_state")?.value;
  if (!state || !saved || state !== saved) return NextResponse.redirect(site + "/admin?social_error=youtube_state_invalid");
  if (!code) return NextResponse.redirect(site + "/admin?social_error=youtube_missing_code");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        code, grant_type: "authorization_code",
        redirect_uri: site + "/api/auth/youtube/callback"
      })
    });
    const data: any = await tokenRes.json();
    if (!tokenRes.ok || !data.access_token) throw new Error(JSON.stringify(data));

    let name = "YouTube account";
    try {
      const ch = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
        headers: { Authorization: "Bearer " + data.access_token }
      });
      const cd: any = await ch.json();
      name = cd?.items?.[0]?.snippet?.title || name;
    } catch {}

    await saveSocialAccount("youtube", {
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      account_name: name
    }, access.isModerator ? access.user!.id : undefined);
    const res = NextResponse.redirect(site + (access.isAdmin ? "/admin?social_connected=youtube" : "/moderator?social_connected=youtube"));
    res.cookies.delete("youtube_oauth_state");
    return res;
  } catch (e: any) {
    return NextResponse.redirect(site + "/admin?social_error=" + encodeURIComponent(e.message || "youtube_link_failed"));
  }
}
