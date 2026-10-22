"use client";
import { useEffect, useState } from "react";

type Status = Record<string, { connected: boolean; account_name: string | null }>;
const LABELS: Record<string, string> = { tiktok: "🎵 TikTok", facebook: "📘 Facebook", snapchat: "👻 Snapchat", youtube: "▶️ YouTube", instagram: "📸 Instagram", twitch: "🟣 Twitch", x: "𝕏 X / Twitter", linkedin: "💼 LinkedIn" };

export default function SocialAccounts() {
  const [status, setStatus] = useState<Status | null>(null);
  const [snapToken, setSnapToken] = useState("");
  const [xToken, setXToken] = useState("");
  const [xSecret, setXSecret] = useState("");
  const [liToken, setLiToken] = useState("");
  const [liOwner, setLiOwner] = useState("");
  const [twitchKey, setTwitchKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/social");
    if (res.ok) setStatus((await res.json()).status);
  }
  useEffect(() => { load(); }, []);

  async function disconnect(platform: string) {
    setBusy(true);
    await fetch("/api/admin/social", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform }) });
    await load();
    setBusy(false);
  }

  async function saveTwitch() {
    if (!twitchKey.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/social", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "twitch", access_token: twitchKey.trim(), account_name: "Twitch" })
    });
    setMsg(res.ok ? "Twitch lié." : "Échec — vérifie la clé de stream.");
    setTwitchKey(""); await load(); setBusy(false);
  }

  async function saveSnap() {
    if (!snapToken.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "snapchat", access_token: snapToken.trim() })
    });
    setMsg(res.ok ? "Snapchat lié." : "Échec — vérifie le token.");
    setSnapToken("");
    await load();
    setBusy(false);
  }

  async function saveX() {
    if (!xToken.trim() || !xSecret.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: "x", access_token: xToken.trim(), refresh_token: xSecret.trim(), account_name: "X / Twitter" }) });
    setMsg(res.ok ? "X / Twitter lié." : "Échec X / Twitter."); setXToken(""); setXSecret(""); await load(); setBusy(false);
  }
  async function saveLinkedIn() {
    if (!liToken.trim() || !liOwner.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: "linkedin", access_token: liToken.trim(), page_id: liOwner.trim(), account_name: "LinkedIn" }) });
    setMsg(res.ok ? "LinkedIn lié." : "Échec LinkedIn."); setLiToken(""); setLiOwner(""); await load(); setBusy(false);
  }

  if (!status) return <div className="text-sm text-zinc-500">Chargement…</div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(["tiktok", "facebook", "youtube", "instagram"] as const).map((p) => (
          <div key={p} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-lg">{LABELS[p]}</div>
            {status[p]?.connected ? (
              <>
                <div className="mt-1 text-xs font-semibold text-green-400">● connecté — {status[p].account_name}</div>
                <button disabled={busy} onClick={() => disconnect(p)} className="mt-2 text-xs text-zinc-400 underline">
                  Déconnecter
                </button>
              </>
            ) : (
              <>
                <div className="mt-1 text-xs text-zinc-500">○ non connecté</div>
                <a href={"/api/auth/" + p + "/start"} className="mt-2 inline-block rounded-lg bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700">
                  Connecter {LABELS[p]}
                </a>
              </>
            )}
          </div>
        ))}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-lg">{LABELS.twitch}</div>
          {status.twitch?.connected ? (
            <>
              <div className="mt-1 text-xs font-semibold text-green-400">● connecté — {status.twitch.account_name || "Twitch"}</div>
              <button disabled={busy} onClick={() => disconnect("twitch")} className="mt-2 text-xs text-zinc-400 underline">Déconnecter</button>
            </>
          ) : (
            <>
              <div className="mt-1 text-xs text-zinc-500">○ clé de stream locale</div>
              <div className="mt-2 flex gap-2">
                <input value={twitchKey} onChange={(e) => setTwitchKey(e.target.value)} placeholder="clé de stream" className="w-full rounded-lg bg-zinc-800 px-2 py-1 text-xs" />
                <button disabled={busy} onClick={saveTwitch} className="rounded-lg bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700">OK</button>
              </div>
            </>
          )}
        </div>

        {/* Snapchat: no public self-serve OAuth (requires an approved Snap
            partnership) — manual token paste is the only real option today. */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-lg">{LABELS.snapchat}</div>
          {status.snapchat?.connected ? (
            <>
              <div className="mt-1 text-xs font-semibold text-green-400">● connecté</div>
              <button disabled={busy} onClick={() => disconnect("snapchat")} className="mt-2 text-xs text-zinc-400 underline">
                Déconnecter
              </button>
            </>
          ) : (
            <>
              <div className="mt-1 text-xs text-zinc-500">○ pas d'OAuth public — coller un token (partenariat Snap requis)</div>
              <div className="mt-2 flex gap-2">
                <input
                  value={snapToken}
                  onChange={(e) => setSnapToken(e.target.value)}
                  placeholder="token"
                  className="w-full rounded-lg bg-zinc-800 px-2 py-1 text-xs"
                />
                <button disabled={busy} onClick={saveSnap} className="rounded-lg bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700">
                  OK
                </button>
              </div>
            </>
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
      {msg && <div className="text-xs text-zinc-400">{msg}</div>}
    </div>
  );
}
