import { quotaPeriodKey } from "@/lib/quota-period";
import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getAccess } from "@/lib/access";
import GenerateStudio from "@/components/GenerateStudio";
import VideoEditor from "@/components/VideoEditor";
import CreatorStudio from "@/components/CreatorStudio";
import AutoMontage from "@/components/AutoMontage";
import ProductAdStudio from "@/components/ProductAdStudio";
import CreatorMonetizationCard from "@/components/CreatorMonetizationCard";
import { createAdminClient } from "@/lib/account/admin";
import Link from "next/link";

export default async function GeneratePage() {
  const t = getDictionary(getLang());
  const access = await getAccess();
  let availableSeconds = access.isAdmin ? access.maxSeconds : access.maxSeconds;

  if (access.user && !access.isAdmin && !access.isModerator) {
    const month = quotaPeriodKey(access.profile);
    const day = new Date().toISOString().slice(0, 10);
    const admin = createAdminClient();
    const { data: monthCounter } = await admin
      .from("usage_counters")
      .select("seconds")
      .eq("user_id", access.user.id)
      .eq("period", month)
      .maybeSingle();
    const { data: dayCounter } = await admin
      .from("usage_counters")
      .select("seconds")
      .eq("user_id", access.user.id)
      .eq("period", day)
      .maybeSingle();
    const monthRemaining = Math.max(
      0,
      Number(access.limits.monthlySeconds || 0) - Number(monthCounter?.seconds || 0)
    );
    const dayRemaining = Math.max(
      0,
      Number(access.limits.dailySeconds || 0) - Number(dayCounter?.seconds || 0)
    );
    availableSeconds = Math.min(
      access.maxSeconds,
      10 * 60,
      monthRemaining,
      dayRemaining
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Studio Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-950/60 via-zinc-900/90 to-zinc-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-violet uppercase font-semibold text-[11px]">
              Studio IA V5
            </span>
            <span className="text-xs text-zinc-400">
              Génération Haute Résolution & Clips Multi-formats
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Studio de <span className="grad-text-violet">Création Vidéo IA</span>
          </h1>
          <p className="text-sm text-zinc-300">
            Créez vos clips vidéos de 10 secondes à 10 minutes avec nos algorithmes IA avancés. Votre génération s'exécute en arrière-plan sans interruption.
          </p>
          {access.settings.site.socialNetworkEnabled && (
            <div className="pt-2 text-xs text-violet-300 flex items-center gap-2">
              <span>💡 Conseil : Vous pouvez explorer le </span>
              <Link
                href="/community"
                className="font-bold underline text-violet-200 hover:text-white"
              >
                Feed Communautaire
              </Link>
              <span>pendant que votre vidéo génère !</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Studio Components */}
      <GenerateStudio
        t={t}
        maxSeconds={
          access.isAdmin || access.isModerator
            ? access.maxSeconds
            : Math.min(access.maxSeconds, 10 * 60)
        }
        availableSeconds={availableSeconds}
        clipSeconds={access.settings.video.clipSeconds}
      />

      <CreatorMonetizationCard />

      <div className="grid gap-6 lg:grid-cols-2">
        <CreatorStudio />
        <AutoMontage />
      </div>

      <VideoEditor />
      <ProductAdStudio />
    </div>
  );
}
