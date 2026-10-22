import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { getEconomy, withTransaction } from "@/lib/creator-db";
import { planChest, planCoinSpend } from "@/lib/creator-economy";
import { PRESENCE_WINDOW_SECONDS } from "@/lib/live-db";

// Dépôt d'un coffre en PIÈCES (pas en jetons IA). Les pièces achetées sont dépensées avant les gains créateur.
// Les parts non réclamées sont rendues à la clôture, avec leur type de solde suivi dans le coffre.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("chest-create:" + clientKey(req, access.user.id), 6, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const eco = await getEconomy();
  if (!eco.live.enabled) return NextResponse.json({ error: "LIVE_DISABLED" }, { status: 403 });
  if (!eco.chests.enabled) return NextResponse.json({ error: "CHESTS_DISABLED" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId || "");
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  let plan;
  try { plan = planChest(Number(body.totalCoins ?? body.totalTokens), Number(body.maxClaimants), eco.chests); }
  catch (e: any) { return NextResponse.json({ error: "INVALID_AMOUNT", message: e.message }, { status: 400 }); }
  const uid = access.user.id;
  try {
    const out = await withTransaction(async (c) => {
      await c.query("select pg_advisory_xact_lock(hashtext($1))", ["coin-wallet:" + uid]);
      const s = await c.query("select id from public.live_sessions where id=$1 and status='live' for update", [sessionId]);
      if (!s.rows[0]) return { code: 404, error: "LIVE_ENDED" };
      const me = await c.query("select 1 from public.live_participants where session_id=$1 and user_id=$2 and last_seen_at > now() - make_interval(secs => $3)", [sessionId, uid, PRESENCE_WINDOW_SECONDS]);
      if (!me.rows[0] && s.rows[0]) { const host = await c.query("select 1 from public.live_sessions where id=$1 and host_id=$2", [sessionId, uid]); if (!host.rows[0]) return { code: 403, error: "NOT_IN_LIVE" }; }
      const open = await c.query("select count(*)::int n from public.chests where session_id=$1 and status='open'", [sessionId]);
      if (open.rows[0].n >= eco.chests.maxOpenPerSession) return { code: 429, error: "TOO_MANY_CHESTS" };
      const balances = await c.query(`select wallet_type, coalesce(sum(delta),0)::bigint balance from public.coin_ledger
        where account_type='user' and user_id=$1 group by wallet_type`, [uid]);
      const byType: Record<string, number> = { coins: 0, earnings: 0 };
      for (const row of balances.rows) byType[String(row.wallet_type)] = Number(row.balance || 0);
      let debit: { fromPurchased: number; fromEarned: number };
      try { debit = planCoinSpend(byType.coins, byType.earnings, plan.reserved); }
      catch { return { code: 402, error: "INSUFFICIENT_COINS" }; }
      const ins = await c.query(
        `insert into public.chests (session_id,depositor_id,max_claimants,share_tokens,reserved_tokens,min_presence_seconds,min_account_age_minutes,expires_at,debited_purchased_coins,debited_earned_coins,creator_pct)
         values ($1,$2,$3,$4,$5,$6,$7, now() + make_interval(mins => $8),$9,$10,$11) returning id`,
        [sessionId, uid, plan.maxClaimants, plan.share, plan.reserved, eco.chests.minPresenceSeconds, eco.chests.minAccountAgeMinutes, eco.chests.expiresMinutes, debit.fromPurchased, debit.fromEarned, eco.creatorSharePct]);
      const chestId = String(ins.rows[0].id);
      if (debit.fromPurchased > 0) await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note) values ('user','coins',$1,$2,'chest_deposit',$3,$4,$5)`, [uid, -debit.fromPurchased, chestId + ':depositor:coins', chestId, 'Dépôt coffre LIVE']);
      if (debit.fromEarned > 0) await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note) values ('user','earnings',$1,$2,'chest_deposit',$3,$4,$5)`, [uid, -debit.fromEarned, chestId + ':depositor:earnings', chestId, 'Dépôt coffre LIVE']);
      return { code: 200, chestId, balance: byType.coins + byType.earnings - plan.reserved };
    });
    if (out.code !== 200) return NextResponse.json({ error: out.error }, { status: out.code });
    return NextResponse.json({ ok: true, chestId: out.chestId, share: plan.share, reserved: plan.reserved, unusedRemainder: plan.unusedRemainder, balance: out.balance });
  } catch (e: any) {
    console.error("[chest-create]", e?.message || e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
