import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/account/admin";
import { createClient } from "@/lib/account/server";
import { getSettings } from "@/lib/settings";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { tierFromPaymentTier } from "@/lib/tiers";

function ref() { return "WS-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase(); }

export async function POST(req: Request) {
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!rateLimit("payment:" + clientKey(req, user.id), 10, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json();
  const settings = await getSettings();
  let tier: string | null = null;
  let hours: number | null = null;
  let minutes: number | null = null;
  let amount = 0;
  if (body.kind === "subscription") {
    return NextResponse.json({ error: "USE_STRIPE_CHECKOUT", message: "Les abonnements mensuels utilisent désormais le paiement Stripe récurrent." }, { status: 400 });
  } else if (body.kind === "hours" || body.kind === "minutes") {
    // `minutes` is the current customer-pack API. `hours` remains accepted only for legacy callers.
    // Store the legacy `hours` column in real hours so the existing fulfillment path credits the correct seconds.
    if (body.kind === "minutes") {
      minutes = Math.max(1, Math.min(10080, Math.floor(Number(body.minutes))));
      hours = minutes / 60;
    } else {
      hours = Math.max(1, Math.min(60, Math.floor(Number(body.hours))));
      minutes = hours * 60;
    }
    const found = (settings.plans.hourTiers || []).find(x => x.hours === minutes && x.enabled !== false);
    if (!found) return NextResponse.json({ error: "Minute package unavailable" }, { status: 400 });
    amount = found.price;
  } else return NextResponse.json({ error: "Invalid payment request" }, { status: 400 });

  const reference = ref();
  const admin = createAdminClient();
  const { error } = await admin.from("payment_requests").insert({
    user_id: user.id, reference, kind: body.kind, tier, hours, amount, currency: process.env.WESH_PAYMENT_CURRENCY || "EUR", status: "pending"
  });
  if (error) return NextResponse.json({ error: "PAYMENT_REQUEST_FAILED", detail: error.message }, { status: 500 });

  const tokens = minutes ? Math.floor(minutes * 6) : 0;
  return NextResponse.json({ payment: {
    reference, amount, tokens, currency: process.env.WESH_PAYMENT_CURRENCY || "EUR",
    method: process.env.WESH_PAYMENT_METHOD_NAME || "Wesh Star IA Direct",
    accountName: process.env.WESH_PAYMENT_ACCOUNT_NAME || "Wesh Star IA",
    iban: process.env.WESH_PAYMENT_IBAN || "", bic: process.env.WESH_PAYMENT_BIC || "",
    mobileMoney: {
      name: process.env.WESH_MOBILE_MONEY_NAME || process.env.WESH_PAYMENT_ACCOUNT_NAME || "Wesh Star IA",
      mtn: process.env.WESH_MOBILE_MONEY_MTN || "",
      moov: process.env.WESH_MOBILE_MONEY_MOOV || "",
      xofPerEur: Number(process.env.WESH_XOF_PER_EUR) || 655.957
    },
    instructions: process.env.WESH_PAYMENT_INSTRUCTIONS || "Utilisez la référence ci-dessus comme motif de paiement. L’activation est effectuée après confirmation par Wesh Star IA."
  }});
}
