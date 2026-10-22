import { query, withTransaction } from "@/lib/db/pool";
import { payoutViaProvider } from "./payout";

// Registre de trésorerie Wesh Star : un solde FCFA (XOF) central + un solde EUR.
// IMPORTANT : ce sont des soldes COMPTABLES. L'argent réel se trouve chez
// l'opérateur / la banque ; le registre sert à le suivre et à piloter les
// virements sortants.
export type Cur = "XOF" | "EUR";
const LOCK_KEY = 7770001;
export const xofPerEur = () => Number(process.env.WESH_XOF_PER_EUR) || 655.957;

export async function getBalances() {
  const r = await query(
    "select currency, coalesce(sum(amount),0) as total from public.treasury_ledger where status in ('pending','completed') group by currency");
  const out: Record<Cur, number> = { XOF: 0, EUR: 0 };
  for (const row of r.rows) out[row.currency as Cur] = Number(row.total);
  return out;
}

export async function listEntries(limit = 100) {
  const r = await query("select * from public.treasury_ledger order by created_at desc limit $1", [limit]);
  return r.rows;
}

// Crédite le solde XOF pour un paiement confirmé (idempotent).
export async function creditXofFromPayment(paymentId: string, amountEur: number, adminId: string) {
  const rate = xofPerEur();
  const xof = Math.round(Number(amountEur) * rate);
  if (!(xof > 0)) return { credited: 0 };
  const r = await query(
    `insert into public.treasury_ledger (kind,currency,amount,payment_request_id,rate,created_by,note)
     values ('payment_in','XOF',$1,$2,$3,$4,'Paiement Mobile Money confirmé')
     on conflict (payment_request_id) where kind = 'payment_in' do nothing returning id`,
    [xof, paymentId, rate, adminId]);
  return { credited: r.rows.length ? xof : 0 };
}

const PHONE = /^\+?[0-9]{8,15}$/;
const ACCOUNT = /^[A-Za-z0-9]{8,34}$/; // IBAN, RIB ou numéro de compte (espaces et tirets retirés)

export type Operator = "mtn" | "moov" | "autre" | "banque";
export const OPERATORS: Operator[] = ["mtn", "moov", "autre", "banque"];

const cleanPhone = (v: unknown) => String(v || "").replace(/[\s.-]/g, "");
const cleanAccount = (v: unknown) => String(v || "").replace(/[\s-]/g, "").toUpperCase();

export async function listBeneficiaries() {
  const r = await query("select id,label,name,operator,phone,account from public.treasury_beneficiaries where active order by created_at desc limit 200");
  return r.rows;
}

export async function addBeneficiary(opts: { label?: string; name?: string; phone?: string; account?: string; operator: Operator; adminId: string }) {
  const name = String(opts.name || "").trim().slice(0, 80);
  if (opts.operator === "banque") {
    const account = cleanAccount(opts.account);
    if (!ACCOUNT.test(account)) throw new Error("Compte bancaire invalide (IBAN, RIB ou numéro de compte : 8 à 34 caractères)");
    const label = String(opts.label || name || account).trim().slice(0, 80);
    const r = await query(
      `insert into public.treasury_beneficiaries (label,name,operator,account,created_by) values ($1,$2,'banque',$3,$4)
       on conflict (account, operator) where account is not null do update set label=excluded.label, name=excluded.name, active=true returning id`,
      [label, name || null, account, opts.adminId]);
    return { id: r.rows[0].id as string };
  }
  const phone = cleanPhone(opts.phone);
  if (!PHONE.test(phone)) throw new Error("Numéro de destination invalide");
  const label = String(opts.label || name || phone).trim().slice(0, 80);
  const r = await query(
    `insert into public.treasury_beneficiaries (label,name,operator,phone,created_by) values ($1,$2,$3,$4,$5)
     on conflict (phone, operator) do update set label=excluded.label, name=excluded.name, active=true returning id`,
    [label, name || null, opts.operator, phone, opts.adminId]);
  return { id: r.rows[0].id as string };
}

export async function removeBeneficiary(id: string) {
  const r = await query("update public.treasury_beneficiaries set active=false where id=$1 and active returning id", [id]);
  if (!r.rows.length) throw new Error("Bénéficiaire introuvable");
}

// Encaissements FCFA par origine (crédits vidéo, pièces, abonnements), pour que l'admin voie d'où vient l'argent.
export async function getIncomeBySource() {
  const r = await query(
    `select case when source='coin_purchase' then 'coins' when source='subscription' then 'subscription' else 'packs' end as src,
            coalesce(sum(amount),0) as total
       from public.treasury_ledger where kind='payment_in' and currency='XOF' and status='completed' group by 1`);
  const out = { coins: 0, subscription: 0, packs: 0 };
  for (const row of r.rows) (out as any)[row.src] = Number(row.total);
  return out;
}

export async function createPayout(opts: { amount: number; phone?: string; account?: string; operator?: Operator; name?: string; beneficiaryId?: string; adminId: string }) {
  const amount = Math.floor(Number(opts.amount));
  let rawPhone = String(opts.phone || ""), rawAccount = String(opts.account || ""), operator: Operator = opts.operator || "autre", name = opts.name || "";
  if (opts.beneficiaryId) {
    const b = await query("select name,operator,phone,account from public.treasury_beneficiaries where id=$1 and active", [opts.beneficiaryId]);
    if (!b.rows.length) throw new Error("Bénéficiaire introuvable");
    rawPhone = b.rows[0].phone || ""; rawAccount = b.rows[0].account || ""; operator = b.rows[0].operator; name = b.rows[0].name || "";
  }
  const phone = cleanPhone(rawPhone);
  const account = cleanAccount(rawAccount);
  if (!(amount >= 100)) throw new Error("Montant minimum : 100 FCFA");
  if (operator === "banque") { if (!ACCOUNT.test(account)) throw new Error("Compte bancaire invalide"); }
  else if (!PHONE.test(phone)) throw new Error("Numéro de destination invalide");
  const destination = operator === "banque"
    ? { account, operator, name: name.slice(0, 80) }
    : { phone, operator, name: name.slice(0, 80) };

  // 1) Réserver le montant (débit en attente) de façon atomique.
  const entry = await withTransaction(async (c) => {
    await c.query("select pg_advisory_xact_lock($1)", [LOCK_KEY]);
    const b = await c.query("select coalesce(sum(amount),0) t from public.treasury_ledger where currency='XOF' and status in ('pending','completed')");
    if (Number(b.rows[0].t) < amount) throw new Error("Solde FCFA insuffisant");
    const ins = await c.query(
      `insert into public.treasury_ledger (kind,currency,amount,status,destination,provider,created_by,note)
       values ('payout','XOF',$1,'pending',$2,$3,$4,'Virement sortant') returning *`,
      [-amount, JSON.stringify(destination), process.env.WESH_PAYOUT_PROVIDER || "manual", opts.adminId]);
    return ins.rows[0];
  });

  // 2) Envoyer via le prestataire configuré (hors transaction).
  try {
    const res = await payoutViaProvider({ amount, destination, ledgerId: entry.id });
    await query("update public.treasury_ledger set status=$1, provider_ref=$2, updated_at=now() where id=$3",
      [res.status, res.providerRef || null, entry.id]);
    return { id: entry.id, status: res.status, message: res.message };
  } catch (e: any) {
    await query("update public.treasury_ledger set status='failed', note=$1, updated_at=now() where id=$2", [String(e?.message || e).slice(0, 300), entry.id]);
    throw new Error("Virement échoué, montant restitué au solde : " + (e?.message || e));
  }
}

// Validation manuelle (mode "manual") : l'admin confirme ou annule un virement en attente.
export async function settlePayout(id: string, status: "completed" | "failed") {
  const r = await query(
    "update public.treasury_ledger set status=$1, updated_at=now() where id=$2 and kind='payout' and status='pending' returning id", [status, id]);
  if (!r.rows.length) throw new Error("Virement introuvable ou déjà traité");
}

// Conversion interne XOF -> EUR au taux fixe officiel (655,957 FCFA = 1 EUR).
export async function convertXofToEur(opts: { amountXof?: number; all?: boolean; adminId: string }) {
  const rate = xofPerEur();
  return withTransaction(async (c) => {
    await c.query("select pg_advisory_xact_lock($1)", [LOCK_KEY]);
    const b = await c.query("select coalesce(sum(amount),0) t from public.treasury_ledger where currency='XOF' and status in ('pending','completed')");
    const balance = Number(b.rows[0].t);
    const xof = opts.all ? Math.floor(balance) : Math.floor(Number(opts.amountXof));
    if (!(xof >= 100)) throw new Error("Montant minimum : 100 FCFA");
    if (xof > balance) throw new Error("Solde FCFA insuffisant");
    const eur = Math.round((xof / rate) * 100) / 100;
    if (!(eur > 0)) throw new Error("Montant trop faible");
    const g = await c.query("select gen_random_uuid() id");
    const group = g.rows[0].id;
    await c.query(`insert into public.treasury_ledger (kind,currency,amount,fx_group,rate,created_by,note) values ('fx_out','XOF',$1,$2,$3,$4,'Conversion XOF → EUR')`, [-xof, group, rate, opts.adminId]);
    await c.query(`insert into public.treasury_ledger (kind,currency,amount,fx_group,rate,created_by,note) values ('fx_in','EUR',$1,$2,$3,$4,'Conversion XOF → EUR')`, [eur, group, rate, opts.adminId]);
    return { xof, eur, rate };
  });
}
