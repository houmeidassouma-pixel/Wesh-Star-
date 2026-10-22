"use client";

import { useState } from "react";

export default function SubscriptionForm({ userId, status, tier, t, monthlyTiers = [] }: { userId: string; status: string; tier: string | null; t: Record<string, string>; monthlyTiers?: { id: string; name: string; minutes: number; enabled?: boolean }[] }) {
  const [st, setSt] = useState(status);
  const [tr, setTr] = useState(tier || "starter");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await fetch("/api/admin/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status: st, tier: tr })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <span className="flex items-center gap-2">
      <select value={st} onChange={(e) => setSt(e.target.value)}
        className="input !w-auto !px-2 !py-1 text-xs">
        <option value="active">{t.activate}</option>
        <option value="inactive">{t.deactivate}</option>
      </select>
      <select value={tr} onChange={(e) => setTr(e.target.value)}
        className="input !w-auto !px-2 !py-1 text-xs">
        {(["starter","basic","pro","creator","studio","business","agency","enterprise"] as const).map((k) => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
        {monthlyTiers.filter((x) => x.enabled !== false).map((x) => <option key={x.id} value={x.id}>{x.name} · {x.minutes} min/mois</option>)}
      </select>
      <button onClick={save} className="text-xs font-bold text-banana hover:underline">{saved ? "✓" : "→"}</button>
    </span>
  );
}
