"use client";
import { useEffect, useState } from "react";
function dateString(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
const now = new Date();
const monthStart = dateString(new Date(now.getFullYear(), now.getMonth(), 1));
const monthEnd = dateString(new Date(now.getFullYear(), now.getMonth()+1, 0));
export default function CreatorAdRevenueAdminPanel() {
  const [periodStart,setPeriodStart] = useState(monthStart);
  const [periodEnd,setPeriodEnd] = useState(monthEnd);
  const [netRevenueEur,setNetRevenueEur] = useState("");
  const [creatorSharePct,setCreatorSharePct] = useState("10");
  const [sourceReference,setSourceReference] = useState("");
  const [periods,setPeriods] = useState<any[]>([]);
  const [totals,setTotals] = useState<any>({});
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const refresh = () => fetch("/api/admin/creator-ad-revenue",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{setPeriods(d?.periods||[]);setTotals(d?.totals||{});}).catch(()=>undefined);
  useEffect(()=>{refresh();},[]);
  const submit = async () => {
    setBusy(true);setMessage("");
    try {
      const r=await fetch("/api/admin/creator-ad-revenue",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({periodStart,periodEnd,netRevenueEur:Number(netRevenueEur),creatorSharePct:Number(creatorSharePct),sourceReference})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d.message||d.error||"Répartition impossible");
      setMessage(`Période traitée : ${d.creatorPoolEur.toLocaleString("fr-FR",{style:"currency",currency:"EUR"})} pour les créateurs, ${d.eligibleCreators} créateur(s), ${d.unallocatedPoolEur.toLocaleString("fr-FR",{style:"currency",currency:"EUR"})} non attribué(s). Le virement réel reste séparé.`);
      setNetRevenueEur("");setSourceReference("");await refresh();
    } catch(e:any) { setMessage(e?.message||"Erreur"); }
    finally {setBusy(false);}
  };
  return <section className="card space-y-5 p-5" id="creator-ad-revenue">
    <div><h2 className="font-bold">💶 Revenus publicitaires des créateurs</h2><p className="mt-1 text-sm text-zinc-400">Enregistre uniquement les revenus nets réellement encaissés auprès du partenaire publicitaire. Le serveur répartit la part créateurs entre les comptes approuvés, au prorata des vues qualifiées de la période, et crédite leur portefeuille de gains avec une clé anti-doublon.</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-zinc-800 p-3"><p className="text-xs text-zinc-500">Recettes nettes enregistrées</p><b className="text-xl">{(Number(totals.net_revenue_cents||0)/100).toLocaleString("fr-FR",{style:"currency",currency:"EUR"})}</b></div><div className="rounded-lg border border-zinc-800 p-3"><p className="text-xs text-zinc-500">Parts créateurs calculées</p><b className="text-xl">{(Number(totals.creator_pool_cents||0)/100).toLocaleString("fr-FR",{style:"currency",currency:"EUR"})}</b></div></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Début de période<input className="input mt-1" type="date" value={periodStart} onChange={e=>setPeriodStart(e.target.value)}/></label><label className="text-sm">Fin de période<input className="input mt-1" type="date" value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)}/></label><label className="text-sm">Revenus nets encaissés (€)<input className="input mt-1" type="number" min="0" max="100000000" step="0.01" value={netRevenueEur} onChange={e=>setNetRevenueEur(e.target.value)} placeholder="Ex. 250.00"/></label><label className="text-sm">Part des créateurs (%)<input className="input mt-1" type="number" min="0" max="100" step="1" value={creatorSharePct} onChange={e=>setCreatorSharePct(e.target.value)}/></label><label className="text-sm sm:col-span-2">Référence du relevé publicitaire<input className="input mt-1" minLength={3} maxLength={160} value={sourceReference} onChange={e=>setSourceReference(e.target.value)} placeholder="Ex. Relevé partenaire 2026-10"/></label></div>
    <p className="text-xs text-amber-200">Une période ne peut être traitée qu’une seule fois. La distribution ne contacte pas la banque ni le fournisseur publicitaire. Le paiement des retraits reste manuel/à valider et les règles fiscales doivent être vérifiées avant lancement.</p>
    <button className="btn-primary btn-sm" disabled={busy||!periodStart||!periodEnd||periodStart>periodEnd||netRevenueEur===""||Number(netRevenueEur)<0||!Number.isInteger(Number(creatorSharePct))||Number(creatorSharePct)<0||Number(creatorSharePct)>100||sourceReference.trim().length<3} onClick={submit}>{busy?"Répartition…":"Enregistrer et répartir les revenus"}</button>
    {message&&<p role="status" className="text-sm text-zinc-300">{message}</p>}
    <div className="space-y-2"><h3 className="font-semibold">Dernières périodes traitées</h3>{periods.length===0&&<p className="text-sm text-zinc-500">Aucune période enregistrée.</p>}{periods.map(p=><div key={p.id} className="rounded-lg border border-zinc-800 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><b>{String(p.period_start).slice(0,10)} → {String(p.period_end).slice(0,10)}</b><span>{Number(p.creator_share_pct)} % créateurs</span></div><p className="mt-1 text-zinc-400">Net encaissé : {(Number(p.net_revenue_cents)/100).toLocaleString("fr-FR",{style:"currency",currency:"EUR"})} · Pool : {(Number(p.creator_pool_cents)/100).toLocaleString("fr-FR",{style:"currency",currency:"EUR"})} · Distribué : {(Number(p.allocated_cents)/100).toLocaleString("fr-FR",{style:"currency",currency:"EUR"})}</p><p className="text-xs text-zinc-500">{p.source_reference} · {p.creators_paid} créateur(s)</p></div>)}</div>
  </section>;
}
