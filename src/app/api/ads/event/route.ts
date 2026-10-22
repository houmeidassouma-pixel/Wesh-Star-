import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const campaignId = String(body.campaignId || "").slice(0,80);
  const event = ["impression","click","hide","report","about"].includes(body.event) ? body.event : "impression";
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  const { error } = await createAdminClient().from("ad_events").insert({ campaign_id: campaignId, user_id: access.user.id, event_type: event });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
