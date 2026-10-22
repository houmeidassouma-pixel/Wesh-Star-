import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query, withTransaction } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";

// The admin records net ad revenue after it has actually been received from the ad partner.
// The creator pool is allocated by qualified public video views during the selected period.
export async function GET() {
  const access = await getAccess();
  if (!access.isAdmin || !access.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [periods, totals] = await Promise.all([
    query(`select p.id,p.period_start,p.period_end,p.net_revenue_cents,p.creator_share_pct,p.creator_pool_cents,p.source_reference,p.created_at,coalesce(sum(a.amount_cents),0)::bigint allocated_cents,count(a.id)::int creators_paid from creator_ad_revenue_periods p left join creator_ad_revenue_allocations a on a.period_id=p.id group by p.id order by p.created_at desc limit 30`),
    query(`select coalesce(sum(net_revenue_cents),0)::bigint net_revenue_cents,coalesce(sum(creator_pool_cents),0)::bigint creator_pool_cents from creator_ad_revenue_periods`)
  ]);
  return NextResponse.json({ periods: periods.rows, totals: totals.rows[0] || { net_revenue_cents: 0, creator_pool_cents: 0 } }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.isAdmin || !access.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("admin-creator-ad-revenue:" + clientKey(req, access.user.id), 10, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const start = String(body.periodStart || "");
  const end = String(body.periodEnd || "");
  const netRevenueCents = Math.round(Number(body.netRevenueEur) * 100);
  const sharePct = Number(body.creatorSharePct);
  const reference = String(body.sourceReference || "").trim().slice(0, 160);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return NextResponse.json({ error: "INVALID_PERIOD" }, { status: 400 });
  if (!Number.isSafeInteger(netRevenueCents) || netRevenueCents < 0 || netRevenueCents > 100_000_000_00) return NextResponse.json({ error: "INVALID_REVENUE" }, { status: 400 });
  if (!Number.isInteger(sharePct) || sharePct < 0 || sharePct > 100 || reference.length < 3) return NextResponse.json({ error: "INVALID_SHARE_OR_REFERENCE" }, { status: 400 });
  try {
    const result = await withTransaction(async c => {
      await c.query("select pg_advisory_xact_lock(hashtext($1))", [`creator-ad-revenue:${start}:${end}`]);
      const exists = await c.query("select id from creator_ad_revenue_periods where period_start=$1::date and period_end=$2::date", [start, end]);
      if (exists.rows[0]) throw Object.assign(new Error("PERIOD_ALREADY_RECORDED"), { code: "DUPLICATE" });
      const poolCents = Math.floor(netRevenueCents * sharePct / 100);
      const inserted = await c.query(`insert into creator_ad_revenue_periods(period_start,period_end,net_revenue_cents,creator_share_pct,creator_pool_cents,source_reference,created_by) values($1::date,$2::date,$3,$4,$5,$6,$7) returning id`, [start,end,netRevenueCents,sharePct,poolCents,reference,access.user!.id]);
      const periodId = String(inserted.rows[0].id);
      const eligible = await c.query(`select v.creator_id,count(*)::bigint views from creator_video_views v join community_posts p on p.id=v.post_id join profiles pr on pr.id=v.creator_id where v.qualified_at >= $1::date and v.qualified_at < ($2::date + interval '1 day') and p.status='published' and p.visibility='public' and pr.creator_monetization_status='approved' and coalesce(pr.blocked,false)=false group by v.creator_id`, [start,end]);
      const totalViews = eligible.rows.reduce((s:any,r:any)=>s+Number(r.views||0),0);
      let allocatedCents = 0;
      let creatorCount = 0;
      if (poolCents > 0 && totalViews > 0) {
        for (const row of eligible.rows) {
          const views = Number(row.views || 0);
          const amount = Math.floor(poolCents * views / totalViews);
          if (amount <= 0) continue;
          const allocation = await c.query(`insert into creator_ad_revenue_allocations(period_id,creator_id,qualified_views,amount_cents) values($1,$2,$3,$4) on conflict(period_id,creator_id) do nothing returning id`, [periodId,row.creator_id,views,amount]);
          if (!allocation.rows[0]) continue;
          // Existing payout flow values 100 earnings coins as EUR 1.00. This entry is idempotent.
          await c.query(`insert into coin_ledger(account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note) values('user','earnings',$1,$2,'ad_revenue_share',$3,$4,$5)`, [row.creator_id,amount,`ad-revenue:${periodId}:${row.creator_id}`,periodId,`Part des revenus publicitaires nets, période ${start} à ${end}`]);
          allocatedCents += amount; creatorCount++;
        }
      }
      return { periodId, netRevenueEur: netRevenueCents / 100, creatorPoolEur: poolCents / 100, allocatedEur: allocatedCents / 100, eligibleCreators: creatorCount, totalQualifiedViews: totalViews, unallocatedPoolEur: (poolCents - allocatedCents) / 100 };
    });
    return NextResponse.json({ ok: true, ...result, message: "Répartition enregistrée. Le paiement bancaire/mobile des retraits reste une opération séparée à valider." });
  } catch (e: any) {
    if (e?.code === "DUPLICATE") return NextResponse.json({ error: "PERIOD_ALREADY_RECORDED", message: "Cette période a déjà été traitée. Aucun double crédit n’a été effectué." }, { status: 409 });
    console.error("[creator-ad-revenue]", e?.message || e);
    return NextResponse.json({ error: "ALLOCATION_FAILED" }, { status: 500 });
  }
}
