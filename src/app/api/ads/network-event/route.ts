import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { networkAdsConfigured } from "@/lib/ads";

// Counts a viewable impression of an external-network ad block (AdSense / custom),
// for anonymous visitors too. Stored in ad_events with campaign_id "network:<network>:<placement>".
export async function POST(req: Request) {
  const access = await getAccess();
  const ads = access.settings.site.ads;
  if (!networkAdsConfigured(ads)) return NextResponse.json({ ok: false });
  if (!rateLimit("adnet:" + clientKey(req, access.user?.id), 30, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const placement = String(body.placement || "page").replace(/[^a-z0-9_-]/gi, "").slice(0, 30) || "page";
  const { error } = await createAdminClient().from("ad_events").insert({
    campaign_id: `network:${ads.network}:${placement}`,
    user_id: access.user?.id ?? null,
    event_type: "impression"
  });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
