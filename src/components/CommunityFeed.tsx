"use client";
import { Fragment, useState, type ReactNode } from "react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useEffect } from "react";
import { errText } from "@/lib/creator-messages";

export default function CommunityFeed({ initialPosts, currentUserId, adSlot = null, adEveryPosts = 5, maxFeedAds = 3 }: { initialPosts: any[]; currentUserId: string; adSlot?: ReactNode; adEveryPosts?: number; maxFeedAds?: number }) {
  const [posts, setPosts] = useState(initialPosts);
  const feedAdEvery = Math.max(1, Math.min(30, Math.floor(adEveryPosts || 5)));
  const feedAdLimit = Math.max(0, Math.min(20, Math.floor(maxFeedAds || 0)));
  const [tab, setTab] = useState("for-you");
  const [comment, setComment] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, any[] | null>>({});
  const [eco, setEco] = useState<any>(null);
  const [giftFor, setGiftFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [remixPostId, setRemixPostId] = useState<string | null>(null);
  const [remixSounds, setRemixSounds] = useState<Array<{id:string;title:string;creator:string}>>([]);
  const [remixBusy, setRemixBusy] = useState(false);
  useEffect(() => { fetch("/api/creator/economy").then(r => r.ok ? r.json() : null).then(setEco).catch(() => undefined); }, []);
  const openAddSound = async (postId: string) => {
    setRemixPostId(postId);
    const r = await fetch("/api/sounds/library");
    const d = r.ok ? await r.json() : { sounds: [] };
    setRemixSounds(Array.isArray(d.sounds) ? d.sounds : []);
    if (!r.ok) setNote("Impossible de charger les sons réutilisables.");
  };
  const addSoundToPost = async (soundId: string) => {
    if (!remixPostId || !soundId) return;
    if (!window.confirm("Ajouter réellement cette musique au fichier vidéo publié ? Le fichier sera remplacé par la version mixée.")) return;
    setRemixBusy(true);
    const r = await fetch("/api/community/add-sound", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: remixPostId, soundId }) });
    const d = await r.json().catch(() => ({}));
    setRemixBusy(false);
    setNote(r.ok ? "🎵 Son ajouté à la vidéo publiée." : (d.message || errText(d.error)));
    if (r.ok) { setRemixPostId(null); await load(); }
  };

  const toggleSoundFav = async (soundId: string) => {
    const r = await fetch("/api/sounds/favorite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ soundId }) });
    const d = await r.json().catch(() => ({}));
    setNote(r.ok ? (d.favorite ? "⭐ Son ajouté à tes favoris." : "Son retiré des favoris.") : errText(d.error));
    load();
  };
  const sendGift = async (postId: string, g: any) => {
    if (!window.confirm(`Envoyer ${g.emoji} ${g.name} pour ${g.tokens} pièce(s) ? Ce montant sera débité de ton portefeuille de pièces.`)) return;
    const r = await fetch("/api/gifts/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, giftId: g.id }) });
    const d = await r.json().catch(() => ({}));
    setNote(r.ok ? `${g.emoji} Cadeau envoyé ! Il te reste ${d.balance} pièce(s).` : errText(d.error));
    if (r.ok) { setGiftFor(null); setEco((e: any) => e ? { ...e, coins: d.balance } : e); load(); }
  };

  const load = async (nextTab = tab) => {
    const r = await fetch(`/api/community/list?tab=${encodeURIComponent(nextTab)}`);
    if (r.ok) setPosts((await r.json()).posts || []);
  };
  const like = async (id: string) => {
    await fetch("/api/community/like", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: id }) });
    load();
  };
  const follow = async (id: string) => {
    await fetch("/api/community/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id }) });
    load();
  };
  const sendComment = async (id: string) => {
    const body = (comment[id] || "").trim();
    if (!body) return;
    await fetch("/api/community/comment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: id, body }) });
    setComment((c) => ({ ...c, [id]: "" }));
    if (openComments[id]) await fetchComments(id);
    load();
  };
  const fetchComments = async (id: string) => {
    const r = await fetch(`/api/community/comments?postId=${encodeURIComponent(id)}`);
    const list = r.ok ? ((await r.json()).comments || []) : [];
    setOpenComments((o) => ({ ...o, [id]: list }));
  };
  const toggleComments = async (id: string) => {
    if (openComments[id]) { setOpenComments((o) => ({ ...o, [id]: null })); return; }
    await fetchComments(id);
  };
  const trackView = async (postId: string, watchedSeconds: number) => {
    if (watchedSeconds < 5) return;
    fetch("/api/community/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, watchedSeconds }) }).catch(() => undefined);
  };
  const report = async (id: string) => {
    const reason = window.prompt("Pourquoi signales-tu cette vidéo ?") || "Autre";
    await fetch("/api/community/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: id, reason }) });
    window.alert("Signalement envoyé au modérateur.");
  };
  const sharePost = async (post: any) => {
    const url = `${window.location.origin}/community?post=${encodeURIComponent(post.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: post.title || "Vidéo Wesh Star IA", text: post.description || "Regarde cette vidéo sur Wesh Star IA", url });
      else { await navigator.clipboard.writeText(url); setNote("Lien de la vidéo copié. Tu peux le partager."); }
    } catch (error: any) {
      if (error?.name !== "AbortError") setNote("Impossible de partager automatiquement. Copie ce lien : " + url);
    }
  };
  const switchTab = async (nextTab: string) => {
    setTab(nextTab);
    const r = await fetch(`/api/community/list?tab=${encodeURIComponent(nextTab)}`);
    if (r.ok) setPosts((await r.json()).posts || []);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[["for-you", "✨ Pour toi"], ["trending", "🔥 Tendances"], ["following", "👥 Suivis"]].map(([k, label]) => (
          <button key={k} onClick={() => switchTab(k)} className={tab === k ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>{label}</button>
        ))}
      </div>
      {note && <p role="status" className="rounded-lg border border-zinc-800 p-3 text-sm">{note}</p>}
      {posts.length === 0 && <div className="card p-12 text-center text-zinc-500">Aucune vidéo publiée pour le moment.</div>}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((p: any, i: number) => (
          <Fragment key={p.id}>
          {adSlot && feedAdLimit > 0 && i > 0 && i % feedAdEvery === 0 && i / feedAdEvery <= feedAdLimit && <div className="col-span-full" aria-label="Publicité">{adSlot}</div>}
          <article className="card-hover overflow-hidden">
            <div className="aspect-[9/14] bg-black">
              {p.video_url ? <video controls preload="metadata" className="h-full w-full object-cover" src={p.video_url} onTimeUpdate={(e) => { const video = e.currentTarget; const current = video.currentTime; const previous = Number(video.dataset.previousPlaybackTime || current); const delta = current - previous; video.dataset.previousPlaybackTime = String(current); if (delta > 0 && delta <= 2.5) { const watched = Number(video.dataset.accumulatedWatchedSeconds || 0) + delta; video.dataset.accumulatedWatchedSeconds = String(watched); const lastSent = Number(video.dataset.lastViewPing || 0); if (watched >= 5 && watched >= lastSent + 5) { video.dataset.lastViewPing = String(watched); trackView(p.id, watched); } } }} /> : <div className="grid h-full place-items-center">🎬</div>}
            </div>
            <div className="p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">{p.promoted && <span className="mb-1 inline-flex rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">Sponsorisé</span>}<h2 className="truncate font-bold">{p.title}</h2><p className="flex items-center gap-1 text-xs text-zinc-500"><span className="truncate">@{p.handle || "créateur"}</span>{p.verified_badge && <VerifiedBadge />}</p></div>
                <button className="text-xs text-zinc-400 hover:text-white" onClick={() => report(p.id)}>⚑</button>
              </div>
              {p.description && <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{p.description}</p>}
              {p.sound_title && <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-zinc-900/60 px-2 py-1.5 text-xs"><span className="min-w-0 flex-1 truncate text-zinc-300">♪ {p.sound_title}</span>{p.sound_reusable && <><button onClick={() => toggleSoundFav(p.sound_id)} className="text-amber-300 hover:text-amber-200">{p.sound_favorite ? "★ Favori" : "☆ Favori"}</button><a href={`/generate?sound=${p.sound_id}`} className="text-violet-300 hover:text-violet-200">🎬 Utiliser ce son</a></>}</div>}
              {p.user_id === currentUserId && <div className="mt-2">
                <button onClick={() => remixPostId === p.id ? setRemixPostId(null) : openAddSound(p.id)} className="btn-secondary btn-sm">🎵 Ajouter un son à ma vidéo publiée</button>
                {remixPostId === p.id && <div className="mt-2 rounded-lg border border-zinc-800 p-3 space-y-2">
                  <p className="text-xs text-zinc-400">Choisis un son public autorisé. Le mixage modifie le fichier vidéo publié et conserve la publication.</p>
                  {remixSounds.length === 0 ? <p className="text-xs text-zinc-500">Aucun son réutilisable disponible.</p> : remixSounds.map(s => <div key={s.id} className="flex items-center gap-2 text-xs"><span className="min-w-0 flex-1 truncate">♪ {s.title} · @{s.creator}</span><button disabled={remixBusy} onClick={() => addSoundToPost(s.id)} className="btn-primary btn-sm">{remixBusy ? "Mixage…" : "Ajouter"}</button></div>)}
                </div>}
              </div>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={() => like(p.id)} className={p.liked ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>❤️ {p.likes}</button>
                <button onClick={() => toggleComments(p.id)} className="text-xs text-zinc-500 hover:text-white">💬 {p.comments}</button>
                <button onClick={() => sharePost(p)} className="btn-secondary btn-sm" aria-label="Partager cette vidéo">↗ Partager</button>
                {eco?.giftsEnabled && p.user_id !== currentUserId && <button onClick={() => setGiftFor(giftFor === p.id ? null : p.id)} className="btn-secondary btn-sm">🎁{p.gift_tokens > 0 ? ` ${p.gift_tokens}` : ""}</button>}
                {p.user_id !== currentUserId && <button onClick={() => follow(p.user_id)} className="btn-secondary btn-sm ml-auto">{p.following ? "✓ Suivi" : "+ Suivre"}</button>}
              </div>
              {giftFor === p.id && eco && <div className="mt-3 rounded-lg border border-zinc-800 p-2"><p className="mb-2 text-xs text-zinc-400">Solde : {eco.coins || 0} pièces 🪙 · {eco.creatorSharePct}% du cadeau va au créateur</p><div className="flex flex-wrap gap-2">{eco.gifts.map((g: any) => <button key={g.id} onClick={() => sendGift(p.id, g)} className="btn-secondary btn-sm">{g.animationUrl && /\.mp4(\?|$)/i.test(g.animationUrl) ? <video src={g.animationUrl} className="inline-block h-6 w-6 object-contain" autoPlay loop muted playsInline /> : g.imageUrl ? <img src={g.animationUrl || g.imageUrl} alt="" className="inline-block h-6 w-6 object-contain" /> : g.emoji} {g.name} · {g.tokens}🪙</button>)}</div></div>}
              {openComments[p.id] && (
                <div className="mt-3 max-h-40 space-y-2 overflow-y-auto rounded-lg bg-zinc-900/60 p-2 text-xs">
                  {openComments[p.id]!.length === 0 && <p className="text-zinc-500">Aucun commentaire.</p>}
                  {openComments[p.id]!.map((c: any) => (
                    <p key={c.id}><span className="inline-flex items-center gap-1 font-semibold text-zinc-300">@{c.handle}{c.verified_badge && <VerifiedBadge />}</span> <span className="text-zinc-400">{c.body}</span></p>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <input value={comment[p.id] || ""} onChange={(e) => setComment((c) => ({ ...c, [p.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") sendComment(p.id); }} placeholder="Ajouter un commentaire…" className="input min-w-0 flex-1" />
                <button onClick={() => sendComment(p.id)} className="btn-secondary btn-sm">↵</button>
              </div>
            </div>
          </article>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
