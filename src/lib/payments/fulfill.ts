import { withTransaction } from "@/lib/db/pool";

/** Credits a paid one-time token/minute pack exactly once after server-side provider verification. */
export async function fulfillPaidPack(reference: string, providerPaymentId: string) {
  return withTransaction(async (c) => {
    const found = await c.query("select * from public.payment_requests where reference=$1 for update", [reference]);
    const p = found.rows[0];
    if (!p) return { ok: false, status: 404, error: "PAYMENT_NOT_FOUND" };
    if (p.fulfilled_at || p.status === "confirmed") return { ok: true, alreadyFulfilled: true };
    if (p.status !== "pending") return { ok: false, status: 409, error: "PAYMENT_NOT_PENDING" };
    if (!(p.kind === "minutes" || p.kind === "hours") || Number(p.hours) <= 0) return { ok: false, status: 400, error: "UNSUPPORTED_PAYMENT_KIND" };
    await c.query("update public.payment_requests set status='confirmed', reviewed_at=now(), fulfilled_at=now() where id=$1", [p.id]);
    // Paiement reçu en FCFA (ex. Flutterwave Mobile Money) : le montant réel encaissé s'ajoute au solde FCFA du panneau admin (idempotent).
    if (String(p.currency).toUpperCase() === "XOF" && Number(p.amount) > 0) {
      await c.query(
        `insert into public.treasury_ledger (kind,currency,amount,payment_request_id,note)
         values ('payment_in','XOF',$1,$2,'Paiement FCFA confirmé automatiquement') on conflict (payment_request_id) where kind = 'payment_in' do nothing`,
        [Math.round(Number(p.amount)), p.id]);
    }
    await c.query("update public.profiles set hour_credits_seconds=coalesce(hour_credits_seconds,0)+$1 where id=$2", [Math.round(Number(p.hours) * 3600), p.user_id]);
    return { ok: true, creditedSeconds: Math.round(Number(p.hours) * 3600), providerPaymentId };
  });
}
