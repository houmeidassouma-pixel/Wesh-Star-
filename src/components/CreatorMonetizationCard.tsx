"use client";
import { useEffect, useState } from "react";
export default function CreatorMonetizationCard() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const refresh = () => fetch("/api/creator/monetization", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(setData).catch(() => setData(null));
  useEffect(() => { refresh(); }, []);
  if (!data) return null;
  const progress = (value: number, goal: number) => Math.min(100, Math.round(Number(value || 0) / Math.max(1, Number(goal || 1)) * 100));
  const apply = async () => {
    setBusy(true); setNotice("");
    try { const r = await fetch("/api/creator/monetization", { method: "POST" }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.message || d.error || "Demande impossible"); setNotice("Demande envoyée à l’administration."); await refresh(); }
    catch (e: any) { setNotice(e?.message || "Erreur pendant la demande."); }
    finally { setBusy(false); }
  };
  const rows = [
    ["Abonnés", data.followers, data.followerThreshold, data.checks?.followers],
    ["Vues qualifiées sur 30 jours", data.qualifiedViews30d, data.viewThreshold, data.checks?.qualifiedViews30d],
    ["Vidéos publiques de 61 s ou plus ayant atteint 1 000 vues qualifiées", data.qualifyingVideos, 1, data.checks?.qualifyingVideo],
  ];
  const statusLabel: Record<string,string> = { not_applied: "Pas encore demandée", pending: "En attente de vérification", approved: "Monétisation activée", rejected: "Demande refusée — correction possible", suspended: "Monétisation suspendue" };
  return <section className="card space-y-4 p-5">
    <div><h2 className="font-bold">💰 Wesh Star Creator Rewards</h2><p className="mt-1 text-sm text-zinc-400">Critères inspirés des programmes de récompenses de créateurs, adaptés à Wesh Star IA. Ce n’est pas une affiliation à TikTok.</p></div>
    {rows.map(([label,value,goal,passed]: any) => <div key={label} className="space-y-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><span className="text-sm text-zinc-400">{label}</span><b className="text-sm">{Number(value||0).toLocaleString("fr-FR")} / {Number(goal||0).toLocaleString("fr-FR")}</b></div><div className="h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-banana" style={{width:`${progress(value,goal)}%`}} /></div></div>)}
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-zinc-800 p-3"><p className="text-xs text-zinc-500">Revenus publicitaires attribués</p><p className="mt-1 text-2xl font-bold">{Number(data.adRevenueEur||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR"})}</p><p className="mt-1 text-xs text-zinc-500">Calculés à partir des recettes nettes effectivement enregistrées par l’administration.</p></div><div className="rounded-lg border border-zinc-800 p-3"><p className="text-xs text-zinc-500">Crédits publicitaires cumulés</p><p className="mt-1 text-2xl font-bold">{Number(data.adRevenueCoins||0).toLocaleString("fr-FR")} pièces de gain</p><p className="mt-1 text-xs text-zinc-500">Les crédits publicitaires sont ajoutés au portefeuille de gains. 100 pièces de gain = 1 € dans le calcul actuel du retrait; le solde disponible peut être inférieur après une demande de retrait.</p></div></div>
    <div className="rounded-lg border border-zinc-800 p-3 text-sm"><p>{data.message}</p><p className="mt-2 text-xs text-zinc-500">Autres contrôles : âge 18 ans ou plus vérifié par l’administration, pays autorisé, compte en règle et contenu original. Une vue qualifiée doit atteindre au moins 5 secondes; une vidéo doit être publique et durer au moins 61 secondes. La durée réelle, l’originalité, les droits et les vues artificielles doivent être contrôlés avant paiement; la durée demandée par le générateur ne prouve pas la durée finale du fichier.</p></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm">Statut : <b>{statusLabel[data.status] || data.status}</b></span>{data.eligibleToApply && data.status !== "approved" && data.status !== "pending" && <button className="btn-primary btn-sm" disabled={busy} onClick={apply}>{busy ? "Envoi…" : "Demander la monétisation"}</button>}</div>
    {data.application?.reviewNote && <p className="text-sm text-zinc-400">Note de l’administration : {data.application.reviewNote}</p>}
    {notice && <p role="status" className="text-sm text-zinc-300">{notice}</p>}
  </section>;
}
