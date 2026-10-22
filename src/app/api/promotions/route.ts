import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { appUrl, stripeRequest } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { getSettings } from "@/lib/settings";

const LIVE_BUDGETS = new Set([5, 10, 20, 50]);
const DURATIONS = new Set([24, 72, 168]);

export async function GET() {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  await query(`update public.promotion_campaigns set status='completed',updated_at=now() where status='active' and ends_at is not null and ends_at <= now()`);
  const settings = await getSettings();
  const [campaigns, videos, lives] = await Promise.all([
    query(`select id,target_type,target_id,budget_eur,target_views,duration_hours,status,impressions,clicks,starts_at,ends_at,created_at from public.promotion_campaigns where user_id=$1 order by created_at desc limit 50`, [access.user.id]),
    query(`select p.id,p.title,p.created_at from public.community_posts p where p.user_id=$1 and p.status='published' and p.visibility='public' order by p.created_at desc limit 100`, [access.user.id]),
    query(`select id,title,created_at from public.live_sessions where host_id=$1 and status='live' order by created_at desc limit 20`, [access.user.id])
  ]);
  return NextResponse.json({ campaigns: campaigns.rows, videos: videos.rows, lives: lives.rows, pricing: settings.site.promotionPricing });
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("promotion-create:" + clientKey(req, access.user.id), 4, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const targetType = body.targetType === "live" ? "live" : body.targetType === "video" ? "video" : "";
  const targetId = String(body.targetId || "");
  const requestedBudget = Number(body.budgetEur);
  const requestedViews = Number(body.targetViews);
  const duration = Number(body.durationHours);
  const settings = await getSettings();
  const pricing = settings.site.promotionPricing;
  const targetViews = targetType === "video" ? Math.floor(requestedViews) : 0;
  const budget = targetType === "video" ? Math.max(1, Math.round((targetViews / 1000 * pricing.pricePer1000Views) * 100) / 100) : requestedBudget;
  const viewsValid = targetType !== "video" || (Number.isInteger(targetViews) && targetViews >= pricing.minViews && targetViews <= pricing.maxViews);
  if (!targetType || !/^[0-9a-f-]{36}$/i.test(targetId) || !viewsValid || (targetType === "live" && !LIVE_BUDGETS.has(budget)) || !Number.isFinite(budget) || budget < 1 || budget > 100000 || !DURATIONS.has(duration)) {
    return NextResponse.json({ error: "INVALID_CAMPAIGN" }, { status: 400 });
  }
  let campaignId = "";
  try {
    if (targetType === "video") {
      const target = await query(`select id from public.community_posts where id=$1 and user_id=$2 and status='published' and visibility='public'`, [targetId, access.user.id]);
      if (!target.rows.length) return NextResponse.json({ error: "VIDEO_NOT_ELIGIBLE" }, { status: 400 });
    } else {
      const target = await query(`select id from public.live_sessions where id=$1 and host_id=$2 and status='live'`, [targetId, access.user.id]);
      if (!target.rows.length) return NextResponse.json({ error: "LIVE_NOT_ACTIVE_OR_NOT_YOURS" }, { status: 400 });
    }
    const base = appUrl();
    if (!base) return NextResponse.json({ error: "WESH_APP_URL is not configured" }, { status: 500 });
    const inserted = await query(`insert into public.promotion_campaigns(user_id,target_type,target_id,budget_eur,target_views,duration_hours,status) values($1,$2,$3,$4,$5,$6,'pending_payment') returning id`, [access.user.id,targetType,targetId,budget,targetViews,duration]);
    campaignId = inserted.rows[0].id as string;
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${base}/promote?payment=success`);
    params.set("cancel_url", `${base}/promote?payment=cancelled`);
    params.set("line_items[0][price_data][currency]", "eur");
    params.set("line_items[0][price_data][unit_amount]", String(Math.round(budget * 100)));
    params.set("line_items[0][price_data][product_data][name]", `${settings.site.name || "Wesh Star IA"} — promotion ${targetType === "live" ? "LIVE" : `vidéo · ${targetViews} vues`} (${duration} h)`);
    params.set("line_items[0][quantity]", "1");
    params.set("client_reference_id", campaignId);
    params.set("metadata[promotion_campaign_id]", campaignId);
    params.set("metadata[user_id]", access.user.id);
    params.set("metadata[target_type]", targetType);
    params.set("metadata[budget_eur]", String(budget));
    params.set("metadata[target_views]", String(targetViews));
    params.set("metadata[duration_hours]", String(duration));
    if (access.user.email) params.set("customer_email", access.user.email);
    const session = await stripeRequest<any>("/checkout/sessions", params);
    await query(`update public.promotion_campaigns set stripe_session_id=$2,updated_at=now() where id=$1`, [campaignId, session.id]);
    return NextResponse.json({ ok: true, checkoutUrl: session.url, campaignId });
  } catch (e: any) {
    if (campaignId) await query(`update public.promotion_campaigns set status='payment_failed',updated_at=now() where id=$1 and status='pending_payment'`, [campaignId]).catch(() => undefined);
    console.error("[promotion-create]", e?.message || e);
    return NextResponse.json({ error: "PROMOTION_CHECKOUT_FAILED" }, { status: 502 });
  }
}
