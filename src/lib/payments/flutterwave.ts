import { query, withTransaction } from "@/lib/db/pool";
import { fulfillPaidPack } from "@/lib/payments/fulfill";
import { getEconomy } from "@/lib/creator-db";
import { timingSafeEqual } from "node:crypto";

// Préfixes des références Flutterwave : ils indiquent ce que le client a acheté.
export const FW_PREFIX = { minutes: "WS-FW-", coins: "WS-FWC-", plan: "WS-FWP-" } as const;
export type FwTx = { status?: string; tx_ref?: string; currency?: string; amount?: number | string; id?: number | string };
type Tx = FwTx & { amountPaid: number };

export function newRef(prefix: string) {
  return prefix + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function safeEqualText(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Demande à Flutterwave le vrai état de la transaction (on ne fait jamais confiance à l'URL de retour). */
export async function verifyFlutterwaveTransaction(transactionId: string): Promise<FwTx> {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) throw new Error("Flutterwave configuration missing");
  const r = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${secret}` }, cache: "no-store"
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.status !== "success" || d.data?.status !== "successful") throw new Error("Flutterwave payment verification failed");
  return d.data as FwTx;
}

/** Ajoute le montant FCFA réellement encaissé au solde de la trésorerie (une seule fois par source). */
async function creditTreasury(c: any, source: string, sourceId: string, amountXof: number, note: string) {
  if (!(amountXof > 0)) return;
  await c.query(
    `insert into public.treasury_ledger (kind,currency,amount,source,source_id,note)
     values ('payment_in','XOF',$1,$2,$3,$4)
     on conflict (source, source_id) where kind = 'payment_in' and source is not null do nothing`,
    [Math.round(amountXof), source, sourceId, note]);
}

const sameMoney = (a: number, b: number) => Math.abs(a - b) <= 0.01;

async function fulfillCoins(txRef: string, tx: Tx, userId?: string) {
  return withTransaction(async (c) => {
    const found = await c.query("select * from public.coin_purchases where provider_ref=$1 for update", [txRef]);
    const p = found.rows[0];
    if (!p) return { ok: false, error: "PURCHASE_NOT_FOUND" };
    if (userId && String(p.user_id) !== userId) return { ok: false, error: "USER_MISMATCH" };
    if (String(tx.currency).toUpperCase() !== "XOF" || String(p.currency).toUpperCase() !== "XOF" || !sameMoney(tx.amountPaid, Number(p.amount_expected))) {
      return { ok: false, error: "AMOUNT_MISMATCH" };
    }
    if (p.status === "paid") return { ok: true, already: true };
    await c.query("update public.coin_purchases set status='paid', payment_intent_id=$2, paid_at=now() where id=$1", [p.id, String(tx.id || txRef)]);
    await c.query(
      `insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note)
       values ('user','coins',$1,$2,'purchase',$3,$4,$5) on conflict (entry_key) do nothing`,
      [p.user_id, Number(p.coins), "coin_purchase:" + p.id, String(p.id), "Achat de pièces confirmé par Flutterwave (FCFA)"]);
    // Même répartition comptable que Stripe, selon le pourcentage réglé dans l'admin (par défaut 40 % plateforme / 60 % créateurs).
    const grossCents = Math.round(Number(p.price_eur) * 100);
    const platformCents = Math.floor(grossCents * (100 - (await getEconomy()).creatorSharePct) / 100);
    await c.query(
      `insert into public.platform_money_ledger(amount_cents,currency,kind,entry_key,reference_id,note) values
       ($1,'EUR','coin_purchase_platform_share',$2,$3,'40 % de la vente de pièces (FCFA); comptabilité'),
       ($4,'EUR','coin_purchase_creator_reserve',$5,$3,'60 % réservé aux gains créateurs (FCFA); comptabilité')
       on conflict (entry_key) do nothing`,
      [platformCents, "coin_purchase_platform:" + p.id, String(p.id), grossCents - platformCents, "coin_purchase_reserve:" + p.id]);
    await creditTreasury(c, "coin_purchase", p.id, tx.amountPaid, "Achat de pièces (FCFA)");
    return { ok: true };
  });
}

async function fulfillPlan(txRef: string, tx: Tx, userId?: string) {
  return withTransaction(async (c) => {
    const found = await c.query("select * from public.manual_subscription_payments where provider_ref=$1 for update", [txRef]);
    const p = found.rows[0];
    if (!p) return { ok: false, error: "PLAN_PAYMENT_NOT_FOUND" };
    if (userId && String(p.user_id) !== userId) return { ok: false, error: "USER_MISMATCH" };
    if (String(tx.currency).toUpperCase() !== "XOF" || String(p.currency).toUpperCase() !== "XOF" || !sameMoney(tx.amountPaid, Number(p.amount_expected))) {
      return { ok: false, error: "AMOUNT_MISMATCH" };
    }
    if (p.status === "paid") return { ok: true, already: true };
    const end = new Date(p.period_end);
    if (!Number.isFinite(end.getTime())) return { ok: false, error: "INVALID_PERIOD_END" };
    await c.query(
      `update public.profiles set subscription_status='active', subscription_tier=$1, current_period_end=$2,
         quota_cycle_key=null, stripe_customer_id=null, stripe_subscription_id=null where id=$3`,
      [p.tier, end.toISOString(), p.user_id]);
    await c.query("delete from public.usage_counters where user_id=$1 and period=$2", [p.user_id, new Date().toISOString().slice(0, 7)]);
    await c.query("update public.manual_subscription_payments set status='paid', payment_intent_id=$2, paid_at=now() where id=$1", [p.id, String(tx.id || txRef)]);
    await creditTreasury(c, "subscription", p.id, tx.amountPaid, "Abonnement (FCFA)");
    return { ok: true };
  });
}

/**
 * Point unique d'activation après un paiement Flutterwave vérifié (retour navigateur OU webhook).
 * `userId` est fourni par le retour navigateur (l'acheteur connecté) ; le webhook n'en a pas.
 */
export async function settleFlutterwave(txRef: string, tx: FwTx, userId?: string): Promise<{ ok: boolean; error?: string }> {
  if (tx.tx_ref !== txRef) return { ok: false, error: "REFERENCE_MISMATCH" };
  const t: Tx = { ...tx, amountPaid: Number(tx.amount) };
  if (!(t.amountPaid > 0)) return { ok: false, error: "INVALID_AMOUNT" };
  if (txRef.startsWith(FW_PREFIX.coins)) return fulfillCoins(txRef, t, userId);
  if (txRef.startsWith(FW_PREFIX.plan)) return fulfillPlan(txRef, t, userId);
  if (txRef.startsWith(FW_PREFIX.minutes)) {
    const r = (await query("select user_id,amount,currency from public.payment_requests where reference=$1", [txRef])).rows[0];
    if (!r) return { ok: false, error: "PAYMENT_NOT_FOUND" };
    if (userId && String(r.user_id) !== userId) return { ok: false, error: "USER_MISMATCH" };
    if (String(tx.currency).toUpperCase() !== String(r.currency).toUpperCase() || !sameMoney(t.amountPaid, Number(r.amount))) return { ok: false, error: "AMOUNT_MISMATCH" };
    const done = await fulfillPaidPack(txRef, String(tx.id || txRef));
    return done.ok ? { ok: true } : { ok: false, error: (done as any).error };
  }
  return { ok: false, error: "UNKNOWN_REFERENCE" };
}
