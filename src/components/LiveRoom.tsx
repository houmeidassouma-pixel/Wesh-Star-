"use client";
import { useCallback, useEffect, useState } from "react";
import { errText } from "@/lib/creator-messages";
import LiveKitStage from "@/components/live/LiveKitStage";

const post = (url: string, body: any) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) }));

export default function LiveRoom() {
  const [eco, setEco] = useState<any>(null);
  const [list, setList] = useState<any>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [state, setState] = useState<any>(null);
  const [title, setTitle] = useState("Mon LIVE");
  const [liveMode, setLiveMode] = useState<"solo" | "guests">("solo");
  const [guestLimit, setGuestLimit] = useState(4);
  const [chest, setChest] = useState({ total: "120", people: "120" });
  const [msg, setMsg] = useState("");
  const [moderatorUsername, setModeratorUsername] = useState("");

  const loadEco = useCallback(() => fetch("/api/creator/economy").then(r => r.ok ? r.json() : null).then(setEco), []);
  const loadList = useCallback(() => fetch("/api/live/list").then(r => r.ok ? r.json() : null).then(setList), []);
  const loadState = useCallback(async () => { if (!roomId) return; const r = await fetch("/api/live/state?sessionId=" + roomId, { cache: "no-store" }); if (r.ok) setState(await r.json()); else { setState(null); setRoomId(null); } }, [roomId]);
  useEffect(() => { loadEco(); loadList(); const t = setInterval(loadList, 15000); return () => clearInterval(t); }, [loadEco, loadList]);
  useEffect(() => {
    if (!roomId) return;
    const beat = () => post("/api/live/join", { sessionId: roomId }).then(x => { if (!x.ok && x.d.error === "LIVE_ENDED") { setMsg("Ce LIVE est terminé."); setRoomId(null); setState(null); loadEco(); } });
    beat(); loadState();
    const a = setInterval(beat, 20000), b = setInterval(loadState, 5000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [roomId, loadState, loadEco]);

  if (!eco) return <p className="text-sm text-zinc-500">Chargement…</p>;
  if (!eco.live?.enabled) return <div className="card p-6 text-sm text-zinc-400">Le LIVE n'est pas activé pour le moment.</div>;
  const ch = eco.live.chests;
  const total = Math.floor(Number(chest.total)), people = Math.floor(Number(chest.people));
  const valid = people >= 1 && total >= people * 2;
  const share = valid ? Math.floor(total / people) : 0, reserved = share * people;

  const start = async () => { const x = await post("/api/live/start", { title, liveMode, guestLimit }); if (x.ok) { setRoomId(x.d.sessionId); setMsg(""); } else setMsg(errText(x.d.error)); };
  const requestGuest = async () => { const x = await post("/api/live/guest-request", { sessionId: roomId }); setMsg(x.ok ? (x.d.status === "accepted" ? "Tu es déjà invité sur la scène." : "Demande envoyée à l’hôte." ) : errText(x.d.error)); loadState(); };
  const decideGuest = async (guestId: string, decision: "approve" | "reject") => { const x = await post("/api/live/guest-decision", { sessionId: roomId, guestId, decision }); setMsg(x.ok ? (decision === "approve" ? "Invité accepté." : "Demande refusée.") : errText(x.d.error)); loadState(); };
  const manageLiveUser = async (action: string, userId: string) => { const x = await post("/api/live/moderator", { sessionId: roomId, action, userId }); setMsg(x.ok ? (action === "block" ? "Utilisateur bloqué dans ce LIVE." : "Action effectuée.") : errText(x.d.error)); loadState(); };
  const addLiveModerator = async () => { const x = await post("/api/live/moderator", { sessionId: roomId, action: "add", username: moderatorUsername }); setMsg(x.ok ? "Modérateur du LIVE ajouté." : errText(x.d.error)); if (x.ok) setModeratorUsername(""); loadState(); };
  const end = async () => { if (!window.confirm("Terminer le LIVE ? Les coffres ouverts seront clôturés et remboursés.")) return; const x = await post("/api/live/end", { sessionId: roomId }); setMsg(x.ok ? "LIVE terminé." : errText(x.d.error)); setRoomId(null); setState(null); loadList(); loadEco(); };
  const gift = async (g: any) => { if (!window.confirm(`Envoyer ${g.emoji} ${g.name} pour ${g.tokens} pièce(s) ?`)) return; const x = await post("/api/gifts/send", { liveSessionId: roomId, giftId: g.id }); setMsg(x.ok ? `${g.emoji} envoyé ! Solde pièces : ${x.d.balance} 🪙` : errText(x.d.error)); loadEco(); loadState(); };
  const deposit = async () => {
    if (!valid) return setMsg("Il faut au moins 2 pièces par participant.");
    if (!window.confirm(`Déposer un coffre : ${people} personnes × ${share} pièce(s) = ${reserved} pièces réservées. Les parts non réclamées te seront rendues à la clôture. Sur chaque part réclamée, la commission 60/40 s’applique. Confirmer ?`)) return;
    const x = await post("/api/live/chest/create", { sessionId: roomId, totalCoins: total, maxClaimants: people });
    setMsg(x.ok ? `Coffre déposé ✓ (${x.d.share} pièce(s) brutes par personne). Solde pièces : ${x.d.balance} 🪙` : errText(x.d.error)); loadEco(); loadState();
  };
  const claim = async (id: string) => { const x = await post("/api/live/chest/claim", { chestId: id }); setMsg(x.ok ? `🎉 Tu as reçu ${x.d.coins} pièce(s) en gains créateur (sur ${x.d.grossCoins} pièces brutes).` : errText(x.d.error)); loadEco(); loadState(); };
  const closeChest = async (id: string) => { const x = await post("/api/live/chest/close", { chestId: id }); setMsg(x.ok ? `Coffre clôturé. Remboursé : ${x.d.refunded} pièce(s).` : errText(x.d.error)); loadEco(); loadState(); };

  return <div className="space-y-5">
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-200">ℹ️ Les salons, la présence, les cadeaux et les coffres sont gérés par Wesh Star. Le flux média se connecte au serveur LiveKit auto-hébergé si ses clés et son URL publique sont configurées.</div>
    <div className="text-xs text-zinc-400">🪙 Ton solde cadeaux : {Number(eco.coins || 0).toLocaleString("fr-FR")} pièce(s) · <a className="underline" href="/coins">Acheter des pièces</a></div>
    {msg && <p role="status" className="rounded-lg border border-zinc-800 p-3 text-sm">{msg}</p>}
    {!roomId && <>
      <div className="card space-y-3 p-4"><h2 className="font-bold">📡 Lancer mon LIVE</h2><input className="input" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} /><label className="block text-sm">Format du LIVE<select className="input mt-1" value={liveMode} onChange={e => setLiveMode(e.target.value as "solo" | "guests")}><option value="solo">Solo — sans match</option><option value="guests">Avec invités — sans match</option></select></label>{liveMode === "guests" && <label className="block text-sm">Nombre maximal d’invités (1 à 9)<input className="input mt-1" type="number" min={1} max={9} value={guestLimit} onChange={e => setGuestLimit(Math.max(1, Math.min(9, Number(e.target.value) || 1)))} /></label>}<p className="text-xs text-zinc-500">Tu peux lancer seul ou autoriser des invités. Les demandes doivent être acceptées par l’hôte. Le streaming audio/vidéo réel nécessite encore son serveur dédié.</p><button className="btn-primary" onClick={start}>Démarrer</button></div>
      <div className="card space-y-2 p-4"><h2 className="font-bold">LIVE en cours</h2>{list?.sessions?.length ? list.sessions.map((s: any) => <div key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3 text-sm"><span>{s.promoted && <span className="mr-1 rounded border border-amber-400/40 px-1 text-[10px] text-amber-300">Sponsorisé</span>}{s.title} · @{s.host} · 👀 {s.viewers} · {s.liveMode === "guests" ? `Invités jusqu’à ${s.guestLimit}` : "Solo"}</span><button className="btn-secondary btn-sm" onClick={() => setRoomId(s.id)}>{s.hostId === list.me ? "Reprendre" : "Rejoindre"}</button></div>) : <p className="text-sm text-zinc-500">Aucun LIVE pour le moment.</p>}</div>
    </>}
    {roomId && state && <div className="space-y-4">
      <LiveKitStage sessionId={roomId} />
      <div className="card flex flex-wrap items-center justify-between gap-2 p-4"><div><h2 className="font-bold">{state.session.title}</h2><p className="text-xs text-zinc-400">@{state.session.host} · 👀 {state.viewers} · 🎁 {state.giftsCount} cadeau(x) ({state.giftsTokens} 🪙) · {state.session.liveMode === "guests" ? `Scène invités ${state.guests.length}/${state.session.guestLimit}` : "LIVE solo"}</p></div><div className="flex gap-2"><button className="btn-secondary btn-sm" onClick={() => { setRoomId(null); setState(null); }}>Quitter</button>{state.session.isHost && <button className="btn-secondary btn-sm" onClick={end}>■ Terminer</button>}</div></div>
      {state.session.liveMode === "guests" && <div className="card space-y-3 p-4"><p className="font-semibold">🎙️ Scène sans match — invités</p><p className="text-sm text-zinc-400">{state.guests.length ? `Sur scène : ${state.guests.map((g: any) => "@" + g.name).join(", ")}` : "Aucun invité accepté pour le moment."} · capacité {state.session.guestLimit}</p>{state.session.canManageGuests && state.guests.map((g:any)=><div key={g.id} className="flex items-center justify-between text-xs"><span>@{g.name} est sur scène</span><button className="btn-secondary btn-sm" onClick={()=>manageLiveUser("block",g.id)}>Bloquer et retirer</button></div>)}{!state.session.isHost && state.myGuestStatus !== "accepted" && <button className="btn-secondary btn-sm" onClick={requestGuest} disabled={state.myGuestStatus === "pending"}>{state.myGuestStatus === "pending" ? "Demande envoyée" : "Demander à monter sur scène"}</button>}{state.session.canManageGuests && state.pendingGuests.map((g: any) => <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>@{g.name} demande à monter</span><span className="flex gap-2"><button className="btn-primary btn-sm" onClick={() => decideGuest(g.id, "approve")}>Accepter</button><button className="btn-secondary btn-sm" onClick={() => decideGuest(g.id, "reject")}>Refuser</button><button className="btn-secondary btn-sm" onClick={() => manageLiveUser("block",g.id)}>Bloquer</button></span></div>)}{state.session.isHost && <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-3"><input className="input min-w-0 flex-1" value={moderatorUsername} onChange={e=>setModeratorUsername(e.target.value.replace(/^@/, ""))} placeholder="Nom d’utilisateur (ex. banani_123abc)"/><button className="btn-secondary btn-sm" onClick={addLiveModerator} disabled={moderatorUsername.trim().length < 2}>Nommer modérateur</button></div>}{state.session.isHost && state.moderators?.map((m:any)=><div key={m.id} className="flex items-center justify-between text-xs text-zinc-400"><span>Modérateur : @{m.username}</span><button className="btn-secondary btn-sm" onClick={()=>manageLiveUser("remove",m.id)}>Retirer</button></div>)}</div>}
      {!state.session.isHost && eco.giftsEnabled && <div className="card p-4"><p className="mb-2 text-sm font-semibold">🎁 Offrir un cadeau à @{state.session.host} <span className="text-xs font-normal text-zinc-400">({eco.creatorSharePct}% des pièces au créateur)</span></p><div className="flex flex-wrap gap-2">{eco.gifts.map((g: any) => <button key={g.id} className="btn-secondary btn-sm" onClick={() => gift(g)}>{g.animationUrl && /\.mp4(\?|$)/i.test(g.animationUrl) ? <video src={g.animationUrl} className="inline-block h-6 w-6 object-contain" autoPlay loop muted playsInline /> : g.imageUrl ? <img src={g.animationUrl || g.imageUrl} alt="" className="inline-block h-6 w-6 object-contain" /> : g.emoji} {g.name} · {g.tokens} pièces 🪙</button>)}</div></div>}
      {ch.enabled && <div className="card space-y-3 p-4">
        <p className="font-semibold">🧰 Déposer un coffre de pièces</p>
        <div className="grid gap-2 sm:grid-cols-2"><label className="text-sm">Total de pièces<input className="input" inputMode="numeric" value={chest.total} onChange={e => setChest({ ...chest, total: e.target.value })} /></label><label className="text-sm">Pour combien de personnes (max {ch.maxClaimants})<input className="input" inputMode="numeric" value={chest.people} onChange={e => setChest({ ...chest, people: e.target.value })} /></label></div>
        <div className="rounded-lg bg-zinc-900/60 p-3 text-xs text-zinc-300"><b>Règle (visible par tous) :</b> chaque participant présent reçoit la même part brute, premiers arrivés premiers servis, une seule fois par personne. Le créateur reçoit 60 % de chaque part réclamée et Wesh Star IA conserve 40 %. {valid ? <>Ici : <b>{people} × {share} pièce(s) = {reserved}</b> pièce(s) réservées{total - reserved > 0 ? ` (${total - reserved} non utilisés, non débités)` : ""}.</> : <span className="text-red-300">Il faut au moins 2 pièces par personne.</span>} Les parts non réclamées te sont rendues à la clôture ou après {ch.expiresMinutes} min. Il faut être présent depuis {ch.minPresenceSeconds} s.</div>
        <button className="btn-primary" onClick={deposit} disabled={!valid}>Déposer le coffre</button>
      </div>}
      {state.chests.length > 0 && <div className="space-y-2">{state.chests.map((c: any) => <div key={c.id} className="card flex flex-wrap items-center justify-between gap-2 p-4 text-sm"><span>🧰 Coffre de @{c.depositor} · {c.shareTokens}🪙 brut / personne · {c.claimed}/{c.maxClaimants} pris</span><span className="flex gap-2">{!c.mine && !c.claimedByMe && <button className="btn-primary btn-sm" onClick={() => claim(c.id)}>Prendre ma part</button>}{c.claimedByMe && <span className="text-green-400">✓ Pris</span>}{(c.mine || state.session.isHost) && <button className="btn-secondary btn-sm" onClick={() => closeChest(c.id)}>Clôturer</button>}</span></div>)}</div>}
    </div>}
  </div>;
}
