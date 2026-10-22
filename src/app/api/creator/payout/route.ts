import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { withTransaction } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { getEconomy } from "@/lib/creator-db";

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("creator-payout:" + clientKey(req, access.user.id), 3, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const configuredMin = Number(process.env.WESH_CREATOR_PAYOUT_MIN_EUR || 10);
  const minPayoutEur = Math.min(15, Math.max(10, Number.isFinite(configuredMin) ? configuredMin : 10));
  const minCoins = Math.round(minPayoutEur * 100);
  const coins = Math.floor(Number(body.coins));
  const payoutMethod = String(body.payoutMethod || "").trim().toLowerCase();
  const payoutDestination = String(body.payoutDestination || "").trim().slice(0, 240);
  if (!["bank_transfer", "paypal", "mobile_money"].includes(payoutMethod) || payoutDestination.length < 4) {
    return NextResponse.json({ error: "PAYOUT_DESTINATION_REQUIRED" }, { status: 400 });
  }
  if (!Number.isSafeInteger(coins) || coins < minCoins) return NextResponse.json({ error: "MIN_PAYOUT_NOT_REACHED", minCoins, minPayoutEur }, { status: 400 });
  const eco = await getEconomy();
  if (!eco.payouts.enabled) return NextResponse.json({ error: "PAYOUTS_DISABLED" }, { status: 403 });
  try {
    const result = await withTransaction(async (c) => {
      await c.query("select pg_advisory_xact_lock(hashtext($1))", ["coin-wallet:" + access.user!.id]);
      const b = await c.query("select coalesce(sum(delta),0)::bigint balance from public.coin_ledger where account_type='user' and wallet_type='earnings' and user_id=$1", [access.user!.id]);
      if (Number(b.rows[0]?.balance || 0) < minCoins) throw Object.assign(new Error("MIN_PAYOUT_NOT_REACHED"), { code: 403 });
      if (Number(b.rows[0]?.balance || 0) < coins) throw Object.assign(new Error("INSUFFICIENT_EARNINGS"), { code: 402 });
      const r = await c.query("insert into public.creator_payout_requests (user_id,coins,payout_method,payout_destination) values ($1,$2,$3,$4) returning id", [access.user!.id, coins, payoutMethod, payoutDestination]);
      const id = String(r.rows[0].id);
      await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note)
        values ('user','earnings',$1,$2,'payout_reserve',$3,$4,'Réservation pour demande de retrait')`, [access.user!.id, -coins, "payout:" + id, id]);
      // Approbation automatique (réglage admin) : seulement si toutes les règles sont réunies. Sinon la demande reste « en attente ».
      let autoApproved = false;
      const pol = eco.payouts;
      if (pol.autoApprove && coins / 100 <= pol.autoApproveMaxEur) {
        const prof = await c.query("select created_at, coalesce(blocked,false) as blocked from public.profiles where id=$1", [access.user!.id]);
        const ageDays = prof.rows[0]?.created_at ? (Date.now() - new Date(prof.rows[0].created_at).getTime()) / 86_400_000 : 0;
        const others = await c.query("select count(*)::int n from public.creator_payout_requests where user_id=$1 and status in ('pending','approved') and id<>$2", [access.user!.id, id]);
        const reserve = await c.query("select coalesce(sum(amount_cents) filter (where kind in ('coin_purchase_creator_reserve','creator_payout_paid','creator_reserve_withdrawal')),0)::bigint cents from public.platform_money_ledger");
        const unpaid = await c.query("select coalesce(sum(coins),0)::bigint coins from public.creator_payout_requests where status in ('pending','approved')");
        const reserveOk = Number(reserve.rows[0]?.cents || 0) >= Number(unpaid.rows[0]?.coins || 0);
        if (!prof.rows[0]?.blocked && ageDays >= pol.minAccountAgeDays && Number(others.rows[0]?.n || 0) === 0 && reserveOk) {
          await c.query("update public.creator_payout_requests set status='approved', admin_note=$2, updated_at=now() where id=$1 and status='pending'", [id, "Approuvé automatiquement (règles du site). Paiement à exécuter."]);
          autoApproved = true;
        }
      }
      return { id, reservedCoins: coins, autoApproved };
    });
    return NextResponse.json({ ok: true, ...result, message: result.autoApproved ? "Demande approuvée automatiquement. Le versement sera effectué sur les coordonnées indiquées." : "Demande envoyée. L’administration vérifiera votre compte et les informations de retrait avant tout versement." });
  } catch (e: any) {
    if (e?.code === 402) return NextResponse.json({ error: "INSUFFICIENT_EARNINGS" }, { status: 402 });
    if (e?.code === 403) return NextResponse.json({ error: "MIN_PAYOUT_NOT_REACHED", minCoins, minPayoutEur }, { status: 400 });
    console.error("[creator-payout]", e?.message || e);
    return NextResponse.json({ error: "PAYOUT_REQUEST_FAILED" }, { status: 500 });
  }
}
