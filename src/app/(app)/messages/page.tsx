import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import PrivateMessagesPanel from "@/components/PrivateMessagesPanel";

export default async function MessagesPage() {
  const access = await getAccess();
  if (!access.user) redirect("/login");

  return (
    <div className="space-y-8">
      {/* Messages Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-950/50 via-zinc-900/90 to-zinc-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="badge-violet uppercase font-bold text-[11px]">
              MESSAGERIE PRIVÉE
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            💬 Messages <span className="grad-text-violet">Privés</span>
          </h1>
          <p className="text-sm text-zinc-300">
            Échangez en direct avec les autres membres et créateurs de la communauté Wesh Star IA.
          </p>
        </div>
      </div>

      <PrivateMessagesPanel currentUserId={access.user.id} />
    </div>
  );
}
