import { quotaPeriodKey } from "@/lib/quota-period";
import Link from "next/link";
import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import StatCard from "@/components/StatCard";
import VideoGrid from "@/components/VideoGrid";
import AdUnit from "@/components/AdUnit";

export default async function DashboardPage() {
  const t = getDictionary(getLang());
  const access = await getAccess();
  const admin = createAdminClient();

  const { count: total } = await admin
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", access.user!.id);

  let used = 0,
    usedSeconds = 0;
  if (!access.isAdmin) {
    const month = quotaPeriodKey(access.profile);
    const { data: counter } = await admin
      .from("usage_counters")
      .select("count, seconds")
      .eq("user_id", access.user!.id)
      .eq("period", month)
      .maybeSingle();
    used = counter?.count ?? 0;
    usedSeconds = Number(counter?.seconds ?? 0);
  }

  const purchasedCreditSeconds = access.isAdmin
    ? 0
    : Number(access.profile?.hour_credits_seconds || 0);
  const purchasedTokens = Math.floor(purchasedCreditSeconds / 10);
  const remainingSeconds = access.isAdmin
    ? 0
    : Math.max(0, access.limits.monthlySeconds - usedSeconds);
  const dynamicLabel =
    access.planKey !== "free"
      ? access.settings.plans.monthlyTiers.find((x) => x.id === access.planKey)?.name
      : null;
  const planLabel = access.isAdmin
    ? "ADMIN"
    : access.planKey === "free"
    ? t.plan_free
    : dynamicLabel || t["plan_" + access.planKey] || access.planKey;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-zinc-900/80 to-zinc-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="badge-violet uppercase font-semibold text-[11px]">
                {planLabel}
              </span>
              <span className="text-xs text-zinc-400">
                Wesh Star IA Studio & Network
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Bienvenue sur votre <span className="grad-text-violet">Tableau de Bord</span>
            </h1>
            <p className="text-sm text-zinc-400">
              Générez des vidéos IA haute qualité, publiez sur la communauté et suivez l’utilisation de vos crédits en temps réel.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/generate" className="btn-primary btn-md">
              ✦ Studio de Création IA
            </Link>
            <Link href="/shop" className="btn-secondary btn-md">
              🛍️ Wesh Star Shop
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="🎬"
          label={t.total_videos}
          value={total ?? 0}
          delay={0}
        />
        <StatCard
          icon="🪙"
          label="Crédits vidéo restants"
          value={
            access.isAdmin
              ? "∞"
              : Math.floor(remainingSeconds / 10) + " crédits"
          }
          hint={access.isAdmin ? t.unlimited : "Solde mensuel disponible"}
          delay={0.05}
        />
        <StatCard
          icon="📊"
          label="Crédits vidéo utilisés"
          value={
            access.isAdmin
              ? "∞"
              : Math.floor(usedSeconds / 10) + " crédits"
          }
          hint={
            access.isAdmin ? "Illimité" : `${used} vidéos générées ce mois`
          }
          delay={0.1}
        />
        <StatCard
          icon="🎁"
          label="Crédits vidéo achetés"
          value={access.isAdmin ? "∞" : purchasedTokens + " crédits"}
          hint={access.isAdmin ? "Illimité" : "Recharges supplémentaires"}
          delay={0.15}
        />
      </div>

      {/* Quick Action Navigation Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/generate"
          className="group card-hover p-5 border-violet-500/20 bg-gradient-to-b from-violet-950/20 to-zinc-900/80"
        >
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600/20 text-2xl text-violet-300 border border-violet-500/30 group-hover:scale-110 transition duration-300">
              🎬
            </span>
            <span className="text-xs font-semibold text-violet-400 group-hover:translate-x-1 transition">
              Ouvrir →
            </span>
          </div>
          <h3 className="mt-4 font-bold text-white text-base">Studio IA</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Créez des vidéos IA jusqu’à 10 min en haute qualité.
          </p>
        </Link>

        <Link
          href="/community"
          className="group card-hover p-5 border-blue-500/20 bg-gradient-to-b from-blue-950/20 to-zinc-900/80"
        >
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600/20 text-2xl text-blue-300 border border-blue-500/30 group-hover:scale-110 transition duration-300">
              🌟
            </span>
            <span className="text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition">
              Ouvrir →
            </span>
          </div>
          <h3 className="mt-4 font-bold text-white text-base">Wesh Feed</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Partagez vos créations et découvrez la communauté.
          </p>
        </Link>

        <Link
          href="/shop"
          className="group card-hover p-5 border-amber-500/20 bg-gradient-to-b from-amber-950/20 to-zinc-900/80"
        >
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-600/20 text-2xl text-amber-300 border border-amber-500/30 group-hover:scale-110 transition duration-300">
              🛍️
            </span>
            <span className="text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition">
              Ouvrir →
            </span>
          </div>
          <h3 className="mt-4 font-bold text-white text-base">Wesh Shop</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Marketplace de produits physiques & numériques.
          </p>
        </Link>

        <Link
          href="/promote"
          className="group card-hover p-5 border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-zinc-900/80"
        >
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600/20 text-2xl text-emerald-300 border border-emerald-500/30 group-hover:scale-110 transition duration-300">
              📣
            </span>
            <span className="text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition">
              Ouvrir →
            </span>
          </div>
          <h3 className="mt-4 font-bold text-white text-base">Sponsoriser</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Boostez la visibilité de vos vidéos et votre audience.
          </p>
        </Link>
      </div>

      {/* Credit Status Cards */}
      {!access.isAdmin && purchasedTokens > 0 && (
        <div className="card animate-fade-up border-amber-400/20 bg-amber-400/5 p-6 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-amber-300 text-base">
                🎁 Crédits vidéo achetés
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Vous disposez de{" "}
                <b className="text-white">{purchasedTokens} crédits vidéo</b>{" "}
                supplémentaires. Ils prennent automatiquement le relais lorsque votre quota mensuel est atteint.
              </p>
            </div>
            <Link href="/billing" className="btn-secondary btn-sm">
              Gérer mes crédits →
            </Link>
          </div>
        </div>
      )}

      {!access.isAdmin && access.planKey !== "pro" && (
        <div className="card animate-fade-up flex flex-wrap items-center justify-between gap-4 border-violet-500/30 bg-gradient-to-r from-violet-950/40 via-zinc-900/90 to-zinc-950 p-6">
          <div>
            <h3 className="font-bold text-white text-base">
              ⭐ {t.upgrade_pro_title}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">{t.upgrade_pro_text}</p>
          </div>
          <Link href="/pricing" className="btn-primary btn-md">
            {t.upgrade} →
          </Link>
        </div>
      )}

      <AdUnit context="dashboard video creation AI Wesh Star IA" />

      {/* Video History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{t.your_videos}</h2>
            <p className="text-xs text-zinc-400">
              Retrouvez toutes vos générations vidéo récentes.
            </p>
          </div>
          <Link href="/generate" className="btn-primary btn-sm">
            ＋ {t.generate_new}
          </Link>
        </div>
        <VideoGrid t={t} />
      </div>
    </div>
  );
}
