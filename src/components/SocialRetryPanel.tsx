"use client";

import { useRouter } from "next/navigation";

export default function SocialRetryPanel({ items }: { items: any[] }) {
  const router = useRouter();
  const retry = async (id?: string) => {
    await fetch("/api/admin/social-retries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true })
    });
    router.refresh();
  };

  return (
    <section className="card animate-fade-up p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">🔁 Échecs de publication sociale</h2>
          <p className="mt-1 text-xs text-zinc-500">Les erreurs temporaires sont relancées automatiquement. Les relances manuelles ne consomment pas de quota de génération.</p>
        </div>
        <button onClick={() => retry()} disabled={!items.length} className="btn-secondary btn-sm">Relancer les échecs</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead><tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
            <th className="py-2.5 pr-4">Plateforme</th><th className="pr-4">Statut</th><th className="pr-4">Tentatives</th><th className="pr-4">Erreur</th><th></th>
          </tr></thead>
          <tbody>
            {items.map((x) => <tr key={x.id} className="border-b border-zinc-800/50">
              <td className="py-2.5 pr-4 font-semibold">{x.platform}</td>
              <td className="pr-4"><span className={x.status === "pending" ? "badge-yellow" : "badge-red"}>{x.status}</span></td>
              <td className="pr-4 text-zinc-400">{x.attempts}/{x.max_attempts}</td>
              <td className="max-w-[24rem] truncate pr-4 text-xs text-red-400">{x.error || "—"}</td>
              <td><button onClick={() => retry(x.id)} className="btn-secondary btn-sm">Relancer</button></td>
            </tr>)}
            {!items.length && <tr><td colSpan={5} className="py-8 text-center text-zinc-500">Aucun échec de publication à traiter.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
