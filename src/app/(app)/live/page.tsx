import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import LiveRoom from "@/components/LiveRoom";

export default async function LivePage() {
  const access = await getAccess();
  if (!access.user) redirect("/login");

  return (
    <div className="space-y-8">
      {/* Live Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-gradient-to-r from-red-950/40 via-zinc-900/90 to-zinc-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="badge-red uppercase font-bold text-[11px] animate-pulse">
              ● EN DIRECT
            </span>
            <span className="text-xs text-zinc-400">
              Diffusion Streaming & Interactions
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            📡 Scène <span className="text-red-400">LIVE Stream</span>
          </h1>
          <p className="text-sm text-zinc-300">
            Rejoignez la scène, échangez avec le public, faites des cadeaux et ouvrez des coffres en pièces Wesh Star IA.
          </p>
        </div>
      </div>

      <LiveRoom />
    </div>
  );
}
