import { NextResponse } from "next/server";
import { createClient } from "@/lib/account/server";
import { createAdminClient } from "@/lib/account/admin";
import { query } from "@/lib/db/pool";
import { getSettings } from "@/lib/settings";
import { getEconomy } from "@/lib/creator-db";
import { appUrl } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { FW_PREFIX, newRef } from "@/lib/payments/flutterwave";

const xofPerEur = () => Number(process.env.WESH_XOF_PER_EUR) || 655.957;

// Paiement Flutterwave (Mobile Money et moyens locaux). Trois types d'achat :
//  - kind "minutes" : pack de crédits vidéo (EUR ou FCFA)
//  - kind "coins"   : pack de pièces pour les cadeaux (FCFA)
//  - kind "plan"    : abonnement payé en une fois, mois ou année (FCFA, sans prélèvement automatique)
export async function POST(req: Request) {
  try {
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (!rateLimit("flutterwave-create:" + clientKey(req, user.id), 5, 60000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Flutterwave n'est pas configuré." }, { status: 503 });
    const base = appUrl();
    if (!base) return NextResponse.json({ error: "WESH_APP_URL is not configured" }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const kind = String(body.kind || "minutes");
    const rate = xofPerEur();

    let reference = "", amount = 0, currency = "XOF", title = "Wesh Star IA", description = "", tokens = 0;

    if (kind === "coins") {
      const pack = (await getEconomy()).coinPacks.find(p => p.id === String(body.packId || "") && p.active);
      if (!pack) return NextResponse.json({ error: "COIN_PACK_UNAVAILABLE" }, { status: 400 });
      amount = Math.round(Number(pack.priceEur) * rate);
      reference = newRef(FW_PREFIX.coins);
      await query(
        `insert into public.coin_purchases (user_id,pack_id,coins,price_eur,currency,status,provider,provider_ref,amount_expected)
         values ($1,$2,$3,$4,'XOF','pending','flutterwave',$5,$6)`,
        [user.id, pack.id, pack.coins, pack.priceEur, reference, amount]);
      description = `${pack.coins} pièces`;
    } else if (kind === "plan") {
      const settings = await getSettings();
      const tier = String(body.tier || "");
      const period = body.period === "year" ? "year" : "month";
      const plan = (settings.plans.monthlyTiers || []).find(x => x.id === tier && x.enabled !== false);
      if (!plan) return NextResponse.json({ error: "Subscription tier unavailable" }, { status: 400 });
      const minutes = Math.max(1, Math.min(600, Math.floor(Number(plan.minutes))));
      const priceEur = period === "year" ? Math.round(Number(plan.price) * 10 * 100) / 100 : Number(plan.price);
      if (!Number.isFinite(priceEur) || priceEur <= 0) return NextResponse.json({ error: "Invalid plan price" }, { status: 400 });
      amount = Math.round(priceEur * rate);
      const cur = await query("select current_period_end from public.profiles where id=$1", [user.id]);
      const oldEnd = cur.rows[0]?.current_period_end ? new Date(cur.rows[0].current_period_end) : null;
      const start = oldEnd && oldEnd.getTime() > Date.now() ? oldEnd : new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + (period === "year" ? 12 : 1));
      reference = newRef(FW_PREFIX.plan);
      await query(
        `insert into public.manual_subscription_payments (reference,user_id,tier,period,period_end,minutes,amount_eur,currency,status,provider,provider_ref,amount_expected)
         values ($1,$2,$3,$4,$5,$6,$7,'XOF','pending','flutterwave',$1,$8)`,
        [reference, user.id, tier, period, end.toISOString(), minutes, priceEur, amount]);
      description = `${plan.name} (${period === "year" ? "annuel" : "mensuel"}) — ${minutes * 6} crédits vidéo par mois`;
    } else {
      const mins = Math.max(1, Math.min(10080, Math.floor(Number(body.minutes))));
      const settings = await getSettings();
      const pack = (settings.plans.hourTiers || []).find((x: any) => x.hours === mins && x.enabled !== false);
      if (!pack) return NextResponse.json({ error: "Forfait indisponible" }, { status: 400 });
      currency = String(body.currency || "EUR").toUpperCase();
      if (!["EUR", "XOF"].includes(currency)) return NextResponse.json({ error: "Devise non prise en charge" }, { status: 400 });
      amount = currency === "XOF" ? Math.round(Number(pack.price) * rate) : Number(pack.price);
      reference = newRef(FW_PREFIX.minutes);
      const ins = await createAdminClient().from("payment_requests").insert({ user_id: user.id, reference, kind: "minutes", tier: null, hours: mins / 60, amount, currency, status: "pending" });
      if (ins.error) throw new Error(ins.error.message);
      tokens = mins * 6;
      description = `Achat de ${mins * 6} crédits vidéo`;
    }

    const r = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: reference, amount, currency,
        redirect_url: `${base}/api/payments/flutterwave/verify`,
        customer: { email: user.email || "customer@weshstar.invalid", name: (user as any).user_metadata?.full_name || "Wesh Star IA customer" },
        customizations: { title, description },
        meta: { user_id: user.id, reference, kind }
      }),
      cache: "no-store"
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data.status !== "success" || !data.data?.link) throw new Error(data.message || "Création du paiement Flutterwave impossible");
    return NextResponse.json({ checkoutUrl: data.data.link, reference, amount, currency, tokens });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Flutterwave error" }, { status: 500 });
  }
}
