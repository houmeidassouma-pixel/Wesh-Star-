import { quotaPeriodKey } from "@/lib/quota-period";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/account/admin";
import AppShell from "@/components/AppShell";
import AppAdRail from "@/components/AppAdRail";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const lang = getLang() || settings.site.defaultLocale;
  const t = { ...getDictionary(lang), site_name: settings.site.name || "Wesh Star IA" };
  const access = await getAccess();
  if (!access.user) redirect("/login");

  let displayRemainingSeconds: number | null = 0;
  let purchasedCreditSeconds = 0;
  if (!access.isAdmin) {
    const month = quotaPeriodKey(access.profile);
    const { data: counter } = await createAdminClient().from("usage_counters").select("seconds").eq("user_id", access.user.id).eq("period", month).maybeSingle();
    const usedSeconds = Number(counter?.seconds ?? 0);
    const planRemaining = Math.max(0, Number(access.limits.monthlySeconds || 0) - usedSeconds);
    displayRemainingSeconds = planRemaining;
    purchasedCreditSeconds = Number(access.profile?.hour_credits_seconds || 0);
  }

  return (
    <AppShell t={t} lang={lang} email={access.user.email ?? ""} role={access.role ?? "user"} siteName={settings.site.name} logoUrl={settings.site.logoUrl} logoEmoji={settings.site.logoEmoji} communityEnabled={settings.site.communityEnabled} socialNetworkEnabled={settings.site.socialNetworkEnabled} remainingSeconds={access.isAdmin ? null : displayRemainingSeconds} purchasedCreditSeconds={access.isAdmin ? null : purchasedCreditSeconds}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
        <main className="min-w-0">{children}</main>
        <aside className="hidden xl:block xl:sticky xl:top-6" aria-label="Publicité">
          <AppAdRail />
        </aside>
        <div className="xl:hidden">
          <AppAdRail />
        </div>
      </div>
    </AppShell>
  );
}
