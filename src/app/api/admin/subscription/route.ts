import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { tierFromPaymentTier } from "@/lib/tiers";
import { getSettings } from "@/lib/settings";

export async function POST(req: Request) {
  const access = await getAccess();
  if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("admin:" + clientKey(req, access.user!.id), 60, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  const { userId, status, tier } = await req.json();
  if (!userId || !["active", "inactive"].includes(status)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const update: any = { subscription_status: status };
  const settings = await getSettings();
  const validTier = tierFromPaymentTier(tier);
  const dynamicTier = settings.plans.monthlyTiers.find((x) => x.id === String(tier) && x.enabled !== false);
  if (validTier) update.subscription_tier = validTier;
  else if (dynamicTier) update.subscription_tier = dynamicTier.id;
  else if (status === "active") return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 });
  await createAdminClient().from("profiles").update(update).eq("id", userId);
  return NextResponse.json({ ok: true });
}
