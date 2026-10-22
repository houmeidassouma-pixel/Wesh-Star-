import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query, withTransaction } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { auditLog } from "@/lib/audit";
import { getEconomy, saveEconomy } from "@/lib/creator-db";
import { generateGiftProposals } from "@/lib/gift-proposals";

// Panneau admin : partage des revenus (créateur % / plateforme %), cadeaux, effets, coffres, validation des propositions, sons.
export async function GET() {
  const access = await getAccess();
  if (!access.isAdmin || !access.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const economy = await getEconomy();
  const [tot, top, chests, sounds, props, recent, platformCoinBalance, payoutRequests, platformMoney, owed, convRequests] = await Promise.all([
    query("select count(*)::int n, coalesce(sum(tokens),0)::int tokens, coalesce(sum(creator_tokens),0)::int creator, coalesce(sum(platform_tokens),0)::int platform from public.gift_transactions"),
    query(`select p.email, sum(g.creator_tokens)::int creator_tokens, count(*)::int n from public.gift_transactions g join public.profiles p on p.id=g.receiver_id group by p.email order by 2 desc limit 10`),
    query("select count(*)::int n, coalesce(sum(reserved_tokens),0)::int reserved, coalesce(sum(refunded_tokens),0)::int refunded, count(*) filter (where status='open')::int open from public.chests"),
    query(`select s.id, s.title, s.status, s.allow_reuse, s.uses_count, p.email from public.sounds s join public.profiles p on p.id=s.owner_id order by s.created_at desc limit 25`),
    query("select id,name,emoji,tokens,source,status,created_at,image_url,animation_url from public.gift_proposals order by (status='pending') desc, created_at desc limit 40"),
    query(`select g.created_at, g.gift_name, g.tokens, g.creator_pct, g.creator_tokens, g.platform_tokens, s.email sender, r.email receiver from public.gift_transactions g join public.profiles s on s.id=g.sender_id join public.profiles r on r.id=g.receiver_id order by g.created_at desc limit 20`),
    query("select coalesce(sum(delta),0)::bigint balance from public.coin_ledger where account_type='platform'"),
    query(`select r.id,r.user_id,r.coins,r.status,r.payout_method,r.payout_destination,r.payout_reference,r.admin_note,r.created_at,p.email from public.creator_payout_requests r join public.profiles p on p.id=r.user_id order by (r.status='pending') desc,r.created_at desc limit 100`),
    query("select coalesce(sum(amount_cents) filter (where kind in ('coin_purchase_platform_share','earned_coin_regift_platform_share','platform_withdrawal')),0)::bigint platform_cents, coalesce(sum(amount_cents) filter (where kind in ('coin_purchase_creator_reserve','creator_payout_paid','creator_reserve_withdrawal')),0)::bigint creator_reserve_cents from public.platform_money_ledger"),
    query("select (select coalesce(sum(delta),0)::bigint from public.coin_ledger where account_type='user' and wallet_type='earnings') earned, (select coalesce(sum(coins),0)::bigint from public.creator_payout_requests where status in ('pending','approved')) unpaid"),
    query("select r.id,r.user_id,r.coins,r.credits,r.status,r.admin_note,r.created_at,p.email from public.credit_conversion_requests r join public.profiles p on p.id=r.user_id order by (r.status='pending') desc, r.created_at desc limit 50"),
  ]);
  return NextResponse.json({ economy, giftTotals: tot.rows[0], topCreators: top.rows, chestTotals: chests.rows[0], sounds: sounds.rows, proposals: props.rows, recentGifts: recent.rows, platformCoinBalance: Number(platformCoinBalance.rows[0]?.balance || 0), platformMoney: { platformCents: Number(platformMoney.rows[0]?.platform_cents || 0), creatorReserveCents: Number(platformMoney.rows[0]?.creator_reserve_cents || 0) }, reserveStats: { earnedCoins: Number(owed.rows[0]?.earned || 0), unpaidRequestCoins: Number(owed.rows[0]?.unpaid || 0), owedCents: Number(owed.rows[0]?.earned || 0) + Number(owed.rows[0]?.unpaid || 0), surplusCents: Number(platformMoney.rows[0]?.creator_reserve_cents || 0) - Number(owed.rows[0]?.earned || 0) - Number(owed.rows[0]?.unpaid || 0) }, payoutRequests: payoutRequests.rows, conversionRequests: convRequests.rows });
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.isAdmin || !access.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("admin-eco:" + clientKey(req, access.user.id), 60, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const actor = { actorId: access.user.id, actorRole: "admin" };
  const current = await getEconomy();

  if (body.action === "saveEconomy") {
    const e = body.economy || {};
    // Les deux pourcentages doivent faire exactement 100 : on refuse toute saisie incohérente au lieu de "corriger" en silence.
    if (e.platformSharePct !== undefined) {
      const sum = Number(e.creatorSharePct) + Number(e.platformSharePct);
      if (!Number.isFinite(sum) || Math.abs(sum - 100) > 0.001) return NextResponse.json({ error: "SUM_NOT_100" }, { status: 400 });
    }
    const pct = Number(e.creatorSharePct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return NextResponse.json({ error: "INVALID_PERCENT" }, { status: 400 });
    const saved = await saveEconomy({ ...current, ...e });
    await auditLog({ ...actor, action: "creator_economy.save", details: { creatorSharePctBefore: current.creatorSharePct, creatorSharePctAfter: saved.creatorSharePct, giftsEnabled: saved.giftsEnabled, liveEnabled: saved.live.enabled } });
    return NextResponse.json({ ok: true, economy: saved });
  }
  if (body.action === "createGift") {
    const name = String(body.name || "").trim().slice(0, 40); const tokens = Math.floor(Number(body.tokens));
    if (!name || !(tokens >= 1)) return NextResponse.json({ error: "INVALID" }, { status: 400 });
    const id = (name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "gift") + "_" + Date.now().toString(36);
    const saved = await saveEconomy({ ...current, gifts: [...current.gifts, { id, name, emoji: String(body.emoji || "🎁").slice(0, 8), tokens, active: true, imageUrl: body.imageUrl, animationUrl: body.animationUrl }] });
    await auditLog({ ...actor, action: "gift.create", targetType: "gift", targetId: id, details: { name, tokens } });
    return NextResponse.json({ ok: true, economy: saved });
  }
  if (body.action === "decideProposal") {
    const id = String(body.id || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const pr = await query("select * from public.gift_proposals where id=$1 and status='pending'", [id]);
    const p = pr.rows[0];
    if (!p) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (body.decision === "approve") {
      const tokens = Math.max(1, Math.floor(Number(body.tokens) || p.tokens));
      const gid = (String(p.name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "gift") + "_" + Date.now().toString(36);
      const proposalImage = body.imageUrl !== undefined ? body.imageUrl : p.image_url;
      const proposalAnimation = body.animationUrl !== undefined ? body.animationUrl : p.animation_url;
      await saveEconomy({ ...current, gifts: [...current.gifts, { id: gid, name: p.name, emoji: p.emoji, tokens, active: true, imageUrl: proposalImage, animationUrl: proposalAnimation }] });
      await query("update public.gift_proposals set status='approved', decided_at=now(), decided_by=$2, tokens=$3, image_url=$4, animation_url=$5 where id=$1", [id, access.user.id, tokens, proposalImage || null, proposalAnimation || null]);
    } else if (body.decision === "reject") {
      await query("update public.gift_proposals set status='rejected', decided_at=now(), decided_by=$2 where id=$1", [id, access.user.id]);
    } else return NextResponse.json({ error: "INVALID" }, { status: 400 });
    await auditLog({ ...actor, action: "gift_proposal." + body.decision, targetType: "gift_proposal", targetId: id });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "generateProposals") {
    try { const n = await generateGiftProposals(); await auditLog({ ...actor, action: "gift_proposal.generate", details: { created: n } }); return NextResponse.json({ ok: true, created: n }); }
    catch (e: any) { return NextResponse.json({ error: "LLM_UNAVAILABLE", message: String(e?.message || e).slice(0, 200) }, { status: 502 }); }
  }
  if (body.action === "recordPlatformWithdrawal") {
    const amountCents = Math.round(Number(body.amountEur) * 100);
    const reference = String(body.reference || "").trim().slice(0,160);
    if (!Number.isSafeInteger(amountCents) || amountCents < 1 || !reference) return NextResponse.json({ error: "INVALID_WITHDRAWAL" }, { status: 400 });
    const balance = await query("select coalesce(sum(amount_cents),0)::bigint cents from public.platform_money_ledger where kind in ('coin_purchase_platform_share','earned_coin_regift_platform_share','platform_withdrawal')");
    if (Number(balance.rows[0]?.cents || 0) < amountCents) return NextResponse.json({ error: "INSUFFICIENT_PLATFORM_BALANCE" }, { status: 400 });
    const key = "platform_withdrawal:" + crypto.randomUUID();
    await query("insert into public.platform_money_ledger(amount_cents,currency,kind,entry_key,reference_id,note) values($1,'EUR','platform_withdrawal',$2,$3,$4)", [-amountCents, key, reference, String(body.note || "Virement sortant effectué manuellement hors du site").slice(0,300)]);
    await auditLog({ ...actor, action: "platform_cash.withdrawal_recorded", details: { amountEur: amountCents / 100, reference } });
    return NextResponse.json({ ok: true, message: "Retrait enregistré dans la comptabilité. Le virement bancaire doit être effectué séparément." });
  }
  if (body.action === "reserveWithdrawal") {
    // L'admin retire de l'argent de la réserve créateurs (écriture comptable ; le vrai virement se fait hors du site).
    const amountCents = Math.round(Number(body.amountEur) * 100);
    const reference = String(body.reference || "").trim().slice(0, 160);
    if (!Number.isSafeInteger(amountCents) || amountCents < 1 || !reference) return NextResponse.json({ error: "INVALID_WITHDRAWAL" }, { status: 400 });
    const out = await withTransaction(async (c) => {
      await c.query("select pg_advisory_xact_lock(hashtext('platform-reserve'))");
      const r = await c.query("select coalesce(sum(amount_cents),0)::bigint cents from public.platform_money_ledger where kind in ('coin_purchase_creator_reserve','creator_payout_paid','creator_reserve_withdrawal')");
      const o = await c.query("select (select coalesce(sum(delta),0)::bigint from public.coin_ledger where account_type='user' and wallet_type='earnings') earned, (select coalesce(sum(coins),0)::bigint from public.creator_payout_requests where status in ('pending','approved')) unpaid");
      const reserve = Number(r.rows[0]?.cents || 0);
      const owedCents = Number(o.rows[0]?.earned || 0) + Number(o.rows[0]?.unpaid || 0);
      const surplus = reserve - owedCents;
      if (amountCents > reserve) return { error: "INSUFFICIENT_RESERVE", reserve, surplus };
      const forced = amountCents > surplus;
      // Au-delà du surplus, la réserve ne couvrirait plus tous les gains des créateurs : confirmation écrite obligatoire.
      if (forced && String(body.confirm || "") !== "FORCER") return { error: "RESERVE_WOULD_BE_UNDERFUNDED", reserve, surplus };
      await c.query("insert into public.platform_money_ledger(amount_cents,currency,kind,entry_key,reference_id,note) values($1,'EUR','creator_reserve_withdrawal',$2,$3,$4)",
        [-amountCents, "creator_reserve_withdrawal:" + crypto.randomUUID(), reference, String(body.note || "Retrait de la réserve créateurs par l'administrateur").slice(0, 300)]);
      return { ok: true, forced, reserveAfter: reserve - amountCents };
    });
    if ((out as any).error) return NextResponse.json(out, { status: 400 });
    await auditLog({ ...actor, action: "creator_reserve.withdrawal", details: { amountEur: amountCents / 100, reference, forced: (out as any).forced } });
    return NextResponse.json({ ok: true, ...out, message: "Retrait de la réserve enregistré. Le virement réel doit être fait séparément." });
  }
  if (body.action === "decideConversion") {
    const id = String(body.id || "");
    const decision = String(body.decision || "");
    if (!/^[0-9a-f-]{36}$/i.test(id) || !["approve", "reject"].includes(decision)) return NextResponse.json({ error: "INVALID" }, { status: 400 });
    const out = await withTransaction(async (c) => {
      const f = await c.query("select * from public.credit_conversion_requests where id=$1 for update", [id]);
      const r = f.rows[0];
      if (!r) return { error: "NOT_FOUND", status: 404 };
      if (r.status !== "pending") return { error: "INVALID_STATUS", status: 409 };
      if (decision === "approve") {
        await c.query("select public.add_hour_credits($1,$2)", [r.user_id, Number(r.seconds)]);
        await c.query("update public.credit_conversion_requests set status='approved', admin_note=$2, decided_by=$3, updated_at=now() where id=$1", [id, String(body.note || "Conversion validée").slice(0, 300), access.user!.id]);
      } else {
        await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note)
          values ('user','earnings',$1,$2,'conversion_refund',$3,$4,'Conversion refusée : pièces rendues') on conflict (entry_key) do nothing`, [r.user_id, Number(r.coins), "conversion_refund:" + id, id]);
        await c.query("update public.credit_conversion_requests set status='rejected', admin_note=$2, decided_by=$3, updated_at=now() where id=$1", [id, String(body.note || "Conversion refusée").slice(0, 300), access.user!.id]);
      }
      return { ok: true };
    });
    if ((out as any).error) return NextResponse.json({ error: (out as any).error }, { status: (out as any).status });
    await auditLog({ ...actor, action: "credit_conversion." + decision, targetType: "credit_conversion_request", targetId: id });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "decidePayout") {
    const id = String(body.id || "");
    const decision = String(body.decision || "");
    if (!/^[0-9a-f-]{36}$/i.test(id) || !["approve", "reject", "paid"].includes(decision)) return NextResponse.json({ error: "INVALID" }, { status: 400 });
    const result = await query("select * from public.creator_payout_requests where id=$1", [id]);
    const payout = result.rows[0];
    if (!payout) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (decision === "reject") {
      if (payout.status !== "pending" && payout.status !== "approved") return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
      await withTransaction(async (c) => {
        await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note) values ('user','earnings',$1,$2,'payout_refund',$3,$4,$5) on conflict (entry_key) do nothing`, [payout.user_id, Number(payout.coins), "payout_refund:" + id, id, String(body.note || "Demande refusée")]);
        await c.query("update public.creator_payout_requests set status='rejected',admin_note=$2,decided_by=$3,updated_at=now() where id=$1", [id, String(body.note || "Demande refusée").slice(0,300), access.user.id]);
      });
    } else if (decision === "approve") {
      if (payout.status !== "pending") return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
      await query("update public.creator_payout_requests set status='approved',admin_note=$2,decided_by=$3,updated_at=now() where id=$1", [id, String(body.note || "Approuvé, paiement à effectuer manuellement").slice(0,300), access.user.id]);
    } else {
      if (payout.status !== "approved") return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
      const ref = String(body.payoutReference || "").trim().slice(0,160);
      if (!ref) return NextResponse.json({ error: "PAYOUT_REFERENCE_REQUIRED" }, { status: 400 });
      const reserve = await query("select coalesce(sum(amount_cents),0)::bigint cents from public.platform_money_ledger where kind in ('coin_purchase_creator_reserve','creator_payout_paid','creator_reserve_withdrawal')");
      if (Number(reserve.rows[0]?.cents || 0) < Number(payout.coins)) return NextResponse.json({ error: "INSUFFICIENT_CREATOR_RESERVE" }, { status: 409 });
      await query("insert into public.platform_money_ledger(amount_cents,currency,kind,entry_key,reference_id,note) values($1,'EUR','creator_payout_paid',$2,$3,$4) on conflict (entry_key) do nothing", [-Number(payout.coins), "creator_payout_cash:" + id, id, "Retrait créateur marqué payé; valeur comptable 1 pièce = 0,01 EUR"]);
      await query("update public.creator_payout_requests set status='paid',payout_reference=$2,admin_note=$3,decided_by=$4,updated_at=now() where id=$1", [id, ref, String(body.note || "Paiement effectué manuellement").slice(0,300), access.user.id]);
    }
    await auditLog({ ...actor, action: "creator_payout." + decision, targetType: "creator_payout_request", targetId: id });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "setSoundStatus") {
    const id = String(body.id || ""); const status = String(body.status || "");
    if (!/^[0-9a-f-]{36}$/i.test(id) || !["active", "hidden", "removed"].includes(status)) return NextResponse.json({ error: "INVALID" }, { status: 400 });
    await query("update public.sounds set status=$2 where id=$1", [id, status]);
    await auditLog({ ...actor, action: "sound.status", targetType: "sound", targetId: id, details: { status } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}
