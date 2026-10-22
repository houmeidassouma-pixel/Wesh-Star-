import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";

export async function GET() {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ preferences: access.profile?.ad_preferences || { personalized: access.settings.site.ads.personalizedByDefault, adsFree: false, hiddenCampaignIds: [] } });
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const current = access.profile?.ad_preferences || {};
  const next = {
    personalized: body.personalized !== false,
    adsFree: body.adsFree === true,
    hiddenCampaignIds: Array.isArray(body.hiddenCampaignIds) ? body.hiddenCampaignIds.map(String).slice(0,100) : (current.hiddenCampaignIds || [])
  };
  const { error } = await createAdminClient().from("profiles").update({ ad_preferences: next }).eq("id", access.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, preferences: next });
}
