import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import CoinWalletPanel from "@/components/CoinWalletPanel";

export default async function CoinsPage() {
  const access = await getAccess();
  if (!access.user) redirect("/login");

  return (
    <div className="space-y-8">
      {/* Coins Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-zinc-900/90 to-zinc-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="badge-yellow uppercase font-bold text-[11px]">
              PORTEFEUILLE DE PIÈCES
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            🪙 Pièces <span className="grad-text">Wesh Star IA</span>
          </h1>
          <p className="text-sm text-zinc-300">
            Achetez des pièces pour envoyer des cadeaux lors des LIVEs, féliciter les créateurs ou débloquer des bonus exclusifs.
          </p>
        </div>
      </div>

      <CoinWalletPanel />
    </div>
  );
}
