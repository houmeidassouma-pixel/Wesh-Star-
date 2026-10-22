"use client";

import { useEffect, useState } from "react";

const DURATION_OPTIONS = [60,120,300,600,1800,3600,7200,10800,14400,18000,21600];
const PLATFORM_MAX: Record<string, number> = { tiktok:600, facebook:14400, youtube:21600, instagram:900, snapchat:600, twitch:21600, x:140, linkedin:3600 };
const DURATION_LABEL = (s:number) => s < 3600 ? `${Math.round(s/60)} min` : `${Math.round(s/3600)} h`;

const LABELS: Record<string, string> = {
  tiktok: "🎵 TikTok",
  facebook: "📘 Facebook",
  youtube: "▶️ YouTube",
  instagram: "📸 Instagram",
  snapchat: "👻 Snapchat",
  twitch: "🟣 Twitch", x: "𝕏 X / Twitter", linkedin: "💼 LinkedIn"
};

export default function ModeratorAutopilot({ allowed, promotionAllowed = false }: { allowed: boolean; promotionAllowed?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [promotionEnabled, setPromotionEnabled] = useState(true);
  const [autoPublishToCommunity, setAutoPublishToCommunity] = useState(false);
  const [crossPostAllPlatforms, setCrossPostAllPlatforms] = useState(false);
  const [promotionText, setPromotionText] = useState("");
  const [status, setStatus] = useState<Record<string, any> | null>(null);
  const [snapToken, setSnapToken] = useState("");
  const [xToken, setXToken] = useState("");
  const [xSecret, setXSecret] = useState("");
  const [liToken, setLiToken] = useState("");
  const [liOwner, setLiOwner] = useState("");
  const [twitchKey, setTwitchKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const platformKeys = ["tiktok","facebook","youtube","instagram","snapchat","twitch","x","linkedin"] as const;
  const [profiles, setProfiles] = useState<Record<string, any>>(() => Object.fromEntries(platformKeys.map((p) => [p, { enabled: true, videosPerDay: 3, durationsSeconds: DURATION_OPTIONS.filter((x) => x <= (PLATFORM_MAX[p] || 21600)) }] )));
  const [custom, setCustom] = useState<Record<string, { value: string; unit: "min" | "h" }>>({});

  async function load() {
    if (!allowed) return;
    const [a, s] = await Promise.all([fetch("/api/moderator/autopilot"), fetch("/api/moderator/social")]);
    if (a.ok) {
      const data = await a.json();
      setEnabled(!!data.enabled);
      setPromotionEnabled(data.settings?.promotionEnabled !== false);
      setAutoPublishToCommunity(data.settings?.autoPublishToCommunity === true);
      setCrossPostAllPlatforms(data.settings?.crossPostAllPlatforms === true);
      setPromotionText(data.promotion?.cta || "");
      if (data.settings?.platforms && typeof data.settings.platforms === "object") {
        setProfiles((old) => Object.fromEntries(platformKeys.map((p) => {
          const incoming = data.settings.platforms[p] || {};
          const fallback = old[p] || { enabled: true, videosPerDay: 3, durationsSeconds: DURATION_OPTIONS.filter((x) => x <= (PLATFORM_MAX[p] || 21600)) };
          return [p, { ...fallback, ...incoming, durationsSeconds: Array.isArray(incoming.durationsSeconds) && incoming.durationsSeconds.length ? incoming.durationsSeconds : fallback.durationsSeconds }];
        })));
      }
    }
    if (s.ok) setStatus((await s.json()).status);
  }
  useEffect(() => { load(); }, [allowed]);

  async function saveSettings(nextEnabled = enabled) {
    setBusy(true);
    const res = await fetch("/api/moderator/autopilot", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextEnabled, settings: { platforms: profiles, promotionEnabled, autoPublishToCommunity, crossPostAllPlatforms } })
    });
    if (res.ok) { setEnabled(nextEnabled); setMsg("Réglages Autopilot enregistrés."); }
    else setMsg("Échec de l'enregistrement des réglages Autopilot.");
    setBusy(false);
  }

  async function toggle() {
    await saveSettings(!enabled);
  }

  function addCustomDuration(platform: string) {
    const input = custom[platform] || { value: "", unit: "min" as const };
    const n = Number(input.value);
    if (!Number.isFinite(n) || n <= 0) return;
    const seconds = Math.round(n * (input.unit === "h" ? 3600 : 60));
    if (seconds < 60 || seconds > (PLATFORM_MAX[platform] || 21600)) { setMsg(`Durée non disponible pour ${LABELS[platform]}.`); return; }
    setProfiles((old) => {
      const cur = old[platform] || {};
      const next = Array.from(new Set([...(Array.isArray(cur.durationsSeconds) ? cur.durationsSeconds : []), seconds])).sort((a:number,b:number)=>a-b);
      return { ...old, [platform]: { ...cur, durationsSeconds: next } };
    });
    setCustom((old) => ({ ...old, [platform]: { value: "", unit: input.unit } }));
  }

  async function disconnect(platform: string) {
    setBusy(true);
    await fetch("/api/moderator/social", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform })
    });
    await load(); setBusy(false);
  }

  async function saveTwitch() {
    if (!twitchKey.trim()) return;
    setBusy(true);
    const res = await fetch("/api/moderator/social", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "twitch", access_token: twitchKey.trim(), account_name: "Twitch" })
    });
    setMsg(res.ok ? "Twitch lié à votre compte." : "Échec — vérifiez la clé de stream.");
    setTwitchKey(""); await load(); setBusy(false);
  }

  async function saveSnap() {
    if (!snapToken.trim()) return;
    setBusy(true);
    const res = await fetch("/api/moderator/social", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "snapchat", access_token: snapToken.trim() })
    });
    setMsg(res.ok ? "Snapchat lié à votre compte." : "Échec — vérifiez le token.");
    setSnapToken(""); await load(); setBusy(false);
  }

  async function saveX() {
    if (!xToken.trim() || !xSecret.trim()) return;
    setBusy(true);
    const res = await fetch("/api/moderator/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: "x", access_token: xToken.trim(), refresh_token: xSecret.trim(), account_name: "X / Twitter" }) });
    setMsg(res.ok ? "X / Twitter lié à votre compte." : "Échec X / Twitter."); setXToken(""); setXSecret(""); await load(); setBusy(false);
  }
  async function saveLinkedIn() {
    if (!liToken.trim() || !liOwner.trim()) return;
    setBusy(true);
    const res = await fetch("/api/moderator/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: "linkedin", access_token: liToken.trim(), page_id: liOwner.trim(), account_name: "LinkedIn" }) });
    setMsg(res.ok ? "LinkedIn lié à votre compte." : "Échec LinkedIn."); setLiToken(""); setLiOwner(""); await load(); setBusy(false);
  }

  if (!allowed) return null;

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">🤖 Publication automatique — mon compte</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Même Autopilot que l’administration, mais uniquement pour vos propres vidéos et vos propres comptes sociaux.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={enabled} disabled={busy} onChange={toggle} />
          {enabled ? "Activé" : "Bloqué"}
        </label>
      </div>

      <label className="mt-4 flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-sm">
        <input type="checkbox" checked={autoPublishToCommunity} disabled={busy} onChange={(e) => setAutoPublishToCommunity(e.target.checked)} className="mt-1" />
        <span><b>Publier aussi automatiquement sur Wesh Star IA</b><span className="mt-1 block text-xs text-zinc-500">Après génération réussie, ajoute la vidéo au Feed communautaire si l’administrateur a activé la communauté. Ce réglage ne remplace pas les publications sur TikTok, Facebook, YouTube ou les autres réseaux. Clique sur « Enregistrer » pour appliquer.</span></span>
      </label>
      <label className="mt-3 flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-sm">
        <input type="checkbox" checked={crossPostAllPlatforms} disabled={busy} onChange={(e) => setCrossPostAllPlatforms(e.target.checked)} className="mt-1" />
        <span><b>Republier chaque vidéo sur tous mes réseaux compatibles</b><span className="mt-1 block text-xs text-zinc-500">Publie la même vidéo sur chaque réseau activé et connecté qui accepte sa durée. Enregistrer pour appliquer. Les autorisations et limites de chaque réseau restent obligatoires.</span></span>
      </label>
      <div className="mt-3 flex justify-end"><button disabled={busy} onClick={() => saveSettings()} className="btn-primary btn-sm">Enregistrer les réglages</button></div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(["tiktok","facebook","youtube","instagram"] as const).map((p) => (
          <div key={p} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-lg">{LABELS[p]}</div>
            {status?.[p]?.connected ? (
              <>
                <div className="mt-1 text-xs font-semibold text-green-400">● connecté — {status[p].account_name}</div>
                <button disabled={busy} onClick={() => disconnect(p)} className="mt-2 text-xs text-zinc-400 underline">Déconnecter</button>
              </>
            ) : (
              <a href={"/api/auth/" + p + "/start"} className="mt-2 inline-block rounded-lg bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700">
                Connecter {LABELS[p]}
              </a>
            )}
          </div>
        ))}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-lg">{LABELS.twitch}</div>
          {status?.twitch?.connected ? (
            <>
              <div className="mt-1 text-xs font-semibold text-green-400">● connecté — {status.twitch.account_name || "Twitch"}</div>
              <button disabled={busy} onClick={() => disconnect("twitch")} className="mt-2 text-xs text-zinc-400 underline">Déconnecter</button>
            </>
          ) : (
            <div className="mt-2 flex gap-2">
              <input value={twitchKey} onChange={(e) => setTwitchKey(e.target.value)} placeholder="clé de stream" className="w-full rounded-lg bg-zinc-800 px-2 py-1 text-xs" />
              <button disabled={busy} onClick={saveTwitch} className="rounded-lg bg-zinc-800 px-3 py-1 text-xs">OK</button>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-lg">{LABELS.snapchat}</div>
          {status?.snapchat?.connected ? (
            <>
              <div className="mt-1 text-xs font-semibold text-green-400">● connecté — votre compte</div>
              <button disabled={busy} onClick={() => disconnect("snapchat")} className="mt-2 text-xs text-zinc-400 underline">Déconnecter</button>
            </>
          ) : (
            <div className="mt-2 flex gap-2">
              <input value={snapToken} onChange={(e) => setSnapToken(e.target.value)} placeholder="token Snap" className="w-full rounded-lg bg-zinc-800 px-2 py-1 text-xs" />
              <button disabled={busy} onClick={saveSnap} className="rounded-lg bg-zinc-800 px-3 py-1 text-xs">OK</button>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-lg">{LABELS.x}</div>
          {status?.x?.connected ? <><div className="mt-1 text-xs font-semibold text-green-400">● connecté — {status.x.account_name || "X / Twitter"}</div><button disabled={busy} onClick={() => disconnect("x")} className="mt-2 text-xs text-zinc-400 underline">Déconnecter</button></> : <><div className="mt-1 text-xs text-zinc-500">OAuth 1.0a</div><input value={xToken} onChange={e=>setXToken(e.target.value)} placeholder="access token" className="mt-2 w-full rounded-lg bg-zinc-800 px-2 py-1 text-xs"/><input value={xSecret} onChange={e=>setXSecret(e.target.value)} placeholder="access token secret" className="mt-2 w-full rounded-lg bg-zinc-800 px-2 py-1 text-xs"/><button disabled={busy} onClick={saveX} className="mt-2 rounded-lg bg-zinc-800 px-3 py-1 text-xs">Lier X</button></>}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-lg">{LABELS.linkedin}</div>
          {status?.linkedin?.connected ? <><div className="mt-1 text-xs font-semibold text-green-400">● connecté — {status.linkedin.account_name || "LinkedIn"}</div><button disabled={busy} onClick={() => disconnect("linkedin")} className="mt-2 text-xs text-zinc-400 underline">Déconnecter</button></> : <><div className="mt-1 text-xs text-zinc-500">Videos API + Posts API</div><input value={liToken} onChange={e=>setLiToken(e.target.value)} placeholder="access token" className="mt-2 w-full rounded-lg bg-zinc-800 px-2 py-1 text-xs"/><input value={liOwner} onChange={e=>setLiOwner(e.target.value)} placeholder="owner URN" className="mt-2 w-full rounded-lg bg-zinc-800 px-2 py-1 text-xs"/><button disabled={busy} onClick={saveLinkedIn} className="mt-2 rounded-lg bg-zinc-800 px-3 py-1 text-xs">Lier LinkedIn</button></>}
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="mb-1 font-semibold">⚙️ Programmation Autopilot — votre panneau</div>
        <p className="mb-4 text-xs text-zinc-500">Pour chaque compte connecté, choisissez exactement la durée voulue (minutes ou heures) et combien de publications automatiques doivent être faites par jour. Il n'y a plus de limite à la liste 1 h / 2 h / 3 h : les boutons rapides sont seulement des raccourcis.</p>
        <div className="space-y-3">
          {platformKeys.map((p) => {
            const profile = profiles[p] || {};
            return <div key={p} className="rounded-lg border border-zinc-800 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold text-sm">{LABELS[p]}</div>
                <label className="text-xs text-zinc-400"><input type="checkbox" checked={profile.enabled !== false} onChange={(e) => setProfiles((old) => ({ ...old, [p]: { ...old[p], enabled: e.target.checked } }))} /> activé</label>
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-xs text-zinc-400">Publications / jour
                  <input type="number" min={0} max={1000} value={profile.videosPerDay ?? 3} onChange={(e) => setProfiles((old) => ({ ...old, [p]: { ...old[p], videosPerDay: Math.max(0, Math.min(1000, Number(e.target.value) || 0)) } }))} className="input mt-1 !w-28" />
                </label>
                <label className="text-xs text-zinc-400">Durée personnalisée
                  <input type="number" min={1} step={1} value={custom[p]?.value ?? ""} onChange={(e) => setCustom((old) => ({ ...old, [p]: { value: e.target.value, unit: old[p]?.unit || "min" } }))} placeholder="ex. 45" className="input mt-1 !w-28" />
                </label>
                <select value={custom[p]?.unit || "min"} onChange={(e) => setCustom((old) => ({ ...old, [p]: { value: old[p]?.value || "", unit: e.target.value as "min" | "h" } }))} className="input !w-24"><option value="min">minutes</option><option value="h">heures</option></select>
                <button type="button" onClick={() => addCustomDuration(p)} className="btn-primary btn-sm">+ Ajouter</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {DURATION_OPTIONS.filter((s) => s <= (PLATFORM_MAX[p] || 21600)).map((seconds) => { const selected = Array.isArray(profile.durationsSeconds) && profile.durationsSeconds.includes(seconds); return <label key={seconds} className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs"><input type="checkbox" checked={selected} onChange={() => setProfiles((old) => { const cur = old[p] || {}; const arr = Array.isArray(cur.durationsSeconds) ? cur.durationsSeconds : []; const next = selected ? arr.filter((x:number)=>x!==seconds) : [...arr,seconds].sort((a:number,b:number)=>a-b); return { ...old, [p]: { ...cur, durationsSeconds: next } }; })} />{DURATION_LABEL(seconds)}</label>; })}
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">Durées programmées : {Array.isArray(profile.durationsSeconds) && profile.durationsSeconds.length ? profile.durationsSeconds.map((s:number)=>DURATION_LABEL(s)).join(", ") : "aucune"}</div>
            </div>;
          })}
        </div>
        {promotionAllowed && <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/30 p-4 space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={promotionEnabled} onChange={(e) => setPromotionEnabled(e.target.checked)} /> Ajouter automatiquement l’outro / promotion Wesh Star IA</label>
        <p className="text-xs text-zinc-500">Le modérateur peut utiliser la promotion configurée par l’Admin. Le texte global reste contrôlé par l’Admin.</p>
        {promotionText && <div className="rounded-lg border border-zinc-800 p-3 text-xs text-zinc-400">CTA actif : {promotionText}</div>}
      </div>}
      <button disabled={busy} onClick={() => saveSettings()} className="btn-primary btn-md mt-4">Enregistrer les réglages Autopilot</button>
      </div>
      {msg && <div className="mt-3 text-xs text-zinc-400">{msg}</div>}
    </section>
  );
}
