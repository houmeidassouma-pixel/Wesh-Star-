

export const PRESENCE_WINDOW_SECONDS = 60; // un participant est "présent" s'il a envoyé un signal dans les 60 dernières secondes

type Q = { query: Function };

// Ferme un coffre ouvert et rend les parts non réclamées dans le portefeuille de pièces.
// Idempotent : un coffre déjà fermé ne rend rien (pas de double remboursement possible).
// force=false : ne ferme que si expiré ou si le LIVE est terminé.
export async function settleChest(c: Q, chestId: string, force = false): Promise<{ closed: boolean; refunded: number }> {
  const r = await c.query(
    `select ch.*, (ch.expires_at <= now()) as expired, s.status as session_status
       from public.chests ch join public.live_sessions s on s.id = ch.session_id
      where ch.id = $1 for update of ch`, [chestId]);
  const ch = r.rows[0];
  if (!ch || ch.status !== "open") return { closed: false, refunded: 0 };
  if (!(force || ch.expired || ch.session_status !== "live")) return { closed: false, refunded: 0 };
  const refund = Math.max(0, ch.max_claimants - ch.claimed_count) * ch.share_tokens;
  if (refund > 0) {
    // Reverse the most recently consumed wallet category first (earned, then purchased), preserving non-withdrawable purchase coins.
    const earnedRefund = Math.min(refund, Number(ch.debited_earned_coins || 0));
    const purchasedRefund = Math.min(refund - earnedRefund, Number(ch.debited_purchased_coins || 0));
    if (earnedRefund > 0) await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note)
      values ('user','earnings',$1,$2,'chest_refund',$3,$4,$5) on conflict (entry_key) do nothing`, [ch.depositor_id, earnedRefund, `chest:${chestId}:refund:earnings`, chestId, 'Remboursement des parts de coffre non réclamées']);
    if (purchasedRefund > 0) await c.query(`insert into public.coin_ledger (account_type,wallet_type,user_id,delta,kind,entry_key,reference_id,note)
      values ('user','coins',$1,$2,'chest_refund',$3,$4,$5) on conflict (entry_key) do nothing`, [ch.depositor_id, purchasedRefund, `chest:${chestId}:refund:coins`, chestId, 'Remboursement des parts de coffre non réclamées']);
  }
  await c.query("update public.chests set status='closed', refunded_tokens=$2, closed_at=now() where id=$1", [chestId, refund]);
  return { closed: true, refunded: refund };
}

// Ferme tous les coffres arrivés à expiration ou appartenant à un LIVE terminé (appelé avant lecture d'état).
export async function settleDueChests(c: Q, sessionId: string) {
  const r = await c.query(
    `select ch.id from public.chests ch join public.live_sessions s on s.id=ch.session_id
      where ch.session_id=$1 and ch.status='open' and (ch.expires_at <= now() or s.status <> 'live')`, [sessionId]);
  for (const row of r.rows) await settleChest(c, row.id, false);
}
