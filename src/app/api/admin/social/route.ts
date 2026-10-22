import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { saveSocialAccount, disconnectSocialAccount, listSocialStatus, type Platform } from "@/lib/social-tokens";

export async function GET() {
  const access = await getAccess();
  if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ status: await listSocialStatus() });
}

// Manual token entry — the only option for Snapchat (no public self-serve
// OAuth; requires an approved Snap partnership) and a fallback for any
// platform if you'd rather paste a token than use the OAuth button.
export async function POST(req: Request) {
  const access = await getAccess();
  if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { platform, access_token, refresh_token, page_id, account_name } = await req.json();
  const valid: Platform[] = ["tiktok", "facebook", "snapchat", "youtube", "instagram", "twitch", "x", "linkedin"];
  if (!valid.includes(platform)) return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  if (!access_token || typeof access_token !== "string") {
    return NextResponse.json({ error: "access_token required" }, { status: 400 });
  }

  await saveSocialAccount(platform, {
    access_token,
    refresh_token: typeof refresh_token === "string" ? refresh_token : null,
    page_id: typeof page_id === "string" ? page_id : null,
    account_name: typeof account_name === "string" ? account_name.slice(0, 80) : null
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const access = await getAccess();
  if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { platform } = await req.json();
  const valid: Platform[] = ["tiktok", "facebook", "snapchat", "youtube", "instagram", "twitch", "x", "linkedin"];
  if (!valid.includes(platform)) return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  await disconnectSocialAccount(platform);
  return NextResponse.json({ ok: true });
}
