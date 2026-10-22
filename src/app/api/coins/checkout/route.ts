import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { appUrl, stripeRequest } from "@/lib/stripe";
import { getEconomy } from "@/lib/creator-db";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("coin-checkout:" + clientKey(req, access.user.id), 5, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  try {
    const body = await req.json().catch(() => ({}));
    const pack = (await getEconomy()).coinPacks.find(p => p.id === String(body.packId || "") && p.active);
    if (!pack) return NextResponse.json({ error: "COIN_PACK_UNAVAILABLE" }, { status: 400 });
    const base = appUrl();
    if (!base) return NextResponse.json({ error: "WESH_APP_URL is not configured" }, { status: 500 });
    const purchase = await query(`insert into public.coin_purchases (user_id,pack_id,coins,price_eur,currency,status) values ($1,$2,$3,$4,'EUR','pending') returning id`, [access.user.id, pack.id, pack.coins, pack.priceEur]);
    const purchaseId = String(purchase.rows[0].id);
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${base}/coins?purchase=success`);
    params.set("cancel_url", `${base}/coins?purchase=cancelled`);
    params.set("line_items[0][price_data][currency]", "eur");
    params.set("line_items[0][price_data][unit_amount]", String(Math.round(pack.priceEur * 100)));
    params.set("line_items[0][price_data][product_data][name]", `Wesh Star IA — ${pack.coins} pièces`);
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[coin_purchase_id]", purchaseId);
    params.set("metadata[user_id]", access.user.id);
    if (access.user.email) params.set("customer_email", access.user.email);
    const session = await stripeRequest<any>("/checkout/sessions", params);
    await query("update public.coin_purchases set stripe_session_id=$2 where id=$1", [purchaseId, String(session.id)]);
    return NextResponse.json({ ok: true, checkoutUrl: session.url, coins: pack.coins, priceEur: pack.priceEur });
  } catch (e: any) {
    console.error("[coin-checkout]", e?.message || e);
    return NextResponse.json({ error: "CHECKOUT_FAILED", message: String(e?.message || e).slice(0, 160) }, { status: 500 });
  }
}
