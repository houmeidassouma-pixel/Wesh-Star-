import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { withTransaction } from "@/lib/creator-db";
import { settleChest, PRESENCE_WINDOW_SECONDS } from "@/lib/live-db";
import { getEconomy } from "@/lib/creator-db";
import { splitGift } from "@/lib/creator-economy";

// Réclamer sa part d'un coffre. Tout est atomique : verrou de ligne sur le coffre + clé primaire (coffre, utilisateur).
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("chest-claim:" + clientKey(req, access.user.id), 15, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const { chestId } = await req.json().catch(() => ({}));
  const id = String(chestId || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const uid = access.user.id;
  const eco = await getEconomy();
  try {
    const out = await withTransaction(async (c) => {
      const r = await c.query(
        `select ch.*, (ch.expires_at <= now()) as expired, s.status as session_status
           from public.chests ch join public.live_sessions s on s.id=ch.session_id where ch.id=$1 for update of ch`, [id]);
      const ch = r.rows[0];
      if (!ch) return { code: 404, error: "NOT_FOUND" };
      // On renvoie un résultat (et non une exception) pour que la clôture/remboursement soit bien validée (commit).
      if (ch.status !== "open") return { code: 409, error: "CHEST_CLOSED" };
      if (ch.expired || ch.session_status !== "live") { await settleChest(c, id, false); return { code: 409, error: "CHEST_CLOSED" }; }
      if (ch.depositor_id === uid) return { code: 400, error: "OWN_CHEST" };
      if (ch.claimed_count >= ch.max_claimants) { await settleChest(c, id, true); return { code: 409, error: "CHEST_EMPTY" }; }
      const el = await c.query(
        `select 1 from public.live_participants lp join public.profiles pr on pr.id=lp.user_id
          where lp.session_id=$1 and lp.user_id=$2
            and lp.last_seen_at > now() - make_interval(secs => $3)
            and lp.joined_at <= now() - make_interval(secs => $4)
            and pr.created_at <= now() - make_interval(mins => $5)`,
        [ch.session_id, uid, PRESENCE_WINDOW_SECONDS, ch.min_presence_seconds, ch.min_account_age_minutes]);
      if (!el.rows[0]) return { code: 403, error: "NOT_ELIGIBLE" };
      const ins = await c.query("insert into public.chest_claims (chest_id,user_id,tokens) values ($1,$2,$3) on conflict do nothing returning user_id", [id, uid, ch.share_tokens]);
      if (!ins.rows.length) return { code: 409, error: "ALREADY_CLAIMED" };
      // Chaque part réclamée est répartie automatiquement : 60 % en gains créateur, 40 % à la plateforme.
      const split = splitGift(Number(ch.share_tokens), Number(ch.creator_pct ?? eco.creatorSharePct));
      if (split.creator > 0) await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note)
        values ('user','earnings',$1,$2,'chest_received',$3,$4,$5) on conflict (entry_key) do nothing`, [uid, split.creator, `chest:${id}:claim:${uid}:creator`, id, 'Part de coffre LIVE']);
      if (split.platform > 0) await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note)
        values ('platform','platform',null,$1,'chest_platform_share',$2,$3,$4) on conflict (entry_key) do nothing`, [split.platform, `chest:${id}:claim:${uid}:platform`, id, 'Commission plateforme sur coffre LIVE']);
      const newCount = ch.claimed_count + 1;
      if (newCount >= ch.max_claimants) await c.query("update public.chests set claimed_count=$2, status='closed', closed_at=now() where id=$1", [id, newCount]);
      else await c.query("update public.chests set claimed_count=$2 where id=$1", [id, newCount]);
      return { code: 200, coins: split.creator, grossCoins: ch.share_tokens, platformCoins: split.platform };
    });
    return out.code === 200 ? NextResponse.json({ ok: true, coins: out.coins, grossCoins: out.grossCoins, platformCoins: out.platformCoins }) : NextResponse.json({ error: out.error }, { status: out.code });
  } catch (e: any) {
    console.error("[chest-claim]", e?.message || e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
