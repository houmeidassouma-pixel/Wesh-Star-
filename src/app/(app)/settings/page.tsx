import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getAccess } from "@/lib/access";
import PasswordForm from "@/components/PasswordForm";
import Link from "next/link";
import AdControls from "@/components/AdControls";
import DataSaverSettings from "@/components/DataSaverSettings";

export default async function SettingsPage() {
  const t = getDictionary(getLang());
  const access = await getAccess();

  return (
    <div className="space-y-8">
      {/* Settings Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-950/50 via-zinc-900/90 to-zinc-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="badge-violet uppercase font-bold text-[11px]">
              CONFIGURATION COMPTE
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            ⚙️ Paramètres <span className="grad-text-violet">& Profil</span>
          </h1>
          <p className="text-sm text-zinc-300">
            Gérez vos informations de compte, votre mot de passe, vos préférences d'affichage et l'économie de données.
          </p>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="card animate-fade-up p-6 border-zinc-800">
        <h2 className="font-bold text-lg text-white mb-4">{t.account}</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
            <dt className="label">{t.email}</dt>
            <dd className="font-semibold text-white mt-1">{access.user!.email}</dd>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
            <dt className="label">{t.current_plan}</dt>
            <dd className="mt-1">
              <span className={access.isAdmin ? "badge-yellow" : "badge-violet"}>
                {access.isAdmin
                  ? "ADMIN"
                  : access.planKey === "free"
                  ? t.plan_free
                  : access.settings.plans.monthlyTiers.find(
                      (x) => x.id === access.planKey
                    )?.name ||
                    t["plan_" + access.planKey] ||
                    access.planKey}
              </span>
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
            <dt className="label">{t.member_since}</dt>
            <dd className="text-zinc-300 font-medium mt-1">
              {new Date(access.profile?.created_at || Date.now()).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4 p-6 border-zinc-800">
        <div>
          <h2 className="font-bold text-white text-base">💳 Facturation et abonnement</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Consultez vos crédits vidéo, réclamations et historique de paiement.
          </p>
        </div>
        <Link href="/billing" className="btn-primary btn-md">
          Ouvrir la facturation →
        </Link>
      </div>

      <DataSaverSettings />
      <AdControls />
      <PasswordForm t={t} />
    </div>
  );
}
