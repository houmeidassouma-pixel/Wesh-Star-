import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { getEconomy, tokenBalance, unlockedEffects } from "@/lib/creator-db";

// Configuration publique + état de l'utilisateur connecté (jetons, effets débloqués, gains cadeaux).
export async function GET() {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const eco = await getEconomy();
  const [tokens, unlocked, earn, coins, conv] = await Promise.all([
    tokenBalance(access.user.id),
    unlockedEffects(access.user.id),
    query("select coalesce(sum(creator_tokens),0)::int t from public.gift_transactions where receiver_id=$1", [access.user.id]),
    query("select wallet_type, coalesce(sum(delta),0)::bigint balance from public.coin_ledger where account_type='user' and user_id=$1 group by wallet_type", [access.user.id]),
    query("select id,coins,credits,status,admin_note,created_at from public.credit_conversion_requests where user_id=$1 order by created_at desc limit 5", [access.user.id]),
  ]);
  const coinRows: Record<string, number> = { coins: 0, earnings: 0 };
  for (const row of coins.rows) coinRows[String(row.wallet_type)] = Number(row.balance || 0);
  const configuredMin = Number(process.env.WESH_CREATOR_PAYOUT_MIN_EUR || 10);
  const minPayoutEur = Math.min(15, Math.max(10, Number.isFinite(configuredMin) ? configuredMin : 10));
  return NextResponse.json({
    minPayoutEur, minPayoutCoins: Math.round(minPayoutEur * 100),
    giftsEnabled: eco.giftsEnabled, soundsEnabled: eco.soundsEnabled, creatorSharePct: eco.creatorSharePct,
    gifts: eco.gifts.filter((g) => g.active), coinPacks: eco.coinPacks.filter((p) => p.active), coins: coinRows.coins + coinRows.earnings, purchasedCoins: coinRows.coins, earnedCoins: coinRows.earnings, effects: eco.effects.filter((e) => e.active), autoEdit: eco.autoEdit,
    live: { enabled: eco.live.enabled, chests: eco.chests },
    tokens, unlocked, staff: access.isAdmin || access.isModerator,
    giftEarningsTokens: Number(earn.rows[0]?.t || 0),
    payoutsEnabled: eco.payouts.enabled,
    conversion: eco.conversion,
    conversionRequests: conv.rows,
  });
}
