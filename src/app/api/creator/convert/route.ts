import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { withTransaction } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { getEconomy } from "@/lib/creator-db";
import { convertCoinsToCredits } from "@/lib/creator-economy";

// Demande de conversion : le créateur échange des pièces GAGNÉES (cadeaux reçus) contre des crédits vidéo IA.
// Les pièces sont réservées tout de suite ; l'admin valide (crédits ajoutés) ou refuse (pièces rendues).
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("creator-convert:" + clientKey(req, access.user.id), 5, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const eco = await getEconomy();
  if (!eco.conversion.enabled) return NextResponse.json({ error: "CONVERSION_DISABLED" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  let conv;
  try { conv = convertCoinsToCredits(Number(body.coins), eco.conversion.creditsPer100Coins); }
  catch { return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 }); }
  if (conv.coins < eco.conversion.minCoins) return NextResponse.json({ error: "MIN_NOT_REACHED", minCoins: eco.conversion.minCoins }, { status: 400 });
  if (conv.credits < 1) return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 });
  try {
    const result = await withTransaction(async (c) => {
      await c.query("select pg_advisory_xact_lock(hashtext($1))", ["coin-wallet:" + access.user!.id]);
      const open = await c.query("select count(*)::int n from public.credit_conversion_requests where user_id=$1 and status='pending'", [access.user!.id]);
      if (Number(open.rows[0]?.n || 0) >= 1) throw Object.assign(new Error("CONVERSION_ALREADY_PENDING"), { code: 409 });
      const b = await c.query("select coalesce(sum(delta),0)::bigint balance from public.coin_ledger where account_type='user' and wallet_type='earnings' and user_id=$1", [access.user!.id]);
      if (Number(b.rows[0]?.balance || 0) < conv.coins) throw Object.assign(new Error("INSUFFICIENT_EARNINGS"), { code: 402 });
      const r = await c.query("insert into public.credit_conversion_requests (user_id,coins,credits,seconds) values ($1,$2,$3,$4) returning id", [access.user!.id, conv.coins, conv.credits, conv.seconds]);
      const id = String(r.rows[0].id);
      await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note)
        values ('user','earnings',$1,$2,'conversion_reserve',$3,$4,'Réservation pour conversion en crédits vidéo')`, [access.user!.id, -conv.coins, "conversion:" + id, id]);
      return { id, coins: conv.coins, credits: conv.credits };
    });
    return NextResponse.json({ ok: true, ...result, message: "Demande envoyée. Les crédits seront ajoutés après validation par l’administration." });
  } catch (e: any) {
    if (e?.code === 409 || e?.code === 402) return NextResponse.json({ error: e.message }, { status: e.code });
    console.error("[creator-convert]", e?.message || e);
    return NextResponse.json({ error: "CONVERSION_FAILED" }, { status: 500 });
  }
}
