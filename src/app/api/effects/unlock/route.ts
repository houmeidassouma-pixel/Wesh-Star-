import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { getEconomy, withTransaction } from "@/lib/creator-db";
import { tokensToSeconds, TOKEN_SECONDS } from "@/lib/creator-economy";

// Achat définitif d'un effet payant avec des jetons. Déjà débloqué => aucun débit.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("unlock:" + clientKey(req, access.user.id), 20, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const eco = await getEconomy();
  const eff = eco.effects.find((e) => e.id === String(body.effectId || "") && e.active);
  if (!eff) return NextResponse.json({ error: "EFFECT_UNAVAILABLE" }, { status: 400 });
  if (eff.tier === "free") return NextResponse.json({ ok: true, free: true });
  const uid = access.user.id;
  try {
    const out = await withTransaction(async (c) => {
      const ex = await c.query("select 1 from public.effect_unlocks where user_id=$1 and effect_id=$2", [uid, eff.id]);
      if (ex.rows.length) { const b = await c.query("select hour_credits_seconds s from public.profiles where id=$1", [uid]); return { already: true, balance: Math.floor(Number(b.rows[0]?.s || 0) / TOKEN_SECONDS) }; }
      const d = await c.query("update public.profiles set hour_credits_seconds = hour_credits_seconds - $1 where id=$2 and hour_credits_seconds >= $1 returning hour_credits_seconds", [tokensToSeconds(eff.tokens), uid]);
      if (!d.rows.length) throw Object.assign(new Error("INSUFFICIENT_TOKENS"), { code: 402 });
      await c.query("insert into public.effect_unlocks (user_id,effect_id,tokens_paid) values ($1,$2,$3)", [uid, eff.id, eff.tokens]);
      return { already: false, balance: Math.floor(Number(d.rows[0].hour_credits_seconds) / TOKEN_SECONDS) };
    });
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    if (e?.code === 402) return NextResponse.json({ error: e.message }, { status: 402 });
    console.error("[effect-unlock]", e?.message || e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
