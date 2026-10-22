import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { saveSettings, getSettings } from "@/lib/settings";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const access = await getAccess();
  if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("admin:" + clientKey(req, access.user!.id), 60, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  const { site, video } = await req.json();
  const current = await getSettings();
  const merged = await saveSettings({
    plans: current.plans,
    video: { ...current.video, ...(video || {}) },
    site: { ...current.site, ...(site || {}) }
  });
  return NextResponse.json({ ok: true, site: merged.site, video: merged.video });
}
