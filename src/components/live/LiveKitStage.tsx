"use client";
import { useEffect, useRef, useState } from "react";
import type { Room, RemoteTrack, Track } from "livekit-client";

export default function LiveKitStage({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState("Connexion au serveur média…");
  const [connected, setConnected] = useState(false);
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [error, setError] = useState("");
  const [canPublish, setCanPublish] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    let disposed = false;
    let room: Room | null = null;
    const connect = async () => {
      try {
        const response = await fetch("/api/live/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || data.error || "Connexion au LIVE impossible");
        const lk = await import("livekit-client");
        room = new lk.Room({ adaptiveStream: true, dynacast: true }); roomRef.current = room;
        const attach = (track: RemoteTrack | Track, identity: string, isLocal = false) => {
          if (!localRef.current || !remoteRef.current) return;
          const el = track.attach();
          el.style.width = "100%"; el.style.maxHeight = "360px"; el.style.background = "#09090b"; el.style.borderRadius = "12px";
          if (el instanceof HTMLVideoElement) { el.autoplay = true; el.playsInline = true; }
          el.dataset.identity = identity;
          (isLocal ? localRef.current : remoteRef.current).appendChild(el);
        };
        room.on(lk.RoomEvent.TrackSubscribed, (track, _pub, participant) => attach(track, participant.identity));
        room.on(lk.RoomEvent.TrackUnsubscribed, (track, _pub, participant) => track.detach().forEach(el => el.remove()));
        room.on(lk.RoomEvent.ParticipantDisconnected, participant => {
          remoteRef.current?.querySelectorAll(`[data-identity="${CSS.escape(participant.identity)}"]`).forEach(el => el.remove());
        });
        room.on(lk.RoomEvent.Disconnected, () => { if (!disposed) { setConnected(false); setStatus("Déconnecté du LIVE"); } });
        await room.connect(data.url, data.token);
        if (disposed) { await room.disconnect(); return; }
        setCanPublish(Boolean(data.canPublish));
        if (data.canPublish) {
          await room.localParticipant.setMicrophoneEnabled(true).catch(() => setMic(false));
          await room.localParticipant.setCameraEnabled(true).catch(() => setCamera(false));
        }
        room.localParticipant.videoTrackPublications.forEach(p => { if (p.track) attach(p.track, room!.localParticipant.identity, true); });
        room.remoteParticipants.forEach(p => p.trackPublications.forEach(pub => { if (pub.track && pub.isSubscribed) attach(pub.track, p.identity); }));
        setConnected(true); setStatus(data.canPublish ? "Connecté — autorise la caméra et le microphone si demandé" : "Spectateur — seul l’hôte et les invités acceptés émettent");
      } catch (e: any) { if (!disposed) { setError(String(e?.message || "Erreur de connexion")); setStatus("Flux média indisponible"); } }
    };
    connect();
    return () => { disposed = true; room?.disconnect(); roomRef.current = null; localRef.current?.replaceChildren(); remoteRef.current?.replaceChildren(); };
  }, [sessionId, reloadKey]);

  const toggleMic = async () => { const next = !mic; await roomRef.current?.localParticipant.setMicrophoneEnabled(next); setMic(next); };
  const toggleCamera = async () => { const next = !camera; await roomRef.current?.localParticipant.setCameraEnabled(next); setCamera(next); };
  return <section className="card space-y-3 p-4" aria-label="Flux audio et vidéo du LIVE">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">🎥 Studio LIVE audio/vidéo</h3><span className={`badge ${connected ? "badge-green" : "badge-zinc"}`}>{status}</span></div>
    {error && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{error}. Vérifie la configuration LiveKit et l'accès réseau public.</p>}
    <div className="grid gap-3 md:grid-cols-2"><div><p className="mb-1 text-xs text-zinc-400">Ta caméra</p><div ref={localRef} className="min-h-24 rounded-xl bg-zinc-950 p-1" /></div><div><p className="mb-1 text-xs text-zinc-400">Autres participants</p><div ref={remoteRef} className="grid min-h-24 gap-2 rounded-xl bg-zinc-950 p-1" /></div></div>
    <div className="flex flex-wrap gap-2"><button className="btn-secondary btn-sm" disabled={!connected || !canPublish} onClick={toggleMic}>{mic ? "🎙️ Couper le micro" : "🔇 Activer le micro"}</button><button className="btn-secondary btn-sm" disabled={!connected || !canPublish} onClick={toggleCamera}>{camera ? "📷 Couper la caméra" : "📹 Activer la caméra"}</button></div>
    {!canPublish && connected && <button className="btn-secondary btn-sm" onClick={() => setReloadKey(k => k + 1)}>↻ Actualiser (si l’hôte vient de m’accepter)</button>}
    <p className="text-xs text-zinc-500">Le serveur média est auto-hébergeable. Pour que des personnes hors du réseau local rejoignent le LIVE, configure le DNS/HTTPS, LIVEKIT_PUBLIC_URL et les ports réseau du serveur.</p>
  </section>;
}
