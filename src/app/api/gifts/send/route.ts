import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { getEconomy, withTransaction } from "@/lib/creator-db";
import { splitGift, planCoinSpend } from "@/lib/creator-economy";

// Envoi d'un cadeau en jetons. Prix, pourcentage et solde sont lus/calculés côté serveur uniquement.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("gift:" + clientKey(req, access.user.id), 30, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const liveSessionId = String(body.liveSessionId || "");
  const isLive = liveSessionId !== "";
  const settings = await getSettings();
  if (!isLive && !settings.site.communityEnabled && !settings.site.socialNetworkEnabled) return NextResponse.json({ error: "COMMUNITY_DISABLED" }, { status: 404 });
  const eco = await getEconomy();
  if (isLive && !eco.live.enabled) return NextResponse.json({ error: "LIVE_DISABLED" }, { status: 403 });
  if (!eco.giftsEnabled) return NextResponse.json({ error: "GIFTS_DISABLED" }, { status: 403 });
  const gift = eco.gifts.find((g) => g.id === String(body.giftId || "") && g.active);
  if (!gift) return NextResponse.json({ error: "GIFT_UNAVAILABLE" }, { status: 400 });
  const postId = String(body.postId || "");
  const uid = access.user.id;
  try {
    const out = await withTransaction(async (c) => {
      let post: { id: string | null; user_id: string };
      if (isLive) {
        // Cadeau LIVE : la session doit être en cours, l'expéditeur présent dans le salon, le destinataire = l'hôte.
        if (!/^[0-9a-f-]{36}$/i.test(liveSessionId)) throw Object.assign(new Error("NOT_FOUND"), { code: 404 });
        const l = await c.query(
          `select s.id, s.host_id as user_id from public.live_sessions s join public.profiles pr on pr.id=s.host_id
            where s.id=$1 and s.status='live' and pr.blocked=false
              and exists(select 1 from public.live_participants lp where lp.session_id=s.id and lp.user_id=$2 and lp.last_seen_at > now() - interval '60 seconds')`,
          [liveSessionId, uid]);
        if (!l.rows[0]) throw Object.assign(new Error("NOT_FOUND"), { code: 404 });
        post = { id: null, user_id: l.rows[0].user_id };
      } else {
        const p = await c.query(
          `select p.id, p.user_id from public.community_posts p join public.profiles pr on pr.id=p.user_id
            where p.id=$1 and p.status='published' and pr.blocked=false
              and (p.visibility='public' or p.user_id=$2 or (p.visibility='followers' and exists(select 1 from public.community_follows f where f.follower_id=$2 and f.following_id=p.user_id)))`,
          [postId, uid]);
        if (!p.rows[0]) throw Object.assign(new Error("NOT_FOUND"), { code: 404 });
        post = p.rows[0];
      }
      if (post.user_id === uid) throw Object.assign(new Error("SELF_GIFT"), { code: 400 });
      const split = splitGift(gift.tokens, eco.creatorSharePct);
      // Lock the sender wallet. Purchased coins are spent first; earned rewards can also be re-gifted.
      await c.query("select pg_advisory_xact_lock(hashtext($1))", ["coin-wallet:" + uid]);
      const balances = await c.query(`select wallet_type, coalesce(sum(delta),0)::bigint balance from public.coin_ledger
        where account_type='user' and user_id=$1 group by wallet_type`, [uid]);
      const byType: Record<string, number> = { coins: 0, earnings: 0 };
      for (const row of balances.rows) byType[String(row.wallet_type)] = Number(row.balance || 0);
      let debitPlan: { fromPurchased: number; fromEarned: number };
      try { debitPlan = planCoinSpend(byType.coins, byType.earnings, split.tokens); }
      catch { throw Object.assign(new Error("INSUFFICIENT_COINS"), { code: 402 }); }
      const tx = await c.query(
        `insert into public.gift_transactions (sender_id,receiver_id,post_id,live_session_id,gift_id,gift_name,tokens,creator_pct,creator_tokens,platform_tokens)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
        [uid, post.user_id, post.id, isLive ? liveSessionId : null, gift.id, gift.name, split.tokens, split.creatorPct, split.creator, split.platform]);
      const txId = String(tx.rows[0].id);
      const debitCoins = debitPlan.fromPurchased;
      const debitEarnings = debitPlan.fromEarned;
      if (debitCoins > 0) await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note)
        values ('user','coins',$1,$2,'gift_sent',$3,$4,$5)`, [uid, -debitCoins, txId + ':sender:coins', txId, gift.name]);
      if (debitEarnings > 0) await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note)
        values ('user','earnings',$1,$2,'gift_sent',$3,$4,$5)`, [uid, -debitEarnings, txId + ':sender:earnings', txId, gift.name]);
      await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note) values
        ('user','earnings',$1,$2,'gift_received',$3,$4,$5),
        ('platform','platform',null,$6,'platform_gift_share',$7,$4,$5)`,
        [post.user_id, split.creator, txId + ':creator', txId, gift.name, split.platform, txId + ':platform']);
      // Purchased coins already contributed the platform share to platform revenue at purchase time.
      // When creator earnings are re-gifted, move the platform share (admin setting) of their cent-value from the creator reserve to platform revenue.
      const regiftPlatformCents = Math.floor(debitEarnings * (100 - split.creatorPct) / 100);
      if (regiftPlatformCents > 0) await c.query(`insert into public.platform_money_ledger(amount_cents,currency,kind,entry_key,reference_id,note) values
        ($1,'EUR','earned_coin_regift_platform_share',$2,$3,'Part plateforme (réglage admin) sur gains créateur réofferts'),
        ($4,'EUR','creator_payout_paid',$5,$3,'Réduction de la réserve créateur lors du ré-offrande') on conflict (entry_key) do nothing`,
        [regiftPlatformCents, txId + ':cash_platform', txId, -regiftPlatformCents, txId + ':cash_reserve']);
      const newBalance = await c.query("select coalesce(sum(delta),0)::bigint balance from public.coin_ledger where account_type='user' and user_id=$1", [uid]);
      return { balance: Number(newBalance.rows[0]?.balance || 0), creatorReceived: split.creator, platformReceived: split.platform };
    });
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    if (e?.code === 404 || e?.code === 400 || e?.code === 402) return NextResponse.json({ error: e.message }, { status: e.code });
    console.error("[gift]", e?.message || e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
