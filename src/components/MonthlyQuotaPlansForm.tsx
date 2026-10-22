"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MonthlyQuotaTier } from "@/lib/settings";

const MAX_MINUTES = 10080; // 7 days
const tokenLabel = (n: number) => `${(n * 6).toLocaleString("fr-FR")} crédits vidéo Wesh Star IA`;
const durationLabel = (minutes: number) => minutes >= 60 ? `${(minutes / 60).toLocaleString("fr-FR")} h` : `${minutes} min`;

export default function MonthlyQuotaPlansForm({ tiers }: { tiers: MonthlyQuotaTier[] }) {
  const [rows, setRows] = useState<MonthlyQuotaTier[]>(JSON.parse(JSON.stringify(tiers || [])));
  const [saved, setSaved] = useState(false);
  const [newDuration, setNewDuration] = useState(1);
  const [newUnit, setNewUnit] = useState<"minutes" | "hours">("minutes");
  const [newPrice, setNewPrice] = useState(1);
  const [newDaily, setNewDaily] = useState(1);
  const router = useRouter();

  const normalizedDuration = Math.max(1, Math.min(MAX_MINUTES, Math.floor(Number(newDuration) * (newUnit === "hours" ? 60 : 1) || 1)));

  const normalize = (r: MonthlyQuotaTier) => ({
    ...r,
    minutes: Math.max(1, Math.min(MAX_MINUTES, Math.floor(Number(r.minutes) || 1))),
    dailyMinutes: Math.max(1, Math.min(MAX_MINUTES, Math.floor(Number(r.dailyMinutes) || 1))),
    price: Math.max(0, Number(r.price) || 0),
    enabled: r.enabled !== false,
    name: String(r.name || `Pro — ${r.minutes * 6} crédits vidéo / mois`).replace(/jetons?\s*(IA)?/gi, "crédits vidéo").slice(0, 80),
    id: String(r.id || `monthly_${r.minutes}m`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)
  });

  const update = (i: number, patch: Partial<MonthlyQuotaTier>) =>
    setRows((r) => r.map((x, idx) => idx === i ? normalize({ ...x, ...patch }) : x));

  const add = () => {
    const minutes = normalizedDuration;
    const id = `monthly_${minutes}m_${Date.now()}`;
    if (rows.some((x) => x.minutes === minutes && x.enabled !== false)) return;
    const row: MonthlyQuotaTier = normalize({
      id,
      name: `Pro — ${minutes * 6} crédits vidéo / mois`,
      minutes,
      price: Math.max(0, Number(newPrice) || 0),
      dailyMinutes: Math.max(1, Math.min(minutes, Math.floor(Number(newDaily) || 1))),
      enabled: true
    });
    setRows((r) => [...r, row].sort((a, b) => a.minutes - b.minutes));
  };

  const remove = (id: string) => setRows((r) => r.filter((x) => x.id !== id));

  const save = async () => {
    const payload = rows.map(normalize)
      .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i)
      .sort((a, b) => a.minutes - b.minutes);
    const res = await fetch("/api/admin/plans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plans: { monthlyTiers: payload } })
    });
    if (!res.ok) return;
    setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh();
  };

  return (
    <section id="monthly-quota-plans" className="card animate-fade-up scroll-mt-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">🔄 Forfaits mensuels — durée, crédits vidéo Wesh Star IA + prix</h2>
          <p className="mt-1 text-sm text-zinc-400">
            L’admin saisit une durée en minutes ou en heures. Le calcul est automatique : <b>1 minute = 6 crédits vidéo Wesh Star IA</b>. Le prix mensuel et le plafond quotidien restent entièrement modifiables.
          </p>
        </div>
        <span className="badge-zinc">1 min = 6 crédits vidéo Wesh Star IA</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <label className="text-xs text-zinc-400">Durée<input className="input mt-1" type="number" min={1} step={1} value={newDuration} onChange={(e) => setNewDuration(Number(e.target.value))} /></label>
        <label className="text-xs text-zinc-400">Unité<select className="input mt-1" value={newUnit} onChange={(e) => setNewUnit(e.target.value as "minutes" | "hours")}><option value="minutes">Minutes</option><option value="hours">Heures</option></select></label>
        <label className="text-xs text-zinc-400">Crédits calculés<input className="input mt-1" type="text" value={tokenLabel(normalizedDuration)} readOnly /></label>
        <label className="text-xs text-zinc-400">Prix € / mois<input className="input mt-1" type="number" min={0} step="0.01" value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} /></label>
        <label className="text-xs text-zinc-400">Minutes max / jour<input className="input mt-1" type="number" min={1} max={normalizedDuration} value={Math.min(newDaily, normalizedDuration)} onChange={(e) => setNewDaily(Number(e.target.value))} /></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={add} className="btn-secondary btn-sm">➕ Ajouter le forfait</button>
        <span className="text-xs text-zinc-500">Exemple : 30 minutes → 180 crédits vidéo · 1 heure → 360 crédits vidéo · 7 heures → 2 520 crédits vidéo.</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.filter(r => r.enabled !== false).sort((a,b) => a.minutes-b.minutes).slice(0, 8).map(r => (
          <div key={`preview_${r.id}`} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="text-xs text-zinc-500">Aperçu client</div>
            <div className="mt-1 font-bold">{r.name}</div>
            <div className="mt-1 text-xl font-extrabold">{Number(r.price).toFixed(2)} € <span className="text-xs font-normal text-zinc-500">/ mois</span></div>
            <div className="mt-2 text-xs text-zinc-400">Durée : {durationLabel(r.minutes)} · {tokenLabel(r.minutes)} / mois</div>
            <div className="mt-2 text-xs text-banana">Plafond : {r.dailyMinutes} min/jour · 10 min maximum par vidéo</div>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[64rem] text-sm">
          <thead><tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500"><th className="py-2 pr-3">Nom</th><th className="pr-3">Durée (minutes)</th><th className="pr-3">Crédits vidéo Wesh Star IA</th><th className="pr-3">Prix / mois</th><th className="pr-3">Max minutes / jour</th><th className="pr-3">Génération max</th><th className="pr-3">Actif</th><th /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-zinc-800/50">
                <td className="py-2 pr-3"><input className="input !py-1.5" value={r.name} onChange={(e) => update(i, { name: e.target.value })} /></td>
                <td className="pr-3"><input className="input !w-28 !py-1.5" type="number" min={1} max={MAX_MINUTES} value={r.minutes} onChange={(e) => update(i, { minutes: Number(e.target.value), dailyMinutes: Math.min(Number(e.target.value) || 1, r.dailyMinutes) })} /></td>
                <td className="pr-3"><b>{tokenLabel(r.minutes)}</b><div className="text-xs text-zinc-500">{durationLabel(r.minutes)}</div></td>
                <td className="pr-3"><input className="input !w-28 !py-1.5" type="number" min={0} step="0.01" value={r.price} onChange={(e) => update(i, { price: Number(e.target.value) })} /></td>
                <td className="pr-3"><input className="input !w-28 !py-1.5" type="number" min={1} max={r.minutes} value={Math.min(r.dailyMinutes, r.minutes)} onChange={(e) => update(i, { dailyMinutes: Number(e.target.value) })} /></td>
                <td className="pr-3 text-zinc-400">30 min / vidéo</td>
                <td className="pr-3"><input type="checkbox" checked={r.enabled !== false} onChange={(e) => update(i, { enabled: e.target.checked })} /></td>
                <td><button type="button" onClick={() => remove(r.id)} className="btn-secondary btn-sm">Supprimer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3"><button type="button" onClick={save} className="btn-primary btn-md">{saved ? "✓ Enregistré" : "Enregistrer les forfaits mensuels"}</button><span className="text-xs text-zinc-500">Les changements de prix s’appliquent aux nouveaux abonnements. Les abonnements Stripe déjà actifs gardent leur prix Stripe actuel. À chaque renouvellement, le client reçoit le nombre complet de crédits vidéo du nouveau cycle.</span></div>
    </section>
  );
}
