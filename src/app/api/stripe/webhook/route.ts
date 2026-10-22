import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/account/admin";
import { stripeRequest, verifyStripeSignature } from "@/lib/stripe";
import { fulfillPaidPack } from "@/lib/payments/fulfill";
import { query, withTransaction } from "@/lib/db/pool";
import { getEconomy } from "@/lib/creator-db";

function cycleKey(unixSeconds: number | null | undefined) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7);
}

async function savePayment(userId: string, invoice: any, tier: string | null, amount: number) {
  const admin = createAdminClient();
  const id = String(invoice?.id || "");
  if (!id) return;
  await admin.from("payment_requests").upsert({
    user_id: userId,
    reference: `STRIPE-${id}`,
    kind: "subscription",
    tier: tier || null,
    hours: null,
    amount,
    currency: String(invoice?.currency || "eur").toUpperCase(),
    status: "confirmed",
    reviewed_at: new Date().toISOString()
  }, { onConflict: "reference" });
}

export async function POST(req: Request) {
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    const event = JSON.parse(payload);
    const admin = createAdminClient();
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session?.metadata?.user_id;
      const subscriptionId = typeof session?.subscription === "string" ? session.subscription : session?.subscription?.id;
      const customerId = typeof session?.customer === "string" ? session.customer : session?.customer?.id;
      if (session?.mode === "payment" && session?.payment_status === "paid" && session?.metadata?.promotion_campaign_id) {
        const campaignId = String(session.metadata.promotion_campaign_id);
        const found = await query(`select id,user_id,budget_eur,currency,status,stripe_session_id from public.promotion_campaigns where id=$1 limit 1`, [campaignId]);
        const campaign = found.rows[0];
        const paidAmount = Number(session.amount_total || 0) / 100;
        if (!campaign || String(campaign.user_id) !== String(session.metadata.user_id) || String(campaign.stripe_session_id) !== String(session.id) || String(campaign.currency).toLowerCase() !== String(session.currency).toLowerCase() || Math.abs(Number(campaign.budget_eur) - paidAmount) > 0.01) {
          throw new Error("Stripe promotion amount/currency/reference mismatch");
        }
        if (campaign.status === "pending_payment") {
          await query(`update public.promotion_campaigns set status='pending_review',payment_intent_id=$2,updated_at=now() where id=$1 and status='pending_payment'`, [campaignId, String(session.payment_intent || session.id)]);
        }
      }
      if (session?.mode === "payment" && session?.payment_status === "paid" && session?.metadata?.coin_purchase_id) {
        const purchaseId = String(session.metadata.coin_purchase_id);
        const paidAmount = Number(session.amount_total || 0) / 100;
        await withTransaction(async (c) => {
          const found = await c.query("select * from public.coin_purchases where id=$1 for update", [purchaseId]);
          const purchase = found.rows[0];
          if (!purchase || String(purchase.user_id) !== String(session.metadata.user_id) || String(purchase.stripe_session_id) !== String(session.id) || String(purchase.currency).toLowerCase() !== String(session.currency).toLowerCase() || Math.abs(Number(purchase.price_eur) - paidAmount) > 0.01) {
            throw new Error("Stripe coin purchase amount/currency/reference mismatch");
          }
          if (purchase.status !== "paid") {
            await c.query("update public.coin_purchases set status='paid', payment_intent_id=$2, paid_at=now() where id=$1", [purchaseId, String(session.payment_intent || session.id)]);
            await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note)
              values ('user','coins',$1,$2,'purchase',$3,$4,$5) on conflict (entry_key) do nothing`,
              [purchase.user_id, Number(purchase.coins), "coin_purchase:" + purchaseId, purchaseId, "Achat de pièces confirmé par Stripe"]);
            const grossCents = Math.round(paidAmount * 100);
            const platformCents = Math.floor(grossCents * (100 - (await getEconomy()).creatorSharePct) / 100);
            const creatorReserveCents = grossCents - platformCents;
            await c.query(`insert into public.platform_money_ledger(amount_cents,currency,kind,entry_key,reference_id,note) values
              ($1,'EUR','coin_purchase_platform_share',$2,$3,'40 % de la vente de pièces; comptabilité, pas un transfert bancaire'),
              ($4,'EUR','coin_purchase_creator_reserve',$5,$3,'60 % réservé aux gains créateurs éventuels; comptabilité')
              on conflict (entry_key) do nothing`, [platformCents, 'coin_purchase_platform:' + purchaseId, purchaseId, creatorReserveCents, 'coin_purchase_reserve:' + purchaseId]);
          }
        });
      }

      if (session?.mode === "payment" && session?.payment_status === "paid" && session?.metadata?.manual_subscription_reference) {
        const reference = String(session.metadata.manual_subscription_reference);
        await withTransaction(async (c) => {
          const found = await c.query("select * from public.manual_subscription_payments where reference=$1 for update", [reference]);
          const p = found.rows[0];
          const paidAmount = Number(session.amount_total || 0) / 100;
          if (!p || String(p.user_id) !== String(session.metadata.user_id) || String(p.stripe_session_id) !== String(session.id) || String(p.currency).toLowerCase() !== String(session.currency).toLowerCase() || Math.abs(Number(p.amount_eur) - paidAmount) > 0.01) throw new Error("Manual plan payment amount/currency/reference mismatch");
          if (p.status !== "paid") {
            const end = new Date(p.period_end);
            if (!Number.isFinite(end.getTime())) throw new Error("Invalid manual subscription period end");
            const updated = await admin.from("profiles").update({ subscription_status: "active", subscription_tier: p.tier, current_period_end: end.toISOString(), quota_cycle_key: null, stripe_customer_id: null, stripe_subscription_id: null }).eq("id", p.user_id);
            if (updated.error) throw new Error("Could not activate manual subscription: " + updated.error.message);
            const currentMonth = new Date().toISOString().slice(0, 7);
            await c.query("delete from public.usage_counters where user_id=$1 and period=$2", [p.user_id, currentMonth]);
            await c.query("update public.manual_subscription_payments set status='paid',payment_intent_id=$2,paid_at=now() where id=$1", [p.id, String(session.payment_intent || session.id)]);
          }
        });
      }
      if (session?.mode === "payment" && session?.payment_status === "paid" && session?.metadata?.payment_reference) {
        const reference = String(session.metadata.payment_reference);
        const { data: packPayment } = await admin.from("payment_requests").select("amount,currency,user_id,reference").eq("reference", reference).single();
        const paidAmount = Number(session.amount_total || 0) / 100;
        if (!packPayment || String(packPayment.user_id) !== String(session.metadata.user_id) || String(packPayment.currency).toLowerCase() !== String(session.currency).toLowerCase() || Math.abs(Number(packPayment.amount) - paidAmount) > 0.01) {
          throw new Error("Stripe pack payment amount/currency/reference mismatch");
        }
        const result = await fulfillPaidPack(reference, String(session.payment_intent || session.id));
        if (!result.ok) throw new Error(result.error || "Pack fulfillment failed");
      }
      if (userId && session?.mode === "subscription") await admin.from("profiles").update({ stripe_customer_id: customerId || null, stripe_subscription_id: subscriptionId || null }).eq("id", userId);
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const subscriptionId = typeof invoice?.subscription === "string" ? invoice.subscription : invoice?.subscription?.id;
      if (subscriptionId) {
        const sub = await stripeRequest<any>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, undefined, "GET");
        const userId = sub?.metadata?.user_id;
        const tier = sub?.metadata?.tier || null;
        if (userId) {
          const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
          const update = {
            subscription_status: "active",
            subscription_tier: tier,
            current_period_end: periodEnd,
            quota_cycle_key: cycleKey(sub?.current_period_start)
          };
          await admin.from("profiles").update({ ...update, stripe_customer_id: typeof sub?.customer === "string" ? sub.customer : null, stripe_subscription_id: subscriptionId }).eq("id", userId);
          await savePayment(userId, invoice, tier, Number(invoice?.amount_paid || 0) / 100);
        }
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const subscriptionId = typeof invoice?.subscription === "string" ? invoice.subscription : invoice?.subscription?.id;
      if (subscriptionId) {
        const sub = await stripeRequest<any>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, undefined, "GET");
        const userId = sub?.metadata?.user_id;
        if (userId) await admin.from("profiles").update({ subscription_status: "past_due" }).eq("id", userId);
      }
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const userId = sub?.metadata?.user_id;
      if (userId) {
        const status = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "inactive";
        await admin.from("profiles").update({ subscription_status: status, subscription_tier: sub?.metadata?.tier || null, current_period_end: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null, stripe_customer_id: typeof sub?.customer === "string" ? sub.customer : null, stripe_subscription_id: sub.id }).eq("id", userId);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const userId = sub?.metadata?.user_id;
      if (userId) await admin.from("profiles").update({ subscription_status: "inactive", current_period_end: null }).eq("id", userId);
    }
    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Webhook processing failed" }, { status: 500 });
  }
}
