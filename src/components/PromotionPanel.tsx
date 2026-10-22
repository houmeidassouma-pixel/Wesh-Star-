"use client";
import { useCallback, useEffect, useState } from "react";

const statusLabel: Record<string,string> = { pending_payment:"Paiement en attente", pending_review:"À valider par l’admin", active:"Active", paused:"En pause", rejected:"Refusée", completed:"Terminée", payment_failed:"Paiement échoué" };

export default function PromotionPanel({ admin = false }: { admin?: boolean }) {
  const [data, setData] = useState<any>({ campaigns: [], videos: [], lives: [], pricing: { pricePer1000Views: 10, minViews: 100, maxViews: 100000 } });
  const [targetType, setTargetType] = useState("video");
  const [targetId, setTargetId] = useState("");
  const [budget, setBudget] = useState("5");
  const [targetViews, setTargetViews] = useState("1000");
  const [duration, setDuration] = useState("24");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch(admin ? "/api/admin/promotions" : "/api/promotions", { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (r.ok) setData(d); else setMsg(d.error || "Impossible de charger les campagnes.");
  }, [admin]);
  useEffect(() => { load(); }, [load]);
  const options = targetType === "video" ? data.videos || [] : data.lives || [];
  useEffect(() => { setTargetId(options[0]?.id || ""); }, [targetType, data.videos, data.lives]);
  const create = async () => {
    if (!targetId) return setMsg(targetType === "video" ? "Publie d’abord une vidéo publique dans Wesh Star Feed." : "Tu dois être en LIVE pour le sponsoriser.");
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/promotions", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({targetType,targetId,budgetEur:Number(budget),targetViews:Number(targetViews),durationHours:Number(duration)}) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(d.error || "Impossible de créer la campagne.");
      else if (d.checkoutUrl) window.location.href = d.checkoutUrl;
      else setMsg("Campagne créée, mais le lien de paiement est absent.");
    } catch { setMsg("Erreur réseau. Réessaie."); } finally { setBusy(false); }
  };
  const act = async (id: string, action: string) => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/promotions", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id,action}) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Action enregistrée." : (d.error || "Action impossible."));
    await load(); setBusy(false);
  };
  if (admin) return <section id="promotions" className="card space-y-4 p-6">
    <div><h2 className="text-lg font-bold">📣 Promotions payantes des créateurs</h2><p className="text-sm text-zinc-500">Vérifie les paiements confirmés, valide les campagnes et suspends celles qui posent problème.</p></div>
    {msg && <p className="text-sm text-zinc-400">{msg}</p>}
    <div className="overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-sm"><thead><tr className="border-b border-zinc-800 text-zinc-500"><th className="py-2">Créateur</th><th>Cible</th><th>Budget</th><th>Objectif / vues</th><th>Durée</th><th>Statut</th><th>Action</th></tr></thead><tbody>
      {(data.campaigns || []).map((c:any) => <tr key={c.id} className="border-b border-zinc-800/60"><td className="py-3 pr-3">{c.email || "—"}</td><td>{c.target_type === "live" ? "LIVE" : "Vidéo"}</td><td>{Number(c.budget_eur).toFixed(2)} €</td><td>{c.target_type === "video" ? `${Number(c.impressions||0).toLocaleString("fr-FR")} / ${Number(c.target_views||0).toLocaleString("fr-FR")}` : `${Number(c.impressions||0).toLocaleString("fr-FR")} vues`}</td><td>{c.duration_hours} h</td><td>{statusLabel[c.status] || c.status}</td><td><div className="flex flex-wrap gap-1">{c.status === "pending_review" && <><button disabled={busy} className="btn-primary btn-sm" onClick={() => act(c.id,"approve")}>Valider</button><button disabled={busy} className="btn-secondary btn-sm" onClick={() => act(c.id,"reject")}>Refuser</button></>}{c.status === "active" && <button disabled={busy} className="btn-secondary btn-sm" onClick={() => act(c.id,"pause")}>Pause</button>}{c.status === "paused" && <button disabled={busy} className="btn-secondary btn-sm" onClick={() => act(c.id,"resume")}>Reprendre</button>}</div></td></tr>)}
    </tbody></table></div>
  </section>;
  return <div className="space-y-6">
    <section className="card space-y-4 p-6"><div><h2 className="text-lg font-bold">📣 Sponsoriser une vidéo ou un LIVE</h2><p className="mt-1 text-sm text-zinc-500">Choisis ta vidéo et un objectif de vues réelles. Après paiement confirmé, la campagne attend la validation de l’administration. Les vues sont comptées après 5 secondes de visionnage; la livraison dépend de l’audience disponible.</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Contenu<select className="input mt-1 w-full" value={targetType} onChange={e => setTargetType(e.target.value)}><option value="video">Vidéo publique</option><option value="live">Mon LIVE en cours</option></select></label>
      <label className="text-sm">Vidéo / LIVE<select className="input mt-1 w-full" value={targetId} onChange={e => setTargetId(e.target.value)}>{options.map((o:any)=><option key={o.id} value={o.id}>{o.title || "LIVE sans titre"}</option>)}</select></label>
      {targetType === "video" ? <label className="text-sm">Objectif de vues qualifiées<select className="input mt-1 w-full" value={targetViews} onChange={e => setTargetViews(e.target.value)}>{[data.pricing?.minViews || 100, 500, 1000, 2500, 5000, 10000, data.pricing?.maxViews || 100000].filter((v:number,i:number,a:number[])=>v>=Number(data.pricing?.minViews||100)&&v<=Number(data.pricing?.maxViews||100000)&&a.indexOf(v)===i).sort((a:number,b:number)=>a-b).map((v:number)=><option key={v} value={v}>{v.toLocaleString("fr-FR")} vues</option>)}</select></label> : <label className="text-sm">Budget LIVE<select className="input mt-1 w-full" value={budget} onChange={e => setBudget(e.target.value)}><option value="5">5 €</option><option value="10">10 €</option><option value="20">20 €</option><option value="50">50 €</option></select></label>}
      <label className="text-sm">Durée maximale de campagne<select className="input mt-1 w-full" value={duration} onChange={e => setDuration(e.target.value)}><option value="24">24 heures</option><option value="72">3 jours</option><option value="168">7 jours</option></select></label></div>
      {targetType === "video" && <p className="text-sm text-zinc-400">Prix estimé : <strong>{Math.max(1, Number(targetViews) / 1000 * Number(data.pricing?.pricePer1000Views || 10)).toLocaleString("fr-FR", { style:"currency", currency:"EUR" })}</strong> · tarif administrateur : {Number(data.pricing?.pricePer1000Views || 10).toLocaleString("fr-FR")} € / 1 000 vues. Une vue est comptée après 5 secondes de visionnage; la campagne peut se terminer à l'objectif ou à l'échéance.</p>}
      <button disabled={busy || !targetId} className="btn-primary" onClick={create}>{busy ? "Préparation…" : `Continuer vers le paiement · ${targetType === "video" ? Math.max(1, Number(targetViews) / 1000 * Number(data.pricing?.pricePer1000Views || 10)).toLocaleString("fr-FR", { style:"currency", currency:"EUR" }) : `${budget} €`}`}</button>
      {msg && <p role="status" className="text-sm text-zinc-400">{msg}</p>}
    </section>
    <section className="card space-y-3 p-6"><h2 className="font-bold">Mes campagnes</h2>{!(data.campaigns || []).length && <p className="text-sm text-zinc-500">Aucune campagne pour le moment.</p>}{(data.campaigns || []).map((c:any)=><div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 py-3 text-sm"><div><p className="font-semibold">{c.target_type === "live" ? "Promotion LIVE" : "Promotion vidéo"} · {Number(c.budget_eur).toFixed(2)} €</p><p className="text-zinc-500">{c.duration_hours} h · {new Date(c.created_at).toLocaleDateString()}</p></div><span className="rounded-full border border-zinc-700 px-3 py-1">{statusLabel[c.status] || c.status}</span></div>)}</section>
  </div>;
}
