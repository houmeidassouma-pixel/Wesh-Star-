"use client";

import { useEffect, useState } from "react";

export default function DataSaverSettings() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    try { setEnabled(window.localStorage.getItem("wesh-data-saver") === "1"); } catch {}
  }, []);
  function change(value: boolean) {
    setEnabled(value);
    try { window.localStorage.setItem("wesh-data-saver", value ? "1" : "0"); } catch {}
  }
  return <section className="card p-6" aria-labelledby="data-saver-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <h2 id="data-saver-title" className="font-bold">📶 Économie de données et de batterie</h2>
        <p className="mt-2 text-sm text-zinc-400">Réduit les actualisations automatiques du Studio et met en pause les vérifications lorsque l’onglet est en arrière-plan. Les vidéos et générations IA utilisent toujours des données/ressources lorsqu’elles sont ouvertes ou lancées.</p>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-700 px-4 py-3 text-sm">
        <input type="checkbox" checked={enabled} onChange={e => change(e.target.checked)} className="h-5 w-5 accent-sky-500" />
        <span className="font-semibold">{enabled ? "Activé" : "Désactivé"}</span>
      </label>
    </div>
    <ul className="mt-4 grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
      <li>✓ Actualisation du statut des générations moins fréquente</li>
      <li>✓ Pause des vérifications en arrière-plan</li>
      <li>✓ Aucun média lu automatiquement par ce réglage</li>
      <li>ℹ️ Le téléchargement d’une vidéo reste potentiellement volumineux</li>
    </ul>
  </section>;
}
