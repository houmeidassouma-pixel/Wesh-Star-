"use client";

import { useState } from "react";

const sections = [
  ["🪙", "Crédits vidéo", ["1 minute = 6 crédits vidéo Wesh Star IA", "Remboursement automatique si une génération échoue", "Forfaits mensuels configurables en minutes/heures → 1 minute = 6 crédits vidéo Wesh Star IA", "Pas de promesse d’illimité par défaut"]],
  ["⚙️", "GPU Queue", ["File d’attente", "Position et statut", "Retries limités", "Suivi GPU/VRAM côté admin"]],
  ["🏭", "Video Factory", ["Produire plusieurs vidéos", "Production séquentielle", "Progression du lot", "Adaptation multi-plateformes"]],
  ["🧑", "Personnages persistants", ["Même personnage sur plusieurs vidéos", "Voix persistante", "Apparence/mannequin", "Personnalité et style"]],
  ["🎨", "Brand Kit", ["Logo", "Couleurs", "Watermark", "CTA et identité de marque"]],
  ["📱", "Social Repurposing", ["TikTok / Reels / Shorts", "YouTube / Facebook", "X / LinkedIn", "Titres, hashtags et CTA adaptés"]],
  ["🧠", "AI Content", ["Script", "Amélioration", "Hooks", "Sous-titres et traduction"]],
  ["💳", "Paiements", ["Visa / Mastercard", "PayPal", "Apple Pay / Google Pay", "SEPA / virement", "Méthodes locales / Klarna selon configuration"]],
  ["📊", "Admin Finance", ["Revenus", "Abonnements", "Heures vendues", "Échecs / remboursements"]],
  ["🖥️", "Admin Infrastructure", ["GPU", "VRAM", "Queue", "Stockage", "Heures générées"]]
] as const;

export default function V5FeatureCenter() {
  const [filter, setFilter] = useState("");
  const shown = sections.filter((s) => !filter || (s[1] + " " + s[2].join(" ")).toLowerCase().includes(filter.toLowerCase()));
  return (
    <section className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-xs font-bold uppercase tracking-wider text-banana">WESH IA STAR V5</div><h2 className="mt-1 text-xl font-extrabold">Centre des nouvelles fonctions</h2><p className="mt-1 text-sm text-zinc-400">Toutes les fonctions prévues pour la V5, sans supprimer les fonctions existantes.</p></div>
          <input className="input max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Rechercher une fonction…" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {shown.map(([icon, title, features]) => (
          <article key={title} className="card p-5">
            <h3 className="font-bold">{icon} {title}</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">{features.map((x) => <li key={x}>✓ {x}</li>)}</ul>
          </article>
        ))}
      </div>
    </section>
  );
}
