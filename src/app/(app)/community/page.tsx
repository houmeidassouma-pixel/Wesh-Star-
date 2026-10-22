import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { listCommunityPosts } from "@/lib/community";
import CommunityFeed from "@/components/CommunityFeed";
import AppAdRail from "@/components/AppAdRail";

export default async function CommunityPage({
  searchParams
}: {
  searchParams?: { post?: string };
}) {
  const access = await getAccess();
  if (!access.user) redirect("/login");
  const settings = await getSettings();
  if (!settings.site.communityEnabled && !settings.site.socialNetworkEnabled)
    notFound();
  const requestedPost =
    typeof searchParams?.post === "string"
      ? searchParams.post.slice(0, 100)
      : undefined;
  const posts = await listCommunityPosts(
    access.user.id,
    "for-you",
    requestedPost
  );

  return (
    <div className="space-y-8">
      {/* Community Banner Header */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-950/60 via-zinc-900/90 to-zinc-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                🌟 Wesh Star <span className="grad-text-violet">Feed</span>
              </h1>
              <span className="badge-violet uppercase font-bold text-[11px]">
                COMMUNAUTÉ
              </span>
            </div>
            <p className="text-sm text-zinc-300">
              Découvrez, aimez, commentez et envoyez des cadeaux sur les vidéos créées par la communauté Wesh Star IA.
            </p>
            {requestedPost && (
              <p className="text-xs font-semibold text-violet-300">
                Vidéo partagée · soumise aux paramètres de visibilité du créateur.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/messages" className="btn-secondary btn-md">
              ✉ Messages privés
            </Link>
            <Link href="/generate" className="btn-primary btn-md">
              ✦ Créer une vidéo
            </Link>
          </div>
        </div>
      </div>

      <CommunityFeed
        initialPosts={posts}
        currentUserId={access.user.id}
        adSlot={<AppAdRail />}
        adEveryPosts={settings.site.ads.feedAdEveryPosts}
        maxFeedAds={settings.site.ads.maxFeedAdsPerVisit}
      />
    </div>
  );
}
