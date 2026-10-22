"use client";
import { useEffect, useRef, useState } from "react";
import { BUILTIN_EFFECTS } from "@/lib/creator-effects";
import { errText } from "@/lib/creator-messages";

type Eco = { tokens: number; unlocked: string[]; staff: boolean; effects: { id: string; tier: "free" | "paid"; tokens: number }[]; soundsEnabled: boolean; giftEarningsTokens: number };
type FavSound = { id: string; title: string; creator: string };

export default function CreatorStudio() {
  const previewRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [usedSound, setUsedSound] = useState<{ id: string; title: string } | null>(null); // son existant réutilisé
  const [favs, setFavs] = useState<FavSound[]>([]);
  const [eco, setEco] = useState<Eco | null>(null);
  const [filterId, setFilterId] = useState("normal");
  const [musicVolume, setMusicVolume] = useState(35);
  const [muted, setMuted] = useState(false);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputUrl, setOutputUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  // Publication
  const [pub, setPub] = useState({ title: "Mon clip", description: "", visibility: "public", publish: false, rights: false, allowReuse: false, soundTitle: "" });
  const [pubMsg, setPubMsg] = useState("");
  const filter = BUILTIN_EFFECTS.find(f => f.id === filterId) || BUILTIN_EFFECTS[0];

  const loadEco = () => fetch("/api/creator/economy").then(r => r.ok ? r.json() : null).then(d => { if (d) setEco(d); }).catch(() => undefined);
  const loadFavs = () => fetch("/api/sounds/favorites").then(r => r.ok ? r.json() : null).then(d => { if (d) setFavs(d.sounds || []); }).catch(() => undefined);
  const priceOf = (id: string) => eco?.effects.find(e => e.id === id);
  const isLocked = (id: string) => { const e = priceOf(id); return !!e && e.tier === "paid" && !eco?.staff && !eco?.unlocked.includes(id); };

  const useSound = async (id: string, title: string) => {
    setMessage("");
    const r = await fetch(`/api/sounds/${id}/audio`);
    if (!r.ok) { setMessage("Ce son n'est plus disponible."); return; }
    const blob = await r.blob();
    setMusicFile(new File([blob], title + ".audio", { type: blob.type || "audio/mpeg" }));
    setUsedSound({ id, title });
    setMessage(`Son « ${title} » chargé : il sera mixé à ton enregistrement.`);
  };

  useEffect(() => {
    loadEco(); loadFavs();
    const sid = new URLSearchParams(window.location.search).get("sound");
    if (sid && /^[0-9a-f-]{36}$/i.test(sid)) useSound(sid, "Son choisi");
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      cameraRef.current?.getTracks().forEach(t => t.stop());
      audioContextRef.current?.close().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!videoFile) { setUploadedUrl(""); return; }
    const url = URL.createObjectURL(videoFile);
    setUploadedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  useEffect(() => () => { if (outputUrl) URL.revokeObjectURL(outputUrl); }, [outputUrl]);

  const unlock = async (id: string) => {
    const e = priceOf(id); if (!e) return;
    if (!window.confirm(`Débloquer définitivement cet effet pour ${e.tokens} crédit(s) vidéo ?`)) return;
    const r = await fetch("/api/effects/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ effectId: id }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setFilterId(id); loadEco(); setMessage("Effet débloqué ✓"); } else setMessage(errText(d.error));
  };

  const startCamera = async () => {
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      cameraRef.current = stream;
      if (previewRef.current) { previewRef.current.srcObject = stream; await previewRef.current.play(); }
      setCameraOn(true);
    } catch { setMessage("Caméra ou microphone indisponible. Autorise leur accès dans le navigateur et utilise HTTPS."); }
  };
  const stopCamera = () => {
    cameraRef.current?.getTracks().forEach(t => t.stop());
    cameraRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setCameraOn(false);
  };
  const drawFrame = () => {
    const video = previewRef.current; const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (video && canvas && ctx && video.videoWidth > 0) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
      ctx.filter = filter.css; ctx.drawImage(video, 0, 0, canvas.width, canvas.height); ctx.filter = "none";
    }
    if (recorderRef.current?.state === "recording") rafRef.current = requestAnimationFrame(drawFrame);
  };

  const startRecording = async () => {
    if (!cameraRef.current || !canvasRef.current || !previewRef.current) return;
    if (isLocked(filterId)) { setMessage("Cet effet est payant : débloque-le avant d'enregistrer."); return; }
    setBusy(true); setMessage("");
    try {
      const video = previewRef.current; const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponible.");
      canvas.width = video.videoWidth || 1280; canvas.height = video.videoHeight || 720;
      const videoStream = canvas.captureStream(30);
      const audioContext = new AudioContext(); audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();
      const micTracks = cameraRef.current.getAudioTracks();
      if (micTracks.length) audioContext.createMediaStreamSource(new MediaStream(micTracks)).connect(destination);
      let musicElement: HTMLAudioElement | null = null; let musicUrl = "";
      if (musicFile && !muted) {
        musicUrl = URL.createObjectURL(musicFile);
        musicElement = new Audio(musicUrl); musicElement.loop = true; musicElement.volume = 1;
        const musicSource = audioContext.createMediaElementSource(musicElement);
        const gain = audioContext.createGain(); gain.gain.value = musicVolume / 100;
        musicSource.connect(gain); gain.connect(destination);
        await musicElement.play();
      }
      const mixed = new MediaStream([...videoStream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "";
      const recorder = new MediaRecorder(mixed, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: (recorder.mimeType || "video/webm").split(";")[0] });
        setOutputBlob(blob);
        setOutputUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
        if (musicElement) { musicElement.pause(); musicElement.src = ""; }
        if (musicUrl) URL.revokeObjectURL(musicUrl);
        mixed.getTracks().forEach(t => t.stop());
        audioContext.close().catch(() => undefined); audioContextRef.current = null;
        setRecording(false); setMessage("Clip prêt. Télécharge-le ou enregistre/publie-le ci-dessous.");
      };
      recorderRef.current = recorder; recorder.start(); setRecording(true); rafRef.current = requestAnimationFrame(drawFrame);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Impossible de démarrer l’enregistrement."); }
    finally { setBusy(false); }
  };
  const stopRecording = () => { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); if (rafRef.current) cancelAnimationFrame(rafRef.current); };

  const saveClip = async () => {
    if (!outputBlob) return;
    setPubMsg("");
    const hasOwnMusic = !!musicFile && !usedSound && !muted;
    if (pub.publish && hasOwnMusic && !pub.rights) { setPubMsg("Confirme que tu as les droits sur ta musique pour la publier."); return; }
    const f = new FormData();
    f.append("clip", new File([outputBlob], "clip.webm", { type: outputBlob.type || "video/webm" }));
    f.append("publish", String(pub.publish)); f.append("title", pub.title); f.append("description", pub.description); f.append("visibility", pub.visibility);
    if (pub.publish && musicFile && !muted) {
      if (usedSound) { f.append("soundMode", "existing"); f.append("existingSoundId", usedSound.id); }
      else { f.append("soundMode", "own"); f.append("sound", musicFile); f.append("rightsConfirmed", String(pub.rights)); f.append("allowReuse", String(pub.allowReuse)); f.append("soundTitle", pub.soundTitle || musicFile.name.replace(/\.[^.]+$/, "")); }
    }
    setBusy(true);
    const r = await fetch("/api/creator/publish-clip", { method: "POST", body: f });
    const d = await r.json().catch(() => ({})); setBusy(false);
    setPubMsg(r.ok ? (pub.publish ? "✓ Publié sur Wesh Star Feed." : "✓ Enregistré dans ta bibliothèque.") : errText(d.error));
  };

  const hasOwnMusic = !!musicFile && !usedSound;
  return <section className="card space-y-5 p-6">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h2 className="text-xl font-bold">📹 Caméra et montage Wesh</h2><p className="mt-1 text-sm text-zinc-400">Filme directement, ajoute une musique ou un son favori, applique un effet, puis enregistre ou publie.</p></div>
      {eco && <div className="text-right text-xs text-zinc-400"><div>🪙 {eco.tokens} crédit(s) vidéo</div>{eco.giftEarningsTokens > 0 && <div>🎁 Cadeaux reçus (total) : {eco.giftEarningsTokens} pièces</div>}</div>}
    </div>
    <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video ref={previewRef} playsInline muted className="aspect-[9/16] max-h-[560px] w-full object-contain" style={{ filter: filter.css }} />
          {!cameraOn && !videoFile && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-zinc-500">Active la caméra ou importe une vidéo pour commencer.</div>}
          {videoFile && !cameraOn && <video key={videoFile.name + videoFile.size} src={uploadedUrl} controls className="absolute inset-0 h-full w-full bg-black object-contain" style={{ filter: filter.css }} />}
          {recording && <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">● ENREGISTREMENT</span>}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex flex-wrap gap-2">
          {!cameraOn ? <button type="button" onClick={startCamera} className="btn-primary">Activer la caméra</button> : <button type="button" onClick={stopCamera} disabled={recording} className="btn-secondary">Arrêter la caméra</button>}
          {!recording ? <button type="button" onClick={startRecording} disabled={!cameraOn || busy} className="btn-primary">{busy ? "Préparation…" : "● Enregistrer"}</button> : <button type="button" onClick={stopRecording} className="btn-secondary">■ Terminer</button>}
        </div>
      </div>
      <div className="space-y-4">
        <label className="block text-sm"><span className="lab">🎞️ Prévisualiser une vidéo importée</span><input className="input" type="file" accept="video/*" onChange={e => { const f = e.target.files?.[0] || null; setVideoFile(f); }} /><span className="mt-1 block text-xs text-zinc-500">Pour exporter une vidéo importée avec effet et musique, utilise « Montage automatique » plus bas.</span></label>
        <div><p className="lab mb-2">✨ Effets</p><div className="grid grid-cols-2 gap-2">{BUILTIN_EFFECTS.filter(f => !eco || eco.effects.some(e => e.id === f.id)).map(f => {
          const p = priceOf(f.id); const locked = isLocked(f.id);
          return <button key={f.id} type="button" onClick={() => locked ? unlock(f.id) : setFilterId(f.id)} className={`rounded-lg border p-3 text-left text-sm ${filterId === f.id ? "border-violet-400 bg-violet-500/10" : "border-zinc-700"}`}><span style={{ filter: f.css }} className="mr-2 inline-block">◉</span>{f.label}{!p || p.tier === "free" ? <span className="ml-2 text-xs text-green-400">Gratuit</span> : locked ? <span className="ml-2 text-xs text-amber-300">🔒 {p.tokens} 🪙</span> : <span className="ml-2 text-xs text-green-400">Débloqué</span>}</button>;
        })}</div><p className="mt-2 text-xs text-zinc-500">Les effets payants se débloquent une fois pour toutes avec des crédits vidéo Wesh.</p></div>
        <label className="block text-sm"><span className="lab">🎵 Importer une musique ou un son</span><input className="input" type="file" accept="audio/*" onChange={e => { setMusicFile(e.target.files?.[0] || null); setUsedSound(null); }} /><span className="mt-1 block text-xs text-zinc-500">{musicFile ? (usedSound ? "♪ " + usedSound.title : musicFile.name) : "Aucun fichier audio choisi"}</span></label>
        {favs.length > 0 && <div><p className="lab mb-1">⭐ Mes sons favoris</p><select className="input" value={usedSound?.id || ""} onChange={e => { const s = favs.find(x => x.id === e.target.value); if (s) useSound(s.id, s.title); }}><option value="">— choisir un son favori —</option>{favs.map(s => <option key={s.id} value={s.id}>{s.title} · @{s.creator}</option>)}</select></div>}
        <label className="block text-sm"><span className="lab">🔊 Volume de la musique : {musicVolume}%</span><input className="w-full" type="range" min="0" max="100" value={musicVolume} onChange={e => setMusicVolume(Number(e.target.value))} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={muted} onChange={e => setMuted(e.target.checked)} /> Enregistrer sans la musique</label>
      </div>
    </div>
    {message && <p role="status" className="rounded-lg border border-zinc-800 p-3 text-sm">{message}</p>}
    {outputUrl && <div className="space-y-3 rounded-xl border border-zinc-800 p-4">
      <h3 className="font-semibold">Aperçu du résultat</h3>
      <video controls src={outputUrl} className="max-h-[460px] w-full rounded-lg bg-black" />
      <a className="btn-secondary inline-block" href={outputUrl} download="wesh-star-clip.webm">⬇ Télécharger mon clip</a>
      <div className="space-y-2 rounded-lg border border-zinc-800 p-3 text-sm">
        <p className="font-semibold">💾 Enregistrer / publier</p>
        <input className="input" maxLength={120} value={pub.title} onChange={e => setPub({ ...pub, title: e.target.value })} placeholder="Titre" />
        <textarea className="input" rows={2} maxLength={1000} value={pub.description} onChange={e => setPub({ ...pub, description: e.target.value })} placeholder="Description" />
        <label className="flex items-center gap-2"><input type="checkbox" checked={pub.publish} onChange={e => setPub({ ...pub, publish: e.target.checked })} /> Publier sur Wesh Star Feed (sinon : bibliothèque privée)</label>
        {pub.publish && <select className="input" value={pub.visibility} onChange={e => setPub({ ...pub, visibility: e.target.value })}><option value="public">🌍 Public</option><option value="followers">👥 Abonnés</option><option value="private">🔒 Privé</option></select>}
        {pub.publish && hasOwnMusic && !muted && eco?.soundsEnabled && <div className="space-y-1 rounded-lg bg-zinc-900/60 p-2">
          <input className="input" maxLength={80} value={pub.soundTitle} onChange={e => setPub({ ...pub, soundTitle: e.target.value })} placeholder="Nom du son (affiché sous la vidéo)" />
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={pub.rights} onChange={e => setPub({ ...pub, rights: e.target.checked })} /> Je confirme avoir les droits d'utiliser et de publier cette musique.</label>
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={pub.allowReuse} onChange={e => setPub({ ...pub, allowReuse: e.target.checked })} /> Autoriser les autres à enregistrer ce son en favori et à l'utiliser dans leurs vidéos.</label>
        </div>}
        {pub.publish && usedSound && <p className="text-xs text-zinc-400">♪ Son réutilisé : « {usedSound.title} » (crédité à son créateur).</p>}
        <button type="button" className="btn-primary" onClick={saveClip} disabled={busy}>{busy ? "Envoi…" : pub.publish ? "Publier" : "Enregistrer dans ma bibliothèque"}</button>
        {pubMsg && <p role="status" className="text-xs text-blue-300">{pubMsg}</p>}
      </div>
    </div>}
  </section>;
}
