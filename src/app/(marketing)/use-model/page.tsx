import Link from "next/link";

export default async function UseModelPage({ searchParams }: { searchParams: { template?: string } }) {
  const template = String(searchParams?.template || "").slice(0, 3000);
  const encoded = encodeURIComponent(template);
  const studioPath = "/generate?template=" + encoded;
  const loginPath = "/login?next=" + encodeURIComponent(studioPath);
  return <div className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
    <div className="card p-6 sm:p-10">
      <div className="text-4xl">✨</div>
      <h1 className="mt-4 text-3xl font-extrabold">Utiliser ce modèle avec Wesh Star IA</h1>
      <p className="mt-3 text-zinc-400">Ouvre le Studio et adapte ce modèle pour créer ta propre vidéo. Vérifie les droits sur les éléments que tu réutilises et ne copie pas le contenu d’un autre créateur sans autorisation.</p>
      {template ? <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Modèle partagé</p><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{template}</p></div> : <p className="mt-6 rounded-xl border border-zinc-800 p-4 text-sm text-zinc-400">Aucun modèle n’a été joint à ce lien. Tu peux tout de même ouvrir le Studio et commencer une création.</p>}
      <div className="mt-6 flex flex-wrap gap-3"><Link href={loginPath} className="btn-primary btn-md">Ouvrir le Studio →</Link><Link href="/pricing" className="btn-secondary btn-md">Voir les offres</Link></div>
      <p className="mt-5 text-xs text-zinc-500">TikTok ne garantit pas l’ajout d’un bouton cliquable personnalisé directement sur chaque vidéo. Ce lien partageable fonctionne comme une porte d’entrée externe vers le Studio.</p>
    </div>
  </div>;
}
