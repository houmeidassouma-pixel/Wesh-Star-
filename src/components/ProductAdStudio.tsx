"use client";
import { useState } from "react";

export default function ProductAdStudio() {
  const [product, setProduct] = useState<File | null>(null);
  const [mode, setMode] = useState<"showcase" | "wear">("showcase");
  const [mannequin, setMannequin] = useState("adult man, stylish, realistic");
  const [seconds, setSeconds] = useState(5);
  const [brief, setBrief] = useState("Crée une publicité moderne et premium pour ce produit, avec une présentation claire de ses avantages et un appel à l'action.");
  const [job, setJob] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return setMsg("Ajoute d’abord une image de ton produit.");
    setBusy(true); setMsg(""); setJob(null);
    try {
      const form = new FormData(); form.append("file", product);
      const up = await fetch("/api/upload-image", { method: "POST", body: form });
      const ud = await up.json();
      if (!up.ok || !ud.ok) throw new Error(ud.error || "Upload du produit impossible");
      const r = await fetch("/api/product-ad", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: ud.path, mode, mannequin, seconds, brief })
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || "Impossible de lancer la publicité");
      setJob({ id: d.jobId, status: "processing", progress: 0 });
    } catch (e: any) { setMsg(e.message || "Erreur"); }
    finally { setBusy(false); }
  };

  const poll = async (id: string) => {
    try {
      const r = await fetch("/api/product-ad/status?jobId=" + encodeURIComponent(id), { cache: "no-store" });
      const d = await r.json();
      setJob((j: any) => ({ ...j, ...d }));
      if (d.status === "processing") setTimeout(() => poll(id), 2500);
    } catch { setTimeout(() => poll(id), 4000); }
  };
  if (job?.id && job.status === "processing" && !job._started) { job._started = true; setTimeout(() => poll(job.id), 1500); }

  return <section className="card p-6 space-y-5">
    <div>
      <h2 className="text-xl font-bold">🛍️ Publicité produit avec mannequin</h2>
      <p className="mt-1 text-sm text-zinc-500">Un client apporte une photo de son produit et Wesh Star IA prépare une vidéo publicitaire à partir de cette référence.</p>
    </div>
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm"><span className="lab">📦 Produit du client</span><input type="file" accept="image/*" onChange={e=>setProduct(e.target.files?.[0]||null)} className="input" /></label>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={()=>setMode("showcase")} className={`rounded-lg border p-3 text-left ${mode==="showcase"?"border-violet-400 bg-violet-500/10":"border-zinc-700"}`}><b>📦 Présenter le produit</b><span className="mt-1 block text-xs text-zinc-500">Le produit reste la référence principale de la publicité.</span></button>
        <button type="button" onClick={()=>setMode("wear")} className={`rounded-lg border p-3 text-left ${mode==="wear"?"border-violet-400 bg-violet-500/10":"border-zinc-700"}`}><b>🧑 Faire porter/utiliser le produit</b><span className="mt-1 block text-xs text-zinc-500">Pour vêtements, chaussures, lunettes, accessoires, etc. La fidélité dépend du modèle local.</span></button>
      </div>
      <label className="block text-sm"><span className="lab">🧍 Mannequin</span><input value={mannequin} onChange={e=>setMannequin(e.target.value)} className="input" placeholder="Ex : femme adulte, sportive, style premium" /></label>
      <label className="block text-sm"><span className="lab">✍️ Brief publicitaire</span><textarea value={brief} onChange={e=>setBrief(e.target.value)} className="input min-h-28" placeholder="Décris la publicité : décor, mouvement, arguments, style…" /></label>
      <label className="block text-sm"><span className="lab">⏱️ Durée du clip</span><select value={seconds} onChange={e=>setSeconds(Number(e.target.value))} className="input"><option value={5}>5 secondes</option><option value={8}>8 secondes</option><option value={10}>10 secondes</option></select></label>
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-500"><b className="text-zinc-300">Local :</b> la photo du produit reste dans l’infrastructure Wesh Star IA et sert de référence au moteur vidéo local. Pour un vêtement/une chaussure, le mode “porter/utiliser” demande un modèle local spécialisé pour garantir une fidélité parfaite.</div>
      {msg && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{msg}</p>}
      <button disabled={busy || job?.status === "processing"} className="btn-primary btn-lg w-full">{busy ? "Préparation…" : job?.status === "processing" ? `Génération ${job.progress || 0}%…` : "🎬 Créer la publicité"}</button>
    </form>
    {job?.status === "done" && <div className="space-y-3"><video controls className="w-full rounded-xl border border-zinc-800" src={job.url}/><a className="btn-primary btn-sm inline-block" href={job.url + "?download=1"}>⬇ Télécharger la publicité</a></div>}
    {job?.status === "failed" && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{job.error || "La publicité a échoué."}</p>}
  </section>;
}
