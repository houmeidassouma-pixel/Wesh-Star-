import Link from "next/link";
import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import VideoGrid from "@/components/VideoGrid";
import { getSettings } from "@/lib/settings";

export default async function VideosPage() {
  const t = getDictionary(getLang());
  const settings = await getSettings();

  return (
    <div className="space-y-8">
      {/* Videos Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-zinc-900/80 to-zinc-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="badge-violet uppercase font-semibold text-[11px]">
                GALERIE VIDÉO
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Mes <span className="grad-text-violet">Créations Vidéo</span>
            </h1>
            <p className="text-sm text-zinc-400">
              Gérez, prévisualisez, téléchargez et publiez vos vidéos générées avec Wesh Star IA.
            </p>
          </div>
          <Link href="/generate" className="btn-primary btn-md">
            ＋ {t.generate_new}
          </Link>
        </div>
      </div>

      <VideoGrid
        t={t}
        communityEnabled={
          settings.site.communityEnabled || settings.site.socialNetworkEnabled
        }
      />
    </div>
  );
}
