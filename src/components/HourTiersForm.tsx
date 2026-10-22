"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX_MINUTES = 10080; // 7 days
const durationLabel = (minutes: number) => minutes >= 60 ? `${(minutes / 60).toLocaleString("fr-FR")} h` : `${minutes} min`;

export default function HourTiersForm({ tiers }: { tiers: any[]; t: Record<string, string> }) {
  const normalize = (x: any) => {
    const minutes = Math.max(7, Math.min(MAX_MINUTES, Math.floor(Number(x.hours) || 7)));
    return { ...x, hours: minutes, credits: minutes * 6, price: Math.max(0, Number(x.price ?? Math.round((minutes * 6 / 80) * 100) / 100) || 0) };
  };
  const [rows, setRows] = useState((tiers || []).map(normalize));
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const [newDuration, setNewDuration] = useState(7);
  const [newUnit, setNewUnit] = useState<"minutes" | "hours">("minutes");


  const normalizedDuration = Math.max(7, Math.min(MAX_MINUTES, Math.floor(Number(newDuration) * (newUnit === "hours" ? 60 : 1) || 7)));
  const setDuration = (i: number, value: number) => {
    const minutes = Math.max(7, Math.min(MAX_MINUTES, Math.floor(Number(value) || 7)));
    setRows((r) => r.map((x, idx) => idx === i ? { ...x, hours: minutes, credits: minutes * 6 } : x));
  };


  const save = async () => {
    const payload = rows.map((r) => ({ hours: Number(r.hours), credits: Number(r.hours) * 6, price: Math.max(0, Number(r.price) || 0), enabled: r.enabled !== false }));
    const res = await fetch("/api/admin/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plans: { hourTiers: payload } }) });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh(); }
  };

  const addTier = () => {
    const minutes = normalizedDuration;
    const price = Math.max(0, Math.round((minutes * 6 / 80) * 100) / 100);
    if (rows.some((r) => Number(r.hours) === minutes)) return;
    setRows((r) => [...r, { hours: minutes, credits: minutes * 6, price, enabled: true }].sort((a, b) => a.hours - b.hours));
  };
  const removeTier = (minutes: number) => setRows((r) => r.filter((x) => Number(x.hours) !== minutes));

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <b style={{ fontSize: 15 }}>🪙 Gestion des packs — crédits vidéo Wesh Star IA</b>
      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
        Tu saisis une durée en minutes ou en heures. Le système calcule automatiquement les crédits vidéo en arrière-plan : <b>1 minute = 6 crédits vidéo Wesh Star IA</b>. Tu saisis la durée et tu peux modifier librement le prix. Les crédits sont calculés automatiquement : 1 minute = 6 crédits vidéo. Le prix proposé est indicatif et reste modifiable.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginTop: 10 }}>
        <label style={{ fontSize: 12 }}><span style={{ display: "block", color: "var(--muted)", marginBottom: 4 }}>Durée</span>
          <input className="input" style={{ width: 100, padding: "7px 8px", fontSize: 12 }} type="number" min={7} step={1} value={newDuration} onChange={(e) => setNewDuration(Number(e.target.value))} />
        </label>
        <label style={{ fontSize: 12 }}><span style={{ display: "block", color: "var(--muted)", marginBottom: 4 }}>Unité</span>
          <select className="input" style={{ width: 110, padding: "7px 8px", fontSize: 12 }} value={newUnit} onChange={(e) => setNewUnit(e.target.value as "minutes" | "hours")}><option value="minutes">Minutes</option><option value="hours">Heures</option></select>
        </label>
        <label style={{ fontSize: 12 }}><span style={{ display: "block", color: "var(--muted)", marginBottom: 4 }}>Prix calculé (€)</span>
          <input className="input" style={{ width: 110, padding: "7px 8px", fontSize: 12 }} type="text" readOnly value={(Math.max(0.5, Math.round((normalizedDuration * 6 / 80) * 100) / 100)).toFixed(2)} />
        </label>
        <button className="btn-secondary btn-sm" onClick={addTier}>➕ Ajouter le pack</button>
      </div>
      <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 11 }}>Calcul automatique : 30 min → 180 crédits vidéo · 1 h → 360 crédits vidéo · 7 h → 2 520 crédits vidéo. Prix calculé selon 80 crédits = 1 €, minimum 0,50 €.</div>

      <div style={{ maxHeight: 360, overflowY: "auto", marginTop: 12 }}>
        <table style={{ fontSize: 12 }}><thead><tr><th>Durée</th><th>Crédits</th><th>Prix € (modifiable)</th><th>Actif</th><th></th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.hours}>
              <td><input className="input" style={{ width: 100, padding: "5px 8px", fontSize: 12 }} type="number" min={7} max={MAX_MINUTES} step={1} value={r.hours} onChange={(e) => setDuration(i, Number(e.target.value))} /><div style={{ color: "var(--muted)", fontSize: 10, marginTop: 2 }}>{durationLabel(Number(r.hours))}</div></td><td>{Number(r.hours) * 6} crédits vidéo</td>
              <td><input className="input" style={{ width: 100, padding: "5px 8px", fontSize: 12 }} type="number" min={0} step="0.01" value={r.price} onChange={(e) => setRows((all) => all.map((x, idx) => idx === i ? { ...x, price: Number(e.target.value) } : x))} /></td>
              <td><input type="checkbox" checked={r.enabled !== false} onChange={(e) => setRows((all) => all.map((x, idx) => idx === i ? { ...x, enabled: e.target.checked } : x))} /></td>
              <td><button className="btn-secondary btn-sm" onClick={() => removeTier(Number(r.hours))}>Supprimer</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <button className="btn-primary btn-sm" style={{ marginTop: 10 }} onClick={save}>{saved ? "💾 Enregistré — disponible immédiatement" : "💾 Enregistrer tous les packs"}</button>
    </div>
  );
}
