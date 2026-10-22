import { quotaPeriodKey } from "@/lib/quota-period";
import Link from "next/link";
import { getAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import BillingHistory from "@/components/BillingHistory";
import StripePortalButton from "@/components/StripePortalButton";
import { createAdminClient } from "@/lib/account/admin";

export default async function BillingPage() {
  const access = await getAccess();
  const settings = await getSettings();
  let planRemainingSeconds = 0;
  if (!access.isAdmin) {
    const month = quotaPeriodKey(access.profile);
    const { data: counter } = await createAdminClient()
      .from("usage_counters")
      .select("seconds")
      .eq("user_id", access.user.id)
      .eq("period", month)
      .maybeSingle();
    planRemainingSeconds = Math.max(
      0,
      Number(access.limits.monthlySeconds || 0) - Number(counter?.seconds || 0)
    );
  }
  const remainingTokens = access.isAdmin
    ? 0
    : Math.floor(planRemainingSeconds / 10);
  const purchasedTokens = access.isAdmin
    ? 0
    : Math.floor(Number(access.profile?.hour_credits_seconds || 0) / 10);
  const dynamicPlan = settings.plans.monthlyTiers.find(
    (x) => x.id === access.planKey
  );
  const plan = access.isAdmin
    ? "ADMIN"
    : access.planKey === "free"
    ? "Gratuit"
    : String(
        dynamicPlan?.name ||
          (settings.plans as any)[access.planKey]?.name ||
          access.planKey
      );
  const planPrice =
    access.isAdmin || access.planKey === "free"
      ? 0
      : Number(
          dynamicPlan?.price ||
            (settings.plans as any)[access.planKey]?.price ||
            0
        );

  return (
    <div className="space-y-8">
      {/* Billing Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-950/50 via-zinc-900/90 to-zinc-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="badge-violet uppercase font-bold text-[11px]">
                GESTION DU COMPTE & SOLDE
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              💳 Abonnement <span className="grad-text-violet">& Paiements</span>
            </h1>
            <p className="text-sm text-zinc-300">
              Gérez votre forfait, suivez votre solde de crédits vidéo et consultez votre historique de facturation.
            </p>
          </div>
          <Link href="/pricing" className="btn-primary btn-md">
            Voir les forfaits & renouveler →
          </Link>
        </div>
      </div>

      {/* Credit Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5 border-violet-500/20 bg-gradient-to-b from-violet-950/20 to-zinc-900/80">
          <div className="text-xs uppercase tracking-wider font-semibold text-violet-400">
            Abonnement actuel
          </div>
          <div className="mt-2 text-2xl font-black text-white">{plan}</div>
          {!access.isAdmin && access.planKey !== "free" && (
            <div className="mt-1 text-xs text-zinc-400">
              {planPrice.toFixed(2)} € / mois ·{" "}
              {access.profile?.stripe_subscription_id
                ? "Stripe récurrent"
                : "Renouvellement manuel"}
            </div>
          )}
          {!access.isAdmin && (
            <Link
              href="/pricing"
              className="mt-4 inline-flex btn-secondary btn-sm"
            >
              Changer de plan
            </Link>
          )}
        </div>

        <div className="card p-5 border-amber-500/20 bg-gradient-to-b from-amber-950/20 to-zinc-900/80">
          <div className="text-xs uppercase tracking-wider font-semibold text-amber-400">
            Crédits vidéo restants
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {access.isAdmin ? "∞" : `${remainingTokens} crédits`}
          </div>
          {!access.isAdmin && (
            <div className="mt-1 text-xs text-zinc-400">
              Solde disponible pour ce cycle (1 min = 6 crédits)
            </div>
          )}
          {!access.isAdmin && (
            <Link
              href="/pricing"
              className="mt-4 inline-flex btn-primary btn-sm"
            >
              Voir les forfaits
            </Link>
          )}
        </div>

        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
            Crédits vidéo achetés
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {access.isAdmin ? "∞" : `${purchasedTokens} crédits`}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Solde acheté hors abonnement
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
            Crédits vidéo du plan
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {access.isAdmin
              ? "∞"
              : `${Math.floor(access.limits.monthlySeconds / 10)} crédits`}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Quota mensuel inclus dans votre abonnement
          </div>
        </div>
      </div>

      {!access.isAdmin && access.profile?.stripe_customer_id && (
        <div className="card p-6 border-zinc-800">
          <h2 className="font-bold text-lg text-white">
            🔁 Gestion du prélèvement automatique
          </h2>
          <p className="mt-1 mb-4 text-sm text-zinc-400">
            Gérez votre mode de paiement ou annulez vos abonnements récurrents Stripe.
          </p>
          <StripePortalButton />
        </div>
      )}

      <div className="card p-6 border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-2">
          📄 Historique des paiements et reçus
        </h2>
        <p className="text-sm text-zinc-400 mb-6">
          Liste complète de vos transactions, reçus et factures d'achat.
        </p>
        <BillingHistory />
      </div>
    </div>
  );
}
