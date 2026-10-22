"use client";
import { useEffect, useState } from "react";

export default function BillingHistory() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/payment/history").then(r => r.json())
      .then(d => d.payments ? setItems(d.payments) : setError(d.error || "Impossible de charger l’historique."))
      .catch(() => setError("Impossible de charger l’historique."));
  }, []);
  if (error) return <p className="mt-4 text-sm text-red-400">{error}</p>;
  if (!items.length) return <p className="mt-4 text-sm text-zinc-500">Aucun paiement enregistré pour le moment.</p>;
  return <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
    <thead className="border-b border-zinc-800 text-zinc-500"><tr>
      <th className="px-3 py-3">Date</th><th className="px-3 py-3">Référence</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Montant</th><th className="px-3 py-3">Statut</th>
    </tr></thead><tbody>
      {items.map(p => <tr key={p.id} className="border-b border-zinc-900">
        <td className="px-3 py-3">{p.created_at ? new Date(p.created_at).toLocaleString("fr-FR") : "—"}</td>
        <td className="px-3 py-3 font-mono text-xs">{p.reference || "—"}</td>
        <td className="px-3 py-3">{p.kind === "subscription" ? "Abonnement" : "Crédits vidéo supplémentaires"}</td>
        <td className="px-3 py-3 font-semibold">{p.amount ?? "—"} {p.currency || "EUR"}</td>
        <td className="px-3 py-3"><span className="badge-zinc">{p.status === "confirmed" ? "Confirmé" : p.status === "rejected" ? "Refusé" : "En attente"}</span></td>
      </tr>)}
    </tbody></table></div>;
}
