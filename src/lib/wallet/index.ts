import { query, withTransaction } from "@/lib/db/pool";

// Portefeuille FCFA interne par utilisateur. Solde = somme des écritures.
// Les montants saisis par l'admin ne sont adossés à aucun dépôt réel : ils ne
// sont donc PAS retirables en argent réel (aucun lien avec les virements de la trésorerie).
const LOCK_KEY = 7770002;
const MAX_AMOUNT = 100_000_000;

async function findUser(c: { query: Function }, email: string) {
  const r = await c.query("select id, email from public.profiles where lower(email)=lower($1)", [String(email || "").trim()]);
  if (!r.rows.length) throw new Error("Utilisateur introuvable : " + email);
  return r.rows[0] as { id: string; email: string };
}
function cleanAmount(v: any) {
  const n = Math.floor(Number(v));
  if (!(n >= 1) || n > MAX_AMOUNT) throw new Error("Montant invalide (1 à 100 000 000 FCFA)");
  return n;
}
function cleanReason(v: any) {
  const s = String(v || "").trim();
  if (s.length < 3) throw new Error("Un motif est obligatoire");
  return s.slice(0, 300);
}

export async function walletBalance(c: { query: Function }, userId: string) {
  const r = await c.query("select coalesce(sum(amount),0) t from public.wallet_ledger where user_id=$1", [userId]);
  return Number(r.rows[0].t);
}

export async function adminAdjust(opts: { email: string; amount: number; direction: "credit" | "debit"; reason: string; adminId: string }) {
  const amount = cleanAmount(opts.amount); const reason = cleanReason(opts.reason);
  return withTransaction(async (c) => {
    await c.query("select pg_advisory_xact_lock($1)", [LOCK_KEY]);
    const u = await findUser(c, opts.email);
    if (opts.direction === "debit" && (await walletBalance(c, u.id)) < amount) throw new Error("Solde insuffisant");
    await c.query(`insert into public.wallet_ledger (user_id,kind,amount,reason,created_by) values ($1,$2,$3,$4,$5)`,
      [u.id, opts.direction === "credit" ? "admin_credit" : "admin_debit", opts.direction === "credit" ? amount : -amount, reason, opts.adminId]);
    return { email: u.email, balance: await walletBalance(c, u.id) };
  });
}

export async function adminTransfer(opts: { fromEmail: string; toEmail: string; amount: number; reason: string; adminId: string }) {
  const amount = cleanAmount(opts.amount); const reason = cleanReason(opts.reason);
  return withTransaction(async (c) => {
    await c.query("select pg_advisory_xact_lock($1)", [LOCK_KEY]);
    const from = await findUser(c, opts.fromEmail); const to = await findUser(c, opts.toEmail);
    if (from.id === to.id) throw new Error("Expéditeur et destinataire identiques");
    if ((await walletBalance(c, from.id)) < amount) throw new Error("Solde insuffisant chez l'expéditeur");
    const g = (await c.query("select gen_random_uuid() id")).rows[0].id;
    await c.query(`insert into public.wallet_ledger (user_id,kind,amount,counterparty_id,transfer_group,reason,created_by) values ($1,'transfer_out',$2,$3,$4,$5,$6)`, [from.id, -amount, to.id, g, reason, opts.adminId]);
    await c.query(`insert into public.wallet_ledger (user_id,kind,amount,counterparty_id,transfer_group,reason,created_by) values ($1,'transfer_in',$2,$3,$4,$5,$6)`, [to.id, amount, from.id, g, reason, opts.adminId]);
    return { from: from.email, to: to.email, fromBalance: await walletBalance(c, from.id), toBalance: await walletBalance(c, to.id) };
  });
}

export async function listWallets() {
  const r = await query(`select p.email, coalesce(sum(w.amount),0) as balance, max(w.created_at) as last_at
    from public.wallet_ledger w join public.profiles p on p.id=w.user_id group by p.email order by max(w.created_at) desc limit 200`);
  return r.rows;
}
export async function listWalletEntries(limit = 100) {
  const r = await query(`select w.*, p.email, cp.email as counterparty_email, a.email as admin_email
    from public.wallet_ledger w join public.profiles p on p.id=w.user_id
    left join public.profiles cp on cp.id=w.counterparty_id left join public.profiles a on a.id=w.created_by
    order by w.created_at desc limit $1`, [limit]);
  return r.rows;
}
