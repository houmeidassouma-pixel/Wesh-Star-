import { getAccess } from "@/lib/access";
import { redirect } from "next/navigation";
import V5FeatureCenter from "@/components/V5FeatureCenter";
import PaymentMethodsV5 from "@/components/PaymentMethodsV5";

export default async function V5Page() {
  const access = await getAccess();
  if (!access.user) redirect("/login");

  return (
    <div className="space-y-8">
      {/* V5 Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-950/60 via-zinc-900/90 to-zinc-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="badge-violet uppercase font-semibold text-[11px]">
              V5 ARCHITECTURE
            </span>
            <span className="text-xs text-zinc-400">
              Moteur de Production Vidéo & Automatisation
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            🚀 Wesh Star IA <span className="grad-text-violet">V5 Engine</span>
          </h1>
          <p className="text-sm text-zinc-300">
            Moteur de rendu haute vitesse, automatisation des publications sociales et gestion unifiée des paiements & crédits.
          </p>
        </div>
      </div>

      <V5FeatureCenter />
      <PaymentMethodsV5 />
    </div>
  );
}
