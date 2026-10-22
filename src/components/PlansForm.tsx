"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteSettings } from "@/lib/settings";

export default function PlansForm({ settings, t }: { settings: SiteSettings; t: Record<string, string> }) {
  const [plans, setPlans] = useState(JSON.parse(JSON.stringify(settings.plans)));
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const set = (plan: string, key: string, value: any) =>
    setPlans((p: any) => ({ ...p, [plan]: { ...p[plan], [key]: value } }));

  const save = async () => {
    await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plans)
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  };

  const field = (label: string, plan: string, key: string) => (
    <label className="block text-sm">
      <span className="text-zinc-400">{label}</span>
      <input type="number" min={0} value={plans[plan][key]}
        onChange={(e) => set(plan, key, Number(e.target.value))}
        className="input mt-1" />
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {(["free", "starter", "basic", "pro", "creator", "studio", "business", "agency", "enterprise"] as const).map((plan) => (
          <div key={plan} className="card space-y-3 p-5">
            <h3 className="font-bold">{t["plan_" + plan] || plan}</h3>
            {field(t.price_eur, plan, "price")}
            {field(t.max_seconds, plan, "maxSeconds")}
            {field(t.jobs_max, plan, "monthlyJobs")}
            {field(t.daily_jobs, plan, "dailyJobs")}
            {field("Quota vidéo mensuel (secondes)", plan, "monthlySeconds")}
            {field("Quota vidéo quotidien (secondes)", plan, "dailySeconds")}
            {field(t.plan_max_scenes, plan, "maxScenes")}
            {field(t.plan_max_cost, plan, "maxJobCostEur")}
          </div>
        ))}
      </div>
      <button onClick={save} className="btn-primary btn-md">
        {saved ? t.saved : t.save}
      </button>
      <p className="text-xs text-zinc-500">Paiement : Wesh Star IA Direct. Les prix sont gérés localement par Wesh Star IA, sans prestataire externe.</p>
    </div>
  );
}
