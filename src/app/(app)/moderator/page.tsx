import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import StatCard from "@/components/StatCard";
import GenerationActions from "@/components/GenerationActions";
import ModeratorAutopilot from "@/components/ModeratorAutopilot";
import CommunityModerationPanel from "@/components/CommunityModerationPanel";
import { getSettings } from "@/lib/settings";

export default async function ModeratorPage() {
  const t = getDictionary(getLang());
  const access = await getAccess();
  const settings = await getSettings();
  if (!access.user) redirect("/login");
  if (!access.isStaff) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, role");
  const emailOf = (id: string) =>
    (profiles || []).find((p: any) => p.id === id)?.email || "—";

  const { count: total } = await admin
    .from("generations")
    .select("id", { count: "exact", head: true });
  const { count: processing } = await admin
    .from("generations")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "processing"]);
  const { count: failed } = await admin
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed");
  const { count: blocked } = await admin
    .from("moderation_log")
    .select("id", { count: "exact", head: true });

  const { data: generations } = await admin
    .from("generations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const { data: communityPosts } =
    settings.site.communityEnabled || settings.site.socialNetworkEnabled
      ? await admin
          .from("community_posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
      : { data: [] as any[] };
  const communityWithMeta = await Promise.all(
    (communityPosts || []).map(async (p: any) => {
      const owner = (profiles || []).find((x: any) => x.id === p.user_id);
      const { count: reports } = await admin
        .from("community_reports")
        .select("id", { count: "exact", head: true })
        .eq("post_id", p.id);
      return { ...p, email: owner?.email || "—", reports: reports || 0 };
    })
  );
  const { data: logs } =
    access.isAdmin || access.modPerms.viewLogs
      ? await admin
          .from("moderation_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50)
      : { data: [] };

  return (
    <div className="space-y-8">
      {/* Moderator Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-zinc-900/90 to-zinc-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="badge-yellow uppercase font-bold text-[11px]">
                ESPACE MODÉRATION
              </span>
              <span className={access.isAdmin ? "badge-yellow" : "badge-zinc"}>
                {access.isAdmin ? "ADMIN" : "MODERATOR"}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              🔍 File de <span className="grad-text">Modération</span>
            </h1>
            <p className="text-sm text-zinc-300">
              Contrôlez les vidéos générées, traitez les signalements communautaires et gérez l'autopilote de modération.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(access.modPerms).map(([k, v]) => (
          <span key={k} className={v ? "badge-green" : "badge-zinc"}>
            {k}: {v ? "✓" : "✕"}
          </span>
        ))}
      </div>

      <ModeratorAutopilot
        allowed={access.isModerator && access.modPerms.autopilot}
        promotionAllowed={access.isModerator && access.modPerms.promotion}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="🎬" label={t.total_videos} value={total ?? 0} delay={0} />
        <StatCard icon="⚙️" label={t.processing} value={processing ?? 0} delay={0.05} />
        <StatCard icon="❌" label={t.errors_label} value={failed ?? 0} delay={0.1} />
        <StatCard icon="🚫" label={t.mod_actions} value={blocked ?? 0} delay={0.15} />
      </div>

      <section className="card animate-fade-up scroll-mt-6 p-6 border-zinc-800">
        <h2 className="mb-4 font-bold text-lg text-white">🎬 {t.generations_admin}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-400">
                <th className="py-2.5 pr-4">{t.col_user}</th>
                <th className="pr-4">{t.col_prompt}</th>
                <th className="pr-4">{t.video_length}</th>
                <th className="pr-4">{t.status}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(generations || []).map((g: any) => (
                <tr key={g.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/40">
                  <td className="py-2.5 pr-4 text-zinc-400">{emailOf(g.user_id)}</td>
                  <td className="max-w-[16rem] truncate pr-4 text-zinc-200">{g.prompt}</td>
                  <td className="pr-4 text-zinc-400">{g.target_seconds}s · {g.video_type}</td>
                  <td className="pr-4">
                    <span className={g.status === "done" ? "badge-green" : g.status === "failed" ? "badge-red" : "badge-yellow"}>{g.status}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {g.status === "done" && (
                        <a href={"/api/video/" + g.id} target="_blank" className="text-xs font-semibold text-violet-400 hover:underline">{t.view}</a>
                      )}
                      <GenerationActions jobId={g.id} t={t} disabled={access.isViewer} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(settings.site.communityEnabled || settings.site.socialNetworkEnabled) && <CommunityModerationPanel posts={communityWithMeta} />}

      <section className="card animate-fade-up scroll-mt-6 p-6 border-zinc-800">
        <h2 className="mb-4 font-bold text-lg text-white">🚫 {t.moderation_log}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-400">
                <th className="py-2.5 pr-4">{t.col_user}</th>
                <th className="pr-4">{t.col_prompt}</th>
                <th className="pr-4">{t.reason}</th>
                <th>{t.date}</th>
              </tr>
            </thead>
            <tbody>
              {(logs || []).map((l: any) => (
                <tr key={l.id} className="border-b border-zinc-800/50">
                  <td className="py-2.5 pr-4 text-zinc-300">{l.email}</td>
                  <td className="max-w-[14rem] truncate pr-4 text-zinc-400">{l.prompt}</td>
                  <td className="pr-4 text-red-400 font-semibold">{l.reason}</td>
                  <td className="text-zinc-500">{new Date(l.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && (
                <tr><td colSpan={4} className="py-8 text-center text-zinc-500">— Aucun log —</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
