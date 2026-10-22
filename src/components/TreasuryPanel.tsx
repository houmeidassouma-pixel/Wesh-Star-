"use client";
import { useEffect, useState } from "react";

const fmt = (n: number, c: string) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + (c === "XOF" ? " FCFA" : " €");
const KIND: Record<string, string> = { payment_in: "Encaissement", payout: "Virement sortant", fx_out: "Conversion (sortie)", fx_in: "Conversion (entrée)", adjustment: "Ajustement" };

export default function TreasuryPanel() {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [pay, setPay] = useState({ amount: "", phone: "", account: "", operator: "mtn", name: "", beneficiaryId: "", save: false });
  const [conv, setConv] = useState("");

  const load = () => fetch("/api/admin/treasury").then(r => r.json()).then(setD);
  useEffect(() => { load(); }, []);
  const post = async (body: any) => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/treasury", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? (j.message || "✅ Opération enregistrée") : "❌ " + (j.error || "Erreur"));
    await load(); setBusy(false);
    return r.ok;
  };

  const b = d?.balances || { XOF: 0, EUR: 0 };
  return <section id="treasury" className="card animate-fade-up scroll-mt-6 p-6">
    <div className="flex items-center justify-between"><h2 className="font-bold">🌍 Trésorerie Afrique de l’Ouest (FCFA)</h2><button onClick={load} className="btn-secondary btn-sm">Actualiser</button></div>
    <p className="mt-2 text-sm text-zinc-400">Solde comptable central : tous les paiements Mobile Money confirmés « reçus en FCFA » s’y accumulent, sans limite de montant. Taux de conversion : 1 € = {d?.rate ?? 655.957} FCFA. Mode de virement : <b>{d?.provider ?? "manual"}</b>.</p>

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-banana/40 bg-banana/10 p-4"><div className="text-xs uppercase text-zinc-400">Solde FCFA (XOF)</div><div className="text-2xl font-bold">{fmt(b.XOF, "XOF")}</div></div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"><div className="text-xs uppercase text-zinc-400">Solde EUR (converti)</div><div className="text-2xl font-bold">{fmt(b.EUR, "EUR")}</div></div>
    </div>

    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      {[["subscription", "📅 Abonnements encaissés"], ["coins", "🪙 Pièces (cadeaux) encaissées"], ["packs", "🎞️ Crédits vidéo encaissés"]].map(([k, label]) => (
        <div key={k} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><div className="text-xs text-zinc-400">{label}</div><div className="text-lg font-bold">{fmt((d?.income || {})[k] || 0, "XOF")}</div></div>
      ))}
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-zinc-800 p-4">
        <h3 className="font-semibold">📤 Virement sortant</h3>
        <div className="mt-3 space-y-2">
          <select className="input w-full" value={pay.beneficiaryId} onChange={e => setPay({ ...pay, beneficiaryId: e.target.value })}><option value="">➕ Nouveau bénéficiaire (saisir ci-dessous)</option>{(d?.beneficiaries || []).map((x: any) => <option key={x.id} value={x.id}>{x.label} · {x.operator} {x.phone || x.account}</option>)}</select>
          <input className="input w-full" inputMode="numeric" placeholder="Montant en FCFA (ex : 30000)" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} />
          {!pay.beneficiaryId && <>
            {pay.operator === "banque"
              ? <input className="input w-full" placeholder="IBAN / RIB / numéro de compte" value={pay.account} onChange={e => setPay({ ...pay, account: e.target.value })} />
              : <input className="input w-full" inputMode="tel" placeholder="Numéro destinataire (ex : +22997000000)" value={pay.phone} onChange={e => setPay({ ...pay, phone: e.target.value })} />}
            <select className="input w-full" value={pay.operator} onChange={e => setPay({ ...pay, operator: e.target.value })}><option value="mtn">MTN Mobile Money</option><option value="moov">Moov Money</option><option value="autre">Autre</option><option value="banque">Compte bancaire (IBAN / RIB)</option></select>
            <input className="input w-full" placeholder="Nom du bénéficiaire (optionnel)" value={pay.name} onChange={e => setPay({ ...pay, name: e.target.value })} />
            <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={pay.save} onChange={e => setPay({ ...pay, save: e.target.checked })} /> Enregistrer ce bénéficiaire pour la prochaine fois</label>
            <button type="button" disabled={busy || !(pay.operator === "banque" ? pay.account : pay.phone)} className="btn-secondary btn-sm" onClick={async () => { if (await post({ action: "add_beneficiary", phone: pay.phone, account: pay.account, operator: pay.operator, name: pay.name })) setPay({ ...pay, phone: "", account: "", name: "", save: false }); }}>Enregistrer seulement (sans envoyer)</button>
          </>}
          <button disabled={busy} className="btn-primary w-full" onClick={async () => {
            const ben = (d?.beneficiaries || []).find((x: any) => x.id === pay.beneficiaryId);
            const target = pay.beneficiaryId ? (ben?.phone || ben?.account || "") : (pay.operator === "banque" ? pay.account : pay.phone);
            if (!confirm(`Envoyer ${pay.amount} FCFA à ${target} ?`)) return;
            if (!pay.beneficiaryId && pay.save) await post({ action: "add_beneficiary", phone: pay.phone, account: pay.account, operator: pay.operator, name: pay.name });
            const { save, ...rest } = pay;
            if (await post({ action: "payout", ...rest, amount: Number(pay.amount) })) setPay({ ...pay, amount: "", phone: "", account: "", name: "", save: false });
          }}>Envoyer</button>
          {pay.beneficiaryId && <button type="button" disabled={busy} className="text-xs text-red-400 underline" onClick={async () => { if (confirm("Supprimer ce bénéficiaire de la liste ?")) { await post({ action: "remove_beneficiary", id: pay.beneficiaryId }); setPay({ ...pay, beneficiaryId: "" }); } }}>Supprimer ce bénéficiaire</button>}
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 p-4">
        <h3 className="font-semibold">🔄 Convertir FCFA → EUR</h3>
        <div className="mt-3 space-y-2">
          <input className="input w-full" inputMode="numeric" placeholder="Montant en FCFA" value={conv} onChange={e => setConv(e.target.value)} />
          {Number(conv) > 0 && <p className="text-xs text-zinc-400">≈ {fmt(Number(conv) / (d?.rate || 655.957), "EUR")}</p>}
          <div className="flex gap-2">
            <button disabled={busy} className="btn-primary flex-1" onClick={async () => { if (confirm(`Convertir ${conv} FCFA en EUR ?`) && await post({ action: "convert", amount: Number(conv) })) setConv(""); }}>Convertir</button>
            <button disabled={busy} className="btn-secondary flex-1" onClick={async () => { if (confirm("Convertir TOUT le solde FCFA en EUR ?")) await post({ action: "convert", all: true }); }}>Tout convertir</button>
          </div>
        </div>
      </div>
    </div>
    {msg && <p className="mt-3 text-sm">{msg}</p>}

    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[40rem] text-sm"><thead><tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500"><th className="py-2 pr-3">Date</th><th className="pr-3">Type</th><th className="pr-3">Montant</th><th className="pr-3">Détail</th><th>Statut</th></tr></thead>
      <tbody>{(d?.entries || []).map((x: any) => <tr key={x.id} className="border-b border-zinc-800/50">
        <td className="py-2 pr-3">{new Date(x.created_at).toLocaleString("fr-FR")}</td><td className="pr-3">{KIND[x.kind] || x.kind}</td>
        <td className={"pr-3 font-mono " + (Number(x.amount) < 0 ? "text-red-400" : "text-green-400")}>{Number(x.amount) > 0 ? "+" : ""}{fmt(x.amount, x.currency)}</td>
        <td className="pr-3 text-xs text-zinc-400">{x.destination ? `${x.destination.operator} ${x.destination.phone || x.destination.account}` : (x.note || "")}</td>
        <td className="space-x-2">{x.status === "pending" && x.kind === "payout" ? <><span>en attente</span><button disabled={busy} className="btn-primary btn-sm" onClick={() => post({ action: "settle", id: x.id, status: "completed" })}>Envoyé ✓</button><button disabled={busy} className="btn-secondary btn-sm" onClick={() => post({ action: "settle", id: x.id, status: "failed" })}>Annuler</button></> : x.status}</td></tr>)}
        {!(d?.entries || []).length && <tr><td colSpan={5} className="py-8 text-center text-zinc-500">Aucune opération.</td></tr>}</tbody></table></div>
  </section>;
}
