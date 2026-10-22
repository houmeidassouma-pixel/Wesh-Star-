"use client";
import { useEffect, useState } from "react";
import { BUILTIN_EFFECTS } from "@/lib/creator-effects";
import { errText } from "@/lib/creator-messages";
import PublishToWesh from "@/components/PublishToWesh";

export default function AutoMontage() {
  const [eco, setEco] = useState<any>(null);
  const [favs, setFavs] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [secs, setSecs] = useState(5);
  const [effectId, setEffectId] = useState("normal");
  const [soundMode, setSoundMode] = useState<"none" | "own" | "existing">("none");
  const [music, setMusic] = useState<File | null>(null);
  const [rights, setRights] = useState(false);
  const [favId, setFavId] = useState("");
  const [volume, setVolume] = useState(60);
  const [job, setJob] = useState<{ id: string; status: string; url?: string; error?: string } | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/creator/economy").then(r => r.ok ? r.json() : null).then(setEco).catch(() => undefined);
    fetch("/api/sounds/favorites").then(r => r.ok ? r.json() : null).then(d => d && setFavs(d.sounds || [])).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!job?.id || job.status !== "processing") return;
    const t = setInterval(async () => {
      const r = await fetch("/api/creator/auto-edit/status?jobId=" + job.id, { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (d.status === "done") setJob({ id: job.id, status: "done", url: d.url });
      else if (d.status === "failed" || !r.ok) setJob({ id: job.id, status: "failed", error: d.error || "Échec" });
    }, 2500);
    return () => clearInterval(t);
  }, [job?.id, job?.status]);

  if (!eco || !eco.autoEdit?.enabled) return eco && !eco.autoEdit?.enabled ? <section className="card p-6 text-sm text-zinc-500">Le montage automatique est désactivé par l'administrateur.</section> : null;
  const maxClips = eco.autoEdit.maxClips, maxSecs = eco.autoEdit.maxSecondsPerClip;
  const price = (id: string) => eco.effects.find((e: any) => e.id === id);
  const locked = (id: string) => { const e = price(id); return !!e && e.tier === "paid" && !eco.staff && !eco.unlocked.includes(id); };

  const start = async () => {
    setMsg("");
    if (!files.length) return setMsg("Choisis au moins une vidéo.");
    if (soundMode === "own" && (!music || !rights)) return setMsg("Choisis ta musique et confirme tes droits.");
    if (soundMode === "existing" && !favId) return setMsg("Choisis un son favori.");
    const f = new FormData();
    files.forEach(x => f.append("clips", x));
    f.append("secondsPerClip", String(secs)); f.append("effectId", effectId); f.append("soundMode", soundMode); f.append("soundVolume", String(volume));
    if (soundMode === "own" && music) { f.append("sound", music); f.append("rightsConfirmed", "true"); }
    if (soundMode === "existing") f.append("existingSoundId", favId);
    setBusy(true);
    const r = await fetch("/api/creator/auto-edit", { method: "POST", body: f });
    const d = await r.json().catch(() => ({})); setBusy(false);
    if (r.ok) setJob({ id: d.jobId, status: "processing" }); else setMsg(errText(d.error));
  };

  return <section className="card space-y-4 p-6">
    <div><h2 className="text-xl font-bold">✂️ Montage automatique</h2><p className="mt-1 text-sm text-zinc-400">Importe jusqu'à {maxClips} vidéos : Wesh Star les coupe ({maxSecs} s max chacune), les recadre en vertical 9:16, les assemble, applique l'effet et mixe la musique. Traitement sur le serveur.</p></div>
    <label className="block text-sm"><span className="lab">🎞️ Tes vidéos (dans l'ordre choisi)</span><input className="input" type="file" accept="video/*" multiple onChange={e => setFiles(Array.from(e.target.files || []).slice(0, maxClips))} /><span className="text-xs text-zinc-500">{files.length ? files.map(f => f.name).join(" · ") : "Aucune vidéo"}</span></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm"><span className="lab">⏱️ Durée gardée par vidéo : {secs} s</span><input className="w-full" type="range" min="1" max={maxSecs} value={Math.min(secs, maxSecs)} onChange={e => setSecs(Number(e.target.value))} /></label>
      <label className="text-sm"><span className="lab">✨ Effet</span><select className="input" value={effectId} onChange={e => setEffectId(e.target.value)}>{BUILTIN_EFFECTS.filter(f => eco.effects.some((e: any) => e.id === f.id)).map(f => <option key={f.id} value={f.id} disabled={locked(f.id)}>{f.label}{locked(f.id) ? ` 🔒 (${price(f.id).tokens} 🪙 — à débloquer dans la caméra)` : ""}</option>)}</select></label>
    </div>
    <div className="space-y-2 text-sm"><span className="lab">🎵 Musique</span>
      <select className="input" value={soundMode} onChange={e => setSoundMode(e.target.value as any)}><option value="none">Sans musique (sons d'origine)</option><option value="own">Ma propre musique</option><option value="existing" disabled={!favs.length}>Un de mes sons favoris{favs.length ? "" : " (aucun)"}</option></select>
      {soundMode === "own" && <><input className="input" type="file" accept="audio/*" onChange={e => setMusic(e.target.files?.[0] || null)} /><label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={rights} onChange={e => setRights(e.target.checked)} /> Je confirme avoir les droits d'utiliser cette musique.</label></>}
      {soundMode === "existing" && <select className="input" value={favId} onChange={e => setFavId(e.target.value)}><option value="">— choisir —</option>{favs.map(s => <option key={s.id} value={s.id}>{s.title} · @{s.creator}</option>)}</select>}
      {soundMode !== "none" && <label className="block"><span className="text-xs text-zinc-400">Volume : {volume}%</span><input className="w-full" type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} /></label>}
    </div>
    {msg && <p role="status" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{msg}</p>}
    <button type="button" className="btn-primary" onClick={start} disabled={busy || job?.status === "processing"}>{job?.status === "processing" ? "Montage en cours…" : busy ? "Envoi…" : "✂️ Lancer le montage automatique"}</button>
    {job?.status === "failed" && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{job.error}</p>}
    {job?.status === "done" && job.url && <div className="space-y-3 rounded-xl border border-zinc-800 p-4"><video controls src={job.url} className="max-h-[460px] w-full rounded-lg bg-black" /><div className="flex flex-wrap items-center gap-2"><a className="btn-secondary btn-sm" href={job.url + "?download=1"}>⬇ Télécharger</a><PublishToWesh generationId={job.id} /></div><p className="text-xs text-zinc-500">Le résultat est aussi dans ta bibliothèque « Mes vidéos ».</p></div>}
  </section>;
}
