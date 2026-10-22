import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { normalizeAdPreferences, chooseAd } from "@/lib/ads";
import { createAdminClient } from "@/lib/account/admin";

export async function GET(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ ad: null });
  const ads = access.settings.site.ads;
  if (!ads.enabled || Number(ads.frequencyCapPerDay) <= 0) return NextResponse.json({ ad: null });
  if (ads.excludeUnder18) {
    const rawDob = (access.profile as any)?.date_of_birth || (access.profile as any)?.birth_date;
    if (rawDob) { const dob = new Date(rawDob); const now = new Date(); let age = now.getUTCFullYear() - dob.getUTCFullYear(); const m = now.getUTCMonth() - dob.getUTCMonth(); if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--; if (age < 18) return NextResponse.json({ ad: null }); }
  }
  const prefs = normalizeAdPreferences(access.profile?.ad_preferences, ads.personalizedByDefault);
  if (prefs.adsFree) return NextResponse.json({ ad: null });
  if (!ads.allowFreeUsers && access.planKey === "free") return NextResponse.json({ ad: null });
  // Paid subscribers can see ads when enabled; serving an ad never gates generation or token usage.
  if (!ads.showToPaidUsers && access.planKey !== "free") return NextResponse.json({ ad: null });
  const today = new Date(); today.setHours(0,0,0,0);
  const { count: shownToday } = await createAdminClient().from("ad_events").select("id", { count: "exact", head: true }).eq("user_id", access.user.id).eq("event_type", "impression").gte("created_at", today.toISOString());
  if ((shownToday || 0) >= Math.max(1, ads.frequencyCapPerDay)) return NextResponse.json({ ad: null });
  const context = new URL(req.url).searchParams.get("context") || "Wesh Star IA";
  const ad = chooseAd(ads.campaigns, context, prefs.personalized, prefs.hiddenCampaignIds);
  if (!ad) return NextResponse.json({ ad: null });
  return NextResponse.json({ ad: { id: ad.id, advertiser: ad.advertiser, title: ad.title, description: ad.description, landingUrl: ad.landingUrl, imageUrl: ad.imageUrl, label: ads.label } });
}
