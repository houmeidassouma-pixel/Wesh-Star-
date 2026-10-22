import { NextResponse } from "next/server";
import { createClient } from "@/lib/account/server";
import { getSettings } from "@/lib/settings";
import { appUrl, stripeRequest } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { query } from "@/lib/db/pool";

// Users choose manual renewal by default. Automatic monthly billing exists only after explicit opt-in.
export async function POST(req: Request) {
  try {
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (!rateLimit("manual-plan-checkout:" + clientKey(req, user.id), 5, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
    const body = await req.json();
    const settings = await getSettings();
    const tier = String(body.tier || "");
    const period = body.period === "year" ? "year" : "month";
    const autoRenew = body.autoRenew === true && period === "month";
    const plan = (settings.plans.monthlyTiers || []).find(x => x.id === tier && x.enabled !== false);
    if (!plan) return NextResponse.json({ error: "Subscription tier unavailable" }, { status: 400 });
    const minutes = Math.max(1, Math.min(600, Math.floor(Number(plan.minutes))));
    const monthlyPrice = Number(plan.price);
    const price = period === "year" ? Math.round(monthlyPrice * 10 * 100) / 100 : monthlyPrice;
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "Invalid plan price" }, { status: 400 });
    const base = appUrl();
    if (!base) return NextResponse.json({ error: "WESH_APP_URL is not configured" }, { status: 500 });
    const current = await query("select current_period_end from public.profiles where id=$1", [user.id]);
    const oldEnd = current.rows[0]?.current_period_end ? new Date(current.rows[0].current_period_end) : null;
    const periodStart = oldEnd && oldEnd.getTime() > Date.now() ? oldEnd : new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + (period === "year" ? 12 : 1));
    const params = new URLSearchParams();
    params.set("success_url", `${base}/billing?plan_payment=success`);
    params.set("cancel_url", `${base}/pricing?plan_payment=cancelled`);
    params.set("line_items[0][price_data][currency]", "eur");
    params.set("line_items[0][price_data][unit_amount]", String(Math.round(price * 100)));
    params.set("line_items[0][price_data][product_data][name]", `Wesh Star IA — ${plan.name} (${autoRenew ? "abonnement mensuel automatique" : period === "year" ? "annuel" : "mensuel"})`);
    params.set("line_items[0][price_data][product_data][description]", `${minutes * 6} crédits vidéo par mois.`);
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[user_id]", user.id);
    if (user.email) params.set("customer_email", user.email);
    if (autoRenew) {
      // Stripe creates a recurring monthly subscription only when the customer explicitly opts in.
      params.set("mode", "subscription");
      params.set("line_items[0][price_data][recurring][interval]", "month");
      params.set("subscription_data[metadata][user_id]", user.id);
      params.set("subscription_data[metadata][tier]", tier);
      params.set("subscription_data[metadata][minutes]", String(minutes));
      params.set("metadata[tier]", tier);
      const session = await stripeRequest<any>("/checkout/sessions", params);
      return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id, creditsPerMonth: minutes * 6, period: "month", priceEur: price, autoRenew: true });
    }
    params.set("mode", "payment");
    const reference = "WS-PLAN-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    await query(`insert into public.manual_subscription_payments (reference,user_id,tier,period,period_end,minutes,amount_eur,currency,status)
      values ($1,$2,$3,$4,$5,$6,$7,'EUR','pending')`, [reference, user.id, tier, period, periodEnd.toISOString(), minutes, price]);
    params.set("metadata[manual_subscription_reference]", reference);
    const session = await stripeRequest<any>("/checkout/sessions", params);
    await query("update public.manual_subscription_payments set stripe_session_id=$2 where reference=$1", [reference, String(session.id)]);
    return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id, reference, creditsPerMonth: minutes * 6, period, priceEur: price, autoRenew: false });
  } catch (e: any) {
    console.error("[manual-plan-checkout]", e?.message || e);
    return NextResponse.json({ error: e?.message || "Manual checkout failed" }, { status: 500 });
  }
}
