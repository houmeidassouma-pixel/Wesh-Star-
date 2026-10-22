"use client";
import { useEffect, useState } from "react";

const fmt = (n: number) => Number(n).toLocaleString("fr-FR") + " FCFA";
const KIND: Record<string, string> = { admin_credit: "Crédit admin", admin_debit: "Débit admin", transfer_in: "Transfert reçu", transfer_out: "Transfert envoyé" };

export default function WalletsPanel() {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [adj, setAdj] = useState({ email: "", amount: "", reason: "" });
  const [tr, setTr] = useState({ fromEmail: "", toEmail: "", amount: "", reason: "" });

  const load = () => fetch("/api/admin/wallets").then(r => r.json()).then(setD);
  useEffect(() => { load(); }, []);
  const post = async (body: any) => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/wallets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? "✅ Opération enregistrée" : "❌ " + (j.error || "Erreur"));
    await load(); setBusy(false);
    return r.ok;
  };

  return <section id="wallets" className="card animate-fade-up scroll-mt-6 p-6">
    <div className="flex items-center justify-between"><h2 className="font-bold">👛 Portefeuilles FCFA des utilisateurs</h2><button onClick={load} className="btn-secondary btn-sm">Actualiser</button></div>
    <p className="mt-2 text-sm text-zinc-400">Soldes internes gérés par l’administrateur, sans dépôt ni passerelle de paiement. Chaque opération exige un motif et reste dans l’historique. Ces soldes ne sont pas retirables en argent réel.</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-zinc-800 p-4 space-y-2">
        <h3 className="font-semibold">✏️ Saisir / retirer un montant</h3>
        <input className="input w-full" type="email" placeholder="E-mail de l’utilisateur" value={adj.email} onChange={e => setAdj({ ...adj, email: e.target.value })} />
        <input className="input w-full" inputMode="numeric" placeholder="Montant en FCFA (ex : 100)" value={adj.amount} onChange={e => setAdj({ ...adj, amount: e.target.value })} />
        <input className="input w-full" placeholder="Motif (obligatoire)" value={adj.reason} onChange={e => setAdj({ ...adj, reason: e.target.value })} />
        <div className="flex gap-2">
          <button disabled={busy} className="btn-primary flex-1" onClick={async () => { if (confirm(`Créditer ${adj.amount} FCFA à ${adj.email} ?`) && await post({ action: "adjust", direction: "credit", ...adj, amount: Number(adj.amount) })) setAdj({ email: "", amount: "", reason: "" }); }}>Créditer</button>
          <button disabled={busy} className="btn-secondary flex-1" onClick={async () => { if (confirm(`Retirer ${adj.amount} FCFA à ${adj.email} ?`) && await post({ action: "adjust", direction: "debit", ...adj, amount: Number(adj.amount) })) setAdj({ email: "", amount: "", reason: "" }); }}>Retirer</button>
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 p-4 space-y-2">
        <h3 className="font-semibold">🔁 Transférer à un autre utilisateur</h3>
        <input className="input w-full" type="email" placeholder="E-mail de l’expéditeur" value={tr.fromEmail} onChange={e => setTr({ ...tr, fromEmail: e.target.value })} />
        <input className="input w-full" type="email" placeholder="E-mail du destinataire" value={tr.toEmail} onChange={e => setTr({ ...tr, toEmail: e.target.value })} />
        <input className="input w-full" inputMode="numeric" placeholder="Montant en FCFA" value={tr.amount} onChange={e => setTr({ ...tr, amount: e.target.value })} />
        <input className="input w-full" placeholder="Motif (obligatoire)" value={tr.reason} onChange={e => setTr({ ...tr, reason: e.target.value })} />
        <button disabled={busy} className="btn-primary w-full" onClick={async () => { if (confirm(`Transférer ${tr.amount} FCFA de ${tr.fromEmail} à ${tr.toEmail} ?`) && await post({ action: "transfer", ...tr, amount: Number(tr.amount) })) setTr({ fromEmail: "", toEmail: "", amount: "", reason: "" }); }}>Transférer</button>
      </div>
    </div>
    {msg && <p className="mt-3 text-sm">{msg}</p>}

    <h3 className="mt-6 font-semibold">Soldes</h3>
    <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[28rem] text-sm"><tbody>
      {(d?.wallets || []).map((w: any) => <tr key={w.email} className="border-b border-zinc-800/50"><td className="py-2 pr-3">{w.email}</td><td className="font-mono">{fmt(w.balance)}</td></tr>)}
      {!(d?.wallets || []).length && <tr><td className="py-6 text-center text-zinc-500">Aucun portefeuille.</td></tr>}
    </tbody></table></div>

    <h3 className="mt-6 font-semibold">Historique</h3>
    <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[40rem] text-sm"><thead><tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500"><th className="py-2 pr-3">Date</th><th className="pr-3">Utilisateur</th><th className="pr-3">Type</th><th className="pr-3">Montant</th><th>Motif</th></tr></thead><tbody>
      {(d?.entries || []).map((x: any) => <tr key={x.id} className="border-b border-zinc-800/50">
        <td className="py-2 pr-3">{new Date(x.created_at).toLocaleString("fr-FR")}</td><td className="pr-3">{x.email}{x.counterparty_email ? <span className="text-xs text-zinc-500"> ↔ {x.counterparty_email}</span> : null}</td>
        <td className="pr-3">{KIND[x.kind] || x.kind}</td><td className={"pr-3 font-mono " + (Number(x.amount) < 0 ? "text-red-400" : "text-green-400")}>{Number(x.amount) > 0 ? "+" : ""}{fmt(x.amount)}</td><td className="text-xs text-zinc-400">{x.reason}</td></tr>)}
      {!(d?.entries || []).length && <tr><td colSpan={5} className="py-6 text-center text-zinc-500">Aucune opération.</td></tr>}
    </tbody></table></div>
  </section>;
}
