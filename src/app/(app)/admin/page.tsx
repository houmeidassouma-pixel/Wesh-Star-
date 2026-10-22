import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/account/admin";
import StatCard from "@/components/StatCard";
import AdminRoleForm from "@/components/AdminRoleForm";
import SubscriptionForm from "@/components/SubscriptionForm";
import SettingsForm from "@/components/SettingsForm";
import GenerationActions from "@/components/GenerationActions";
import ModeratorsPanel from "@/components/ModeratorsPanel";
import PlatformStatus from "@/components/PlatformStatus";
import SocialAccounts from "@/components/SocialAccounts";
import SocialRetryPanel from "@/components/SocialRetryPanel";
import SocialPerformancePanel from "@/components/SocialPerformancePanel";
import PaymentRequestsPanel from "@/components/PaymentRequestsPanel";
import TreasuryPanel from "@/components/TreasuryPanel";
import WalletsPanel from "@/components/WalletsPanel";
import CreatorEconomyPanel from "@/components/CreatorEconomyPanel";
import UserActions from "@/components/UserActions";
import VerifiedBadge from "@/components/VerifiedBadge";
import V5FeatureCenter from "@/components/V5FeatureCenter";
import PaymentMethodsV5 from "@/components/PaymentMethodsV5";
import QuotaManagementPanel from "@/components/QuotaManagementPanel";
import MonthlyQuotaPlansForm from "@/components/MonthlyQuotaPlansForm";
import AdsManager from "@/components/AdsManager";
import { MOD_PERMISSIONS } from "@/lib/permissions";
import CommunityModerationPanel from "@/components/CommunityModerationPanel";
import PromotionPanel from "@/components/PromotionPanel";
import CreatorMonetizationAdminPanel from "@/components/CreatorMonetizationAdminPanel";
import CreatorAdRevenueAdminPanel from "@/components/CreatorAdRevenueAdminPanel";

export default async function AdminPage() {
  const t = getDictionary(getLang());
  const access = await getAccess();
  if (!access.user) redirect("/login");
  if (!access.isAdmin) redirect(access.isStaff ? "/moderator" : "/dashboard");

  const admin = createAdminClient();
  const settings = await getSettings();
  const { data: modsRaw } = await admin.from("profiles").select("id,email,username,permissions").eq("role", "moderator");

  const { data: profiles } = await admin.from("profiles").select("*").order("created_at", { ascending: false });
  const { data: generations } = await admin.from("generations").select("*").order("created_at", { ascending: false }).limit(100);
  const { data: logs } = await admin.from("moderation_log").select("*").order("created_at", { ascending: false }).limit(50);
  const { data: socialFailures } = await admin.from("social_publications").select("*").in("status", ["failed", "pending"]).order("created_at", { ascending: false }).limit(100);
  const { data: socialMetrics } = await admin.from("social_metrics").select("*").order("score", { ascending: false }).limit(200);
  const { data: adEvents } = await admin.from("ad_events").select("campaign_id,event_type,created_at").order("created_at", { ascending: false }).limit(10000);
  const { data: communityPosts } = await admin.from("community_posts").select("*").order("created_at", { ascending: false }).limit(100);
  const communityWithMeta = await Promise.all((communityPosts || []).map(async (p:any) => {
    const { data: owner } = await admin.from("profiles").select("email").eq("id", p.user_id).maybeSingle();
    const { count: reports } = await admin.from("community_reports").select("id", { count: "exact", head: true }).eq("post_id", p.id);
    return { ...p, email: owner?.email || "—", reports: reports || 0 };
  }));

  // ---- statistics ----
  const { count: totalUsers } = await admin.from("profiles").select("id", { count: "exact", head: true });
  const { count: totalVideos } = await admin.from("generations").select("id", { count: "exact", head: true });
  const { count: processing } = await admin.from("generations").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]);
  const { count: completed } = await admin.from("generations").select("id", { count: "exact", head: true }).eq("status", "done");
  const { count: errors } = await admin.from("generations").select("id", { count: "exact", head: true }).eq("status", "failed");
  const { data: activeSubs } = await admin.from("profiles").select("subscription_tier").eq("subscription_status", "active");
  const paidPlanKeys = ["starter","basic","pro","creator","studio","business","agency","enterprise"] as const;
  const mrr = (activeSubs || []).reduce((sum: number, p: any) => {
    const key = paidPlanKeys.includes(p.subscription_tier);
    if (key) return sum + settings.plans[p.subscription_tier as typeof paidPlanKeys[number]].price;
    const dynamic = settings.plans.monthlyTiers.find((x) => x.id === p.subscription_tier);
    return sum + (dynamic ? dynamic.price : 0);
  }, 0);
  const legacyCounts = paidPlanKeys.map((k) => `${k} ${(activeSubs || []).filter((p: any) => p.subscription_tier === k).length}`);
  const dynamicCounts = settings.plans.monthlyTiers.filter((x) => x.enabled !== false).map((x) => `${x.minutes}m ${(activeSubs || []).filter((p: any) => p.subscription_tier === x.id).length}`);
  const planCounts = [...legacyCounts, ...dynamicCounts].join(" · ");

  // ---- chart: generations per day, last 14 days ----
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);
  const { data: recent } = await admin.from("generations").select("created_at")
    .gte("created_at", since.toISOString()).order("created_at", { ascending: true }).limit(1000);
  const days: { label: string; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      count: (recent || []).filter((r: any) => r.created_at.slice(0, 10) === key).length
    });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const sections = [
    { id: "users", label: t.users },
    { id: "generations", label: t.generations_admin },
    { id: "plans", label: t.plans_title },
    { id: "payments", label: "Paiements" },
    { id: "treasury", label: "Trésorerie FCFA" },
    { id: "wallets", label: "Portefeuilles" },
    { id: "settings", label: t.site_settings },
    { id: "moderation", label: t.moderation_log },
    { id: "ads", label: "Publicités" },
    { id: "community", label: "Wesh Star Feed" },
    { id: "promotions", label: "Sponsorisations" }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">🛡️ {t.admin_panel}</h1>
        <span className="badge-yellow">ADMIN · {t.free_admin_note}</span>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon="👥" label={t.total_users} value={totalUsers ?? 0} delay={0} />
        <StatCard icon="🎬" label={t.total_videos} value={totalVideos ?? 0} delay={0.05} />
        <StatCard icon="⚙️" label={t.processing} value={processing ?? 0} delay={0.1} />
        <StatCard icon="✅" label={t.completed} value={completed ?? 0} delay={0.15} />
        <StatCard icon="❌" label={t.errors_label} value={errors ?? 0} delay={0.2} />
        <StatCard icon="💶" label={t.mrr} value={mrr + " €"} hint={`${(activeSubs || []).length} ${t.active_subs} · ${planCounts}`} delay={0.25} />
      </div>

      {/* Chart */}
      <div className="card animate-fade-up p-6">
        <h2 className="font-bold">📊 {t.generations_per_day}</h2>
        <div className="mt-6 flex h-32 items-end gap-1.5 md:gap-2">
          {days.map((d, i) => (
            <div key={i} className="group flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-banana/70 transition-all duration-500 group-hover:bg-banana"
                  style={{ height: Math.max(4, (d.count / maxDay) * 100) + "%" }}
                  title={d.count + ""}
                />
              </div>
              <span className="text-[9px] text-zinc-600">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section nav */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <a key={s.id} href={"#" + s.id} className="btn-secondary btn-sm">{s.label}</a>
        ))}
      </div>

      {/* Users */}
      <ModeratorsPanel moderators={modsRaw || []} permDefs={MOD_PERMISSIONS} t={t} />

      <MonthlyQuotaPlansForm tiers={settings.plans.monthlyTiers || []} />
      <CreatorMonetizationAdminPanel profiles={profiles || []} />
      <CreatorAdRevenueAdminPanel />


      <QuotaManagementPanel profiles={profiles || []} />

      <PaymentRequestsPanel />

      <TreasuryPanel />

      <WalletsPanel />
      <CreatorEconomyPanel />

      <AdsManager settings={settings} metrics={adEvents || []} />

      <CommunityModerationPanel posts={communityWithMeta} />

      <PromotionPanel admin />

      <section id="v5" className="space-y-4 scroll-mt-6">
        <V5FeatureCenter />
        <PaymentMethodsV5 />
      </section>

      <section className="card animate-fade-up p-6">
        <h2 className="mb-3 font-bold">📡 Social Auto-Publishing — Status</h2>
        <PlatformStatus settings={settings} />
      </section>

      <section className="card animate-fade-up p-6">
        <h2 className="mb-3 font-bold">🔗 Comptes connectés</h2>
        <SocialAccounts />
      </section>

      <SocialRetryPanel items={socialFailures || []} />

      <SocialPerformancePanel metrics={socialMetrics || []} />


      <section id="users" className="card animate-fade-up scroll-mt-6 p-6">
        <h2 className="mb-4 font-bold">👥 {t.users}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="py-2.5 pr-4">{t.col_email}</th>
                <th className="pr-4">{t.role}</th>
                <th className="pr-4">{t.subscription_col}</th>
                <th>{t.col_created}</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {(profiles || []).map((p: any) => (
                <tr key={p.id} className="border-b border-zinc-800/50">
                  <td className="py-2.5 pr-4"><span className="inline-flex items-center gap-1.5">{p.email}{p.verified_badge && <VerifiedBadge />}</span></td>
                  <td className="pr-4"><AdminRoleForm userId={p.id} currentRole={p.role} /></td>
                  <td className="pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={p.subscription_status === "active" ? "badge-green" : "badge-zinc"}>
                        {p.subscription_status}{p.subscription_tier ? " · " + p.subscription_tier : ""}
                      </span>
                      <SubscriptionForm userId={p.id} status={p.subscription_status} tier={p.subscription_tier} t={t} monthlyTiers={settings.plans.monthlyTiers || []} />
                    </div>
                  </td>
                  <td className="text-zinc-500">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td><UserActions userId={p.id} blocked={p.blocked} warnings={p.warnings} verified={!!p.verified_badge} t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Generations */}
      <section id="generations" className="card animate-fade-up scroll-mt-6 p-6">
        <h2 className="mb-4 font-bold">🎬 {t.generations_admin}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="py-2.5 pr-4">{t.col_prompt}</th>
                <th className="pr-4">{t.video_length}</th>
                <th className="pr-4">{t.scenes_label}</th>
                <th className="pr-4">{t.status}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(generations || []).map((g: any) => (
                <tr key={g.id} className="border-b border-zinc-800/50">
                  <td className="max-w-[16rem] truncate py-2.5 pr-4">{g.prompt}</td>
                  <td className="pr-4 text-zinc-400">{g.target_seconds}s · {g.video_type}</td>
                  <td className="pr-4 text-zinc-400">{g.scenes}</td>
                  <td className="pr-4">
                    <span className={g.status === "done" ? "badge-green" : g.status === "failed" ? "badge-red" : "badge-yellow"}>{g.status}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {g.status === "done" && (
                        <a href={"/api/video/" + g.id} target="_blank" className="text-xs font-semibold text-banana hover:underline">{t.view}</a>
                      )}
                      <GenerationActions jobId={g.id} t={t} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Settings */}
      <section id="settings" className="card animate-fade-up scroll-mt-6 p-6">
        <h2 className="mb-4 font-bold">⚙️ {t.site_settings}</h2>
        <SettingsForm settings={settings} t={t} />
      </section>

      {/* Moderation */}
      <section id="moderation" className="card animate-fade-up scroll-mt-6 p-6">
        <h2 className="mb-4 font-bold">🛡️ {t.moderation_log}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="py-2.5 pr-4">{t.col_email}</th>
                <th className="pr-4">{t.col_prompt}</th>
                <th className="pr-4">{t.reason}</th>
                <th>{t.date}</th>
              </tr>
            </thead>
            <tbody>
              {(logs || []).map((l: any) => (
                <tr key={l.id} className="border-b border-zinc-800/50">
                  <td className="py-2.5 pr-4">{l.email}</td>
                  <td className="max-w-[14rem] truncate pr-4 text-zinc-400">{l.prompt}</td>
                  <td className="pr-4 text-red-400">{l.reason}</td>
                  <td className="text-zinc-500">{new Date(l.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && (
                <tr><td colSpan={4} className="py-8 text-center text-zinc-500">—</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
