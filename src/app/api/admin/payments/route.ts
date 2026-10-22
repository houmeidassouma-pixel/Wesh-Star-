import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import { tierFromPaymentTier } from "@/lib/tiers";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { xofPerEur } from "@/lib/treasury";
import { withTransaction } from "@/lib/db/pool";
import { auditLog } from "@/lib/audit";
import { isPaymentStatus, planTransition } from "@/lib/payment-transitions";

export async function GET() {
  const access = await getAccess(); if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await createAdminClient().from("payment_requests").select("*").order("created_at", { ascending: false }).limit(100);
  return NextResponse.json({ payments: data || [], error: error?.message });
}
export async function POST(req: Request) {
  const access = await getAccess(); if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("admin-payments:" + clientKey(req, access.user!.id), 60, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const { id, status, receivedIn } = body as { id?: string; status?: string; receivedIn?: string };
  if (!id || !isPaymentStatus(status)) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const adminId = access.user!.id;
  try {
    const result = await withTransaction(async (c) => {
      // Verrou de ligne : deux confirmations simultanées sont sérialisées, la seconde voit "confirmed".
      const found = await c.query("select * from public.payment_requests where id=$1 for update", [id]);
      const payment = found.rows[0];
      if (!payment) return { http: 404, body: { error: "Not found" } };
      const plan = planTransition(payment.status, status, !!payment.fulfilled_at);
      if (!plan.ok) return { http: 409, body: { error: plan.reason } };
      if (plan.noop) return { http: 200, body: { ok: true, unchanged: true } };

      await c.query("update public.payment_requests set status=$1, reviewed_at=now(), reviewed_by=$2 where id=$3", [status, adminId, id]);

      if (plan.credit) {
        if (String(payment.currency).toUpperCase() === "XOF" && Number(payment.amount) > 0) {
          // Paiement enregistré directement en FCFA : montant exact, sans conversion.
          await c.query(
            `insert into public.treasury_ledger (kind,currency,amount,payment_request_id,created_by,note)
             values ('payment_in','XOF',$1,$2,$3,'Paiement FCFA confirmé') on conflict (payment_request_id) where kind = 'payment_in' do nothing`,
            [Math.round(Number(payment.amount)), payment.id, adminId]);
        } else if (receivedIn === "XOF" && payment.currency === "EUR") {
          // Paiement reçu en FCFA (Mobile Money) : crédite le solde XOF central (idempotent via index unique).
          const rate = xofPerEur();
          const xof = Math.round(Number(payment.amount) * rate);
          if (xof > 0) {
            await c.query(
              `insert into public.treasury_ledger (kind,currency,amount,payment_request_id,rate,created_by,note)
               values ('payment_in','XOF',$1,$2,$3,$4,'Paiement Mobile Money confirmé')
               on conflict (payment_request_id) where kind = 'payment_in' do nothing`, [xof, payment.id, rate, adminId]);
          }
        }
        if (payment.kind === "subscription" && tierFromPaymentTier(payment.tier)) {
          const days = Number(process.env.WESH_SUBSCRIPTION_DAYS || 30);
          const periodEnd = new Date(Date.now() + days * 86400000).toISOString();
          await c.query("update public.profiles set subscription_status='active', subscription_tier=$1, current_period_end=$2 where id=$3", [payment.tier, periodEnd, payment.user_id]);
        }
        if ((payment.kind === "hours" || payment.kind === "minutes") && Number(payment.hours) > 0) {
          // Incrément atomique côté SQL (pas de lecture-puis-écriture).
          await c.query("update public.profiles set hour_credits_seconds = coalesce(hour_credits_seconds,0) + $1 where id=$2", [Math.round(Number(payment.hours) * 3600), payment.user_id]);
        }
        await c.query("update public.payment_requests set fulfilled_at=now() where id=$1", [id]);
      }
      await auditLog({ actorId: adminId, actorRole: "admin", action: "payment.status_change", targetType: "payment_request", targetId: String(id),
        details: { from: payment.status, to: status, credited: plan.credit, kind: payment.kind, amount: payment.amount, currency: payment.currency, receivedIn: receivedIn || null } }, c);
      return { http: 200, body: { ok: true, credited: plan.credit } };
    });
    return NextResponse.json(result.body, { status: result.http });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "ERROR" }, { status: 500 });
  }
}
