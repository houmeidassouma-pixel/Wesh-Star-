"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function fmtCredits(value: number) { return `${Math.floor(Math.max(0, Number(value || 0)) / 10).toLocaleString("fr-FR")} crédits vidéo`; }

export default function QuotaManagementPanel({ profiles }: { profiles: any[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(profiles[0]?.id || "");
  const [minutes, setMinutes] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const current = useMemo(() => profiles.find((p) => p.id === selected), [profiles, selected]);

  const action = async (kind: "add" | "set" | "reset-month" | "reset-day") => {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected, action: kind, minutes: Number(minutes) || 0 })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMessage(data.message || "Quota mis à jour.");
      router.refresh();
    } catch (e: any) {
      setMessage(e?.message || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">⏱️ Gestion complète des quotas</h2>
          <p className="mt-1 text-sm text-zinc-400">Gérer le temps de génération en minutes. Les utilisateurs voient leur solde en crédits vidéo.</p>
        </div>
        <span className="badge-yellow">1 minute = 6 crédits vidéo</span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
        <label className="text-sm">
          <span className="text-zinc-400">Utilisateur</span>
          <select className="input mt-1" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.email || p.id} — {p.subscription_tier || "free"}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-zinc-400">Durée à ajouter / définir (minutes)</span>
          <input className="input mt-1" type="number" min="0" step="1" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
        </label>
      </div>

      {current && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 p-4"><div className="text-xs text-zinc-500">Forfait</div><div className="mt-1 font-bold">{current.subscription_status === "active" ? current.subscription_tier || "free" : "free"}</div></div>
          <div className="rounded-xl border border-zinc-800 p-4"><div className="text-xs text-zinc-500">Crédits vidéo supplémentaires</div><div className="mt-1 font-bold">{fmtCredits(Number(current.hour_credits_seconds || 0))}</div></div>
          <div className="rounded-xl border border-zinc-800 p-4"><div className="text-xs text-zinc-500">État</div><div className="mt-1 font-bold">{current.blocked ? "Bloqué" : "Actif"}</div></div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => action("add")} className="btn-primary btn-sm">+ Ajouter des minutes</button>
        <button disabled={busy} onClick={() => action("set")} className="btn-secondary btn-sm">Définir les minutes</button>
        <button disabled={busy} onClick={() => action("reset-month")} className="btn-secondary btn-sm">Réinitialiser le mois</button>
        <button disabled={busy} onClick={() => action("reset-day")} className="btn-secondary btn-sm">Réinitialiser aujourd'hui</button>
      </div>
      {message && <p className="mt-3 text-sm text-zinc-300">{message}</p>}
    </section>
  );
}
