import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import PromotionPanel from "@/components/PromotionPanel";

export default async function PromotePage() {
  const access = await getAccess();
  if (!access.user) redirect("/login");

  return (
    <div className="space-y-8">
      {/* Promote Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900/90 to-zinc-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="badge-green uppercase font-bold text-[11px]">
              CAMPAGNES & BOOSTER
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            📣 <span className="text-emerald-400">Sponsorisation</span> Vidéo & Live
          </h1>
          <p className="text-sm text-zinc-300">
            Propulsez la visibilité de vos vidéos publiques et sessions LIVE auprès de toute la communauté Wesh Star IA.
          </p>
        </div>
      </div>

      <PromotionPanel />
    </div>
  );
}
