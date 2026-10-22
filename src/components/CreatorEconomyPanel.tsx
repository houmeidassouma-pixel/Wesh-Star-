"use client";
import { useEffect, useState } from "react";
import { BUILTIN_EFFECTS } from "@/lib/creator-effects";

const post = (body: any) => fetch("/api/admin/creator-economy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) }));
const ERRS: Record<string, string> = { SUM_NOT_100: "Les deux pourcentages doivent faire exactement 100 %.", INVALID_PERCENT: "Pourcentage invalide (0 à 100).", LLM_UNAVAILABLE: "L'IA locale (Ollama) est injoignable.", INVALID: "Valeur invalide." };

export default function CreatorEconomyPanel() {
  const [d, setD] = useState<any>(null);
  const [eco, setEco] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [newGift, setNewGift] = useState({ name: "", emoji: "🎁", tokens: "5", imageUrl: "", animationUrl: "" });
  const [propPrice, setPropPrice] = useState<Record<string, string>>({});
  const [platformWithdrawal, setPlatformWithdrawal] = useState({ amountEur: "", reference: "", note: "" });
  const [reserveW, setReserveW] = useState({ amountEur: "", reference: "", confirm: "" });

  const load = () => fetch("/api/admin/creator-economy").then(r => r.json()).then(j => { setD(j); setEco(j.economy); });
  useEffect(() => { load(); }, []);
  if (!eco || !d) return <section className="card p-6 text-sm text-zinc-500">Chargement de l'économie créateur…</section>;

  const run = async (body: any, ok = "✅ Enregistré") => { const x = await post(body); setMsg(x.ok ? ok : "❌ " + (ERRS[x.d.error] || x.d.error || "Erreur")); await load(); return x.ok; };
  const creator = Number(eco.creatorSharePct), platform = Math.round((100 - creator) * 100) / 100;
  const set = (patch: any) => setEco({ ...eco, ...patch });
  const setChest = (patch: any) => setEco({ ...eco, chests: { ...eco.chests, ...patch } });
  const setEffect = (id: string, patch: any) => setEco({ ...eco, effects: eco.effects.map((e: any) => e.id === id ? { ...e, ...patch } : e) });
  const setGift = (id: string, patch: any) => setEco({ ...eco, gifts: eco.gifts.map((g: any) => g.id === id ? { ...g, ...patch } : g) });
  const save = () => run({ action: "saveEconomy", economy: { ...eco, creatorSharePct: creator, platformSharePct: platform } });
  const num = (v: any) => Number(v) || 0;

  return <section id="creator-economy" className="card animate-fade-up scroll-mt-6 space-y-6 p-6">
    <div className="flex items-center justify-between"><h2 className="font-bold">🎁 Économie créateur : cadeaux, effets, coffres, LIVE</h2><button className="btn-secondary btn-sm" onClick={load}>Actualiser</button></div>
    {msg && <p role="status" className="rounded-lg border border-zinc-800 p-3 text-sm">{msg}</p>}

    <div className="rounded-xl border border-zinc-800 p-4 space-y-3">
      <h3 className="font-semibold">💰 Partage des revenus des cadeaux</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Créateur (%)<input className="input" inputMode="decimal" value={eco.creatorSharePct} onChange={e => set({ creatorSharePct: e.target.value })} /></label>
        <label className="text-sm">Wesh Star IA (%) — calculé<input className="input" disabled value={creator >= 0 && creator <= 100 ? platform : "—"} /></label>
      </div>
      <p className="text-xs text-zinc-400">Les deux parts font toujours 100 %. Les cadeaux utilisent le portefeuille de pièces, distinct des crédits vidéo. Le calcul est fait sur le serveur, en pièces entières (arrondi vers le bas pour le créateur, le reste va à la plateforme). Le pourcentage appliqué est figé dans chaque transaction : modifier la règle ne change pas l'historique. Chaque modification est écrite dans le journal d'audit.</p>
      <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex items-center gap-2"><input type="checkbox" checked={eco.giftsEnabled} onChange={e => set({ giftsEnabled: e.target.checked })} /> Cadeaux activés</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={eco.soundsEnabled} onChange={e => set({ soundsEnabled: e.target.checked })} /> Sons partagés</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={eco.live.enabled} onChange={e => set({ live: { enabled: e.target.checked } })} /> LIVE activé</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={eco.aiProposalsEnabled} onChange={e => set({ aiProposalsEnabled: e.target.checked })} /> Propositions IA (cron)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={eco.autoEdit.enabled} onChange={e => set({ autoEdit: { ...eco.autoEdit, enabled: e.target.checked } })} /> Montage automatique</label>
        <label className="text-xs">Clips max<input className="input" inputMode="numeric" value={eco.autoEdit.maxClips} onChange={e => set({ autoEdit: { ...eco.autoEdit, maxClips: num(e.target.value) } })} /></label>
        <label className="text-xs">Secondes max / clip<input className="input" inputMode="numeric" value={eco.autoEdit.maxSecondsPerClip} onChange={e => set({ autoEdit: { ...eco.autoEdit, maxSecondsPerClip: num(e.target.value) } })} /></label>
      </div>
      <button className="btn-primary" onClick={save}>Enregistrer tout</button>
    </div>

    <div className="rounded-xl border border-zinc-800 p-4 space-y-3">
      <h3 className="font-semibold">🪙 Packs de pièces (prix en euros)</h3>
      <p className="text-xs text-zinc-400">Ces pièces sont distinctes des crédits vidéo vidéo. Vérifie les prix avant d'ouvrir les achats. Le crédit des pièces intervient uniquement après confirmation du webhook de paiement.</p>
      <div className="space-y-2">{(eco.coinPacks || []).map((p: any, i: number) => <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm"><span className="w-28">{p.id}</span><label className="text-xs">Pièces<input className="input w-24" type="number" min={1} max={10000000} value={p.coins} onChange={e => set({ coinPacks: eco.coinPacks.map((x: any, j: number) => j === i ? { ...x, coins: num(e.target.value) } : x) })} /></label><label className="text-xs">Prix (€)<input className="input w-24" type="number" min={0.5} max={10000} step="0.01" value={p.priceEur} onChange={e => set({ coinPacks: eco.coinPacks.map((x: any, j: number) => j === i ? { ...x, priceEur: Number(e.target.value) } : x) })} /></label><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={p.active} onChange={e => set({ coinPacks: eco.coinPacks.map((x: any, j: number) => j === i ? { ...x, active: e.target.checked } : x) })} /> actif</label></div>)}</div>
      <button className="btn-primary btn-sm" onClick={save}>Enregistrer les packs de pièces</button>
    </div>

    <div className="rounded-xl border border-zinc-800 p-4 space-y-3">
      <h3 className="font-semibold">🧰 Règles des coffres LIVE</h3>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={eco.chests.enabled} onChange={e => setChest({ enabled: e.target.checked })} /> Coffres activés</label>
      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        {([["maxClaimants", "Participants max"], ["maxTotalTokens", "Total max (pièces)"], ["expiresMinutes", "Expiration (min)"], ["minPresenceSeconds", "Présence min (s)"], ["minAccountAgeMinutes", "Ancienneté compte min (min)"], ["maxOpenPerSession", "Coffres ouverts max / LIVE"]] as const).map(([k, l]) => <label key={k}>{l}<input className="input" inputMode="numeric" value={eco.chests[k]} onChange={e => setChest({ [k]: num(e.target.value) })} /></label>)}
      </div>
      <p className="text-xs text-zinc-400">Distribution : parts égales, premiers arrivés premiers servis, 1 part par personne, aucun hasard. Seules les parts réservées sont débitées ; les parts non réclamées sont rendues au déposant.</p>
      <p className="text-xs text-zinc-500">Coffres créés : {d.chestTotals.n} · ouverts : {d.chestTotals.open} · pièces brutes réservées : {d.chestTotals.reserved} · remboursées : {d.chestTotals.refunded}</p>
      <button className="btn-primary btn-sm" onClick={save}>Enregistrer</button>
    </div>

    <div className="rounded-xl border border-zinc-800 p-4 space-y-3">
      <h3 className="font-semibold">🎁 Catalogue de cadeaux (prix en pièces Wesh)</h3>
      <div className="space-y-2">{eco.gifts.map((g: any) => <div key={g.id} className="flex flex-wrap items-center gap-2 text-sm"><span className="w-8 text-center text-xl">{g.emoji}</span><span className="w-32 truncate">{g.name}</span><input className="input w-24" inputMode="numeric" value={g.tokens} onChange={e => setGift(g.id, { tokens: num(e.target.value) })} /><span>🪙</span><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={g.active} onChange={e => setGift(g.id, { active: e.target.checked })} /> actif</label></div>)}</div>
      <div className="flex flex-wrap items-end gap-2 border-t border-zinc-800 pt-3 text-sm"><label className="text-xs">Nom<input className="input" maxLength={40} value={newGift.name} onChange={e => setNewGift({ ...newGift, name: e.target.value })} /></label><label className="text-xs">Emoji<input className="input w-20" value={newGift.emoji} onChange={e => setNewGift({ ...newGift, emoji: e.target.value })} /></label><label className="text-xs">Prix 🪙<input className="input w-24" inputMode="numeric" value={newGift.tokens} onChange={e => setNewGift({ ...newGift, tokens: e.target.value })} /></label><label className="text-xs">URL image (facultatif)<input className="input w-52" value={newGift.imageUrl} onChange={e => setNewGift({ ...newGift, imageUrl: e.target.value })} placeholder="https://…/cadeau.png" /></label><label className="text-xs">URL animation GIF/MP4 (facultatif)<input className="input w-52" value={newGift.animationUrl} onChange={e => setNewGift({ ...newGift, animationUrl: e.target.value })} placeholder="https://…/cadeau.gif" /></label><button className="btn-secondary btn-sm" onClick={async () => { if (await run({ action: "createGift", ...newGift, tokens: num(newGift.tokens) }, "✅ Cadeau créé")) setNewGift({ name: "", emoji: "🎁", tokens: "5", imageUrl: "", animationUrl: "" }); }}>+ Créer mon cadeau</button></div>
      <button className="btn-primary btn-sm" onClick={save}>Enregistrer les prix / activations</button>
    </div>

    <div className="rounded-xl border border-zinc-800 p-4 space-y-3">
      <h3 className="font-semibold">🤖 Propositions de cadeaux (à valider avant publication)</h3>
      <p className="text-xs text-zinc-400">L'IA locale propose des idées ; rien n'est visible des utilisateurs tant que tu n'as pas approuvé. Génération automatique : appeler <code>POST /api/worker/gift-proposals</code> par cron (avec CRON_SECRET) après avoir coché « Propositions IA ».</p>
      <button className="btn-secondary btn-sm" onClick={async () => { setMsg("Génération en cours…"); await run({ action: "generateProposals" }, "✅ Propositions générées"); }}>Générer des propositions maintenant</button>
      {d.proposals.filter((p: any) => p.status === "pending").length === 0 && <p className="text-xs text-zinc-500">Aucune proposition en attente.</p>}
      {d.proposals.filter((p: any) => p.status === "pending").map((p: any) => <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm"><span className="text-xl">{p.emoji}</span><span className="w-32 truncate">{p.name}</span><input className="input w-20" inputMode="numeric" value={propPrice[p.id] ?? p.tokens} onChange={e => setPropPrice({ ...propPrice, [p.id]: e.target.value })} /><span>🪙</span><input className="input w-44" value={p.image_url || ""} placeholder="URL image (facultatif)" onChange={e => setD({ ...d, proposals: d.proposals.map((x:any) => x.id === p.id ? { ...x, image_url: e.target.value } : x) })} /><input className="input w-44" value={p.animation_url || ""} placeholder="URL GIF/MP4 (facultatif)" onChange={e => setD({ ...d, proposals: d.proposals.map((x:any) => x.id === p.id ? { ...x, animation_url: e.target.value } : x) })} /><button className="btn-primary btn-sm" onClick={() => run({ action: "decideProposal", id: p.id, decision: "approve", tokens: num(propPrice[p.id] ?? p.tokens), imageUrl: p.image_url || "", animationUrl: p.animation_url || "" }, "✅ Cadeau publié")}>Approuver</button><button className="btn-secondary btn-sm" onClick={() => run({ action: "decideProposal", id: p.id, decision: "reject" }, "Refusé")}>Refuser</button></div>)}
    </div>

    <div className="rounded-xl border border-zinc-800 p-4 space-y-3">
      <h3 className="font-semibold">✨ Effets vidéo : gratuit / payant (crédits vidéo, achat définitif)</h3>
      <div className="grid gap-2 sm:grid-cols-2">{eco.effects.map((e: any) => <div key={e.id} className="flex flex-wrap items-center gap-2 text-sm"><span className="w-24">{BUILTIN_EFFECTS.find(b => b.id === e.id)?.label}</span><select className="input w-28" value={e.tier} onChange={ev => setEffect(e.id, { tier: ev.target.value, tokens: ev.target.value === "paid" ? Math.max(1, e.tokens) : 0 })}><option value="free">Gratuit</option><option value="paid">Payant</option></select>{e.tier === "paid" && <><input className="input w-20" inputMode="numeric" value={e.tokens} onChange={ev => setEffect(e.id, { tokens: num(ev.target.value) })} /><span>🪙</span></>}<label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={e.active} onChange={ev => setEffect(e.id, { active: ev.target.checked })} /> actif</label></div>)}</div>
      <p className="text-xs text-zinc-500">La liste des effets est fixée dans le code (sécurité des filtres FFmpeg). Tu règles ici le prix et l'activation.</p>
      <button className="btn-primary btn-sm" onClick={save}>Enregistrer</button>
    </div>

    <div className="rounded-xl border border-zinc-800 p-4 space-y-2 text-sm">
      <h3 className="font-semibold">📊 Cadeaux reçus</h3>
      <p className="text-zinc-300">{d.giftTotals.n} cadeau(x) · {d.giftTotals.tokens} 🪙 au total · créateurs : {d.giftTotals.creator} pièces 🪙 · plateforme : {d.giftTotals.platform} pièces 🪙</p>
      {d.topCreators.length > 0 && <div className="text-xs text-zinc-400">Top créateurs : {d.topCreators.map((t: any) => `${t.email} (${t.creator_tokens} pièces🪙)`).join(" · ")}</div>}
      {d.recentGifts.length > 0 && <div className="max-h-40 overflow-y-auto text-xs text-zinc-400">{d.recentGifts.map((g: any, i: number) => <div key={i}>{new Date(g.created_at).toLocaleString("fr-FR")} · {g.sender} → {g.receiver} · {g.gift_name} {g.tokens}🪙 ({g.creator_pct}% = {g.creator_tokens} / {g.platform_tokens} pièces)</div>)}</div>}
      <p className="text-xs text-zinc-500">Le solde des pièces est séparé des crédits de génération. Les demandes de retrait doivent être validées et payées manuellement par l’administration tant qu’un prestataire de versement n’est pas intégré.</p>
    </div>

    <div className="rounded-xl border border-zinc-800 p-4 space-y-3 text-sm">
      <h3 className="font-semibold">🏦 Trésorerie des pièces (euros)</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 p-3"><div className="text-xs text-zinc-400">Part plateforme (hors réserve)</div><div className="text-lg font-bold">{(Number(d.platformMoney?.platformCents || 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</div></div>
        <div className="rounded-lg border border-zinc-800 p-3"><div className="text-xs text-zinc-400">Réserve créateurs</div><div className="text-lg font-bold">{(Number(d.platformMoney?.creatorReserveCents || 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</div></div>
        <div className="rounded-lg border border-zinc-800 p-3"><div className="text-xs text-zinc-400">Dû aux créateurs (gains + retraits non payés)</div><div className="text-lg font-bold">{(Number(d.reserveStats?.owedCents || 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</div></div>
        <div className="rounded-lg border border-zinc-800 p-3"><div className="text-xs text-zinc-400">Surplus retirable sans risque</div><div className="text-lg font-bold">{(Number(d.reserveStats?.surplusCents || 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</div></div>
      </div>
      <p className="text-xs text-zinc-400">Ce sont des écritures comptables. L'argent réel arrive sur ton compte de paiement (Stripe / Flutterwave) : garde la part « réserve » de côté pour pouvoir payer les retraits.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs">Montant à retirer de la réserve (€)<input className="input" type="number" min="0.01" step="0.01" value={reserveW.amountEur} onChange={e => setReserveW({ ...reserveW, amountEur: e.target.value })} /></label>
        <label className="text-xs">Référence du virement<input className="input" value={reserveW.reference} onChange={e => setReserveW({ ...reserveW, reference: e.target.value })} /></label>
        <label className="text-xs">Au-delà du surplus : écrire FORCER<input className="input" value={reserveW.confirm} onChange={e => setReserveW({ ...reserveW, confirm: e.target.value })} /></label>
      </div>
      <button className="btn-secondary btn-sm" onClick={async () => { const x = await post({ action: "reserveWithdrawal", ...reserveW }); setMsg(x.ok ? "✅ Retrait de la réserve enregistré." : x.d.error === "RESERVE_WOULD_BE_UNDERFUNDED" ? "⚠️ Ce retrait dépasse le surplus : la réserve ne couvrirait plus tous les gains. Écris FORCER pour confirmer." : "❌ " + (x.d.error || "Erreur")); await load(); }}>Retirer de la réserve</button>
      <div className="border-t border-zinc-800 pt-3 space-y-2">
        <h4 className="font-semibold">Retraits automatiques des créateurs</h4>
        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={!!eco.payouts?.enabled} onChange={e => set({ payouts: { ...(eco.payouts || {}), enabled: e.target.checked } })} /> Retraits en argent ACTIVÉS pour les créateurs (désactivé = ils voient seulement leurs pièces)</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!eco.payouts?.autoApprove} onChange={e => set({ payouts: { ...(eco.payouts || {}), autoApprove: e.target.checked } })} /> Approuver automatiquement les demandes qui respectent les règles</label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs">Montant maximum auto-approuvé (€)<input className="input" inputMode="decimal" value={eco.payouts?.autoApproveMaxEur ?? 50} onChange={e => set({ payouts: { ...(eco.payouts || {}), autoApproveMaxEur: e.target.value } })} /></label>
          <label className="text-xs">Âge minimum du compte (jours)<input className="input" inputMode="numeric" value={eco.payouts?.minAccountAgeDays ?? 7} onChange={e => set({ payouts: { ...(eco.payouts || {}), minAccountAgeDays: e.target.value } })} /></label>
        </div>
        <p className="text-xs text-zinc-400">Règles : minimum de retrait atteint, gains suffisants, compte non bloqué, ancienneté, aucune autre demande en cours, réserve suffisante. L'approbation est automatique ; le versement réel doit encore être exécuté (voir ci-dessous). Pense à enregistrer les réglages de l'économie.</p>
      </div>
    </div>

    <div className="rounded-xl border border-zinc-800 p-4 space-y-3 text-sm">
      <h3 className="font-semibold">🎬 Conversion des gains en crédits vidéo IA</h3>
      <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={!!eco.conversion?.enabled} onChange={e => set({ conversion: { ...(eco.conversion || {}), enabled: e.target.checked } })} /> Autoriser les créateurs à demander cette conversion (tu valides chaque demande)</label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs">Crédits vidéo pour 100 pièces gagnées<input className="input" inputMode="numeric" value={eco.conversion?.creditsPer100Coins ?? 80} onChange={e => set({ conversion: { ...(eco.conversion || {}), creditsPer100Coins: e.target.value } })} /></label>
        <label className="text-xs">Minimum de pièces par demande<input className="input" inputMode="numeric" value={eco.conversion?.minCoins ?? 100} onChange={e => set({ conversion: { ...(eco.conversion || {}), minCoins: e.target.value } })} /></label>
      </div>
      <p className="text-xs text-zinc-400">1 crédit vidéo = 10 secondes. Par défaut 100 pièces (1 €) = 80 crédits, comme le prix de la boutique. Enregistre les réglages de l'économie après modification. La valeur des pièces converties reste dans la réserve (elle apparaît dans le surplus retirable).</p>
      {(d.conversionRequests || []).length === 0 && <p className="text-xs text-zinc-500">Aucune demande de conversion.</p>}
      {(d.conversionRequests || []).map((r: any) => <div key={r.id} className="flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-2"><span className="min-w-48">{r.email} · {Number(r.coins).toLocaleString("fr-FR")} pièces → {Number(r.credits).toLocaleString("fr-FR")} crédits · {r.status}</span>{r.status === "pending" && <><button className="btn-secondary btn-sm" onClick={async () => { const x = await post({ action: "decideConversion", id: r.id, decision: "approve" }); setMsg(x.ok ? "✅ Conversion validée : crédits ajoutés." : "❌ " + (x.d.error || "Erreur")); await load(); }}>Valider</button><button className="btn-secondary btn-sm" onClick={async () => { const x = await post({ action: "decideConversion", id: r.id, decision: "reject" }); setMsg(x.ok ? "Conversion refusée : pièces rendues." : "❌ " + (x.d.error || "Erreur")); await load(); }}>Refuser</button></>}</div>)}
    </div>

    <div className="rounded-xl border border-zinc-800 p-4 space-y-3 text-sm">
      <h3 className="font-semibold">💸 Wesh Store — demandes de retrait des créateurs</h3>
      <p className="text-xs text-zinc-400">Solde comptable plateforme (40 % des achats de pièces confirmés) : {(Number(d.platformMoney?.platformCents || 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}. Réserve comptable créateurs (60 %) : {(Number(d.platformMoney?.creatorReserveCents || 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}. Ce sont des écritures de suivi, pas un solde bancaire. Le virement réel doit être effectué via la banque/le prestataire puis enregistré ici.</p>
      <div className="grid gap-2 sm:grid-cols-3"><label className="text-xs">Montant déjà transféré (€)<input className="input" type="number" min="0.01" step="0.01" value={platformWithdrawal.amountEur} onChange={e=>setPlatformWithdrawal({...platformWithdrawal,amountEur:e.target.value})}/></label><label className="text-xs">Référence du virement<input className="input" value={platformWithdrawal.reference} onChange={e=>setPlatformWithdrawal({...platformWithdrawal,reference:e.target.value})}/></label><label className="text-xs">Note (facultatif)<input className="input" value={platformWithdrawal.note} onChange={e=>setPlatformWithdrawal({...platformWithdrawal,note:e.target.value})}/></label></div>
      <button className="btn-secondary btn-sm" onClick={async()=>{const x=await post({action:"recordPlatformWithdrawal",...platformWithdrawal});setMsg(x.ok?"✅ Retrait comptable enregistré : le transfert doit déjà avoir été effectué séparément.":"❌ "+(x.d.error||"Erreur"));await load();}}>Enregistrer un virement sortant effectué</button>
      <p className="text-xs text-zinc-500">Solde de pièces de la plateforme : {Number(d.platformCoinBalance || 0).toLocaleString("fr-FR")} pièces. Les virements ne sont pas exécutés automatiquement par ce bouton.</p>
      {(d.payoutRequests || []).length === 0 && <p className="text-xs text-zinc-500">Aucune demande de retrait.</p>}
      {(d.payoutRequests || []).map((r: any) => <div key={r.id} className="flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-2"><span className="min-w-48">{r.email} · {Number(r.coins).toLocaleString("fr-FR")} pièces ({(Number(r.coins)/100).toLocaleString("fr-FR", {style:"currency",currency:"EUR"})}) · {r.payout_method || "moyen non renseigné"} · {r.payout_destination || "coordonnées manquantes"} · {r.status}</span>{r.status === "pending" && <><button className="btn-primary btn-sm" onClick={() => run({ action: "decidePayout", id: r.id, decision: "approve" }, "Demande approuvée ; effectuer le versement puis saisir sa référence")}>Approuver</button><button className="btn-secondary btn-sm" onClick={() => run({ action: "decidePayout", id: r.id, decision: "reject", note: "Demande refusée par l’administration" }, "Demande refusée et pièces rendues")}>Refuser</button></>}{r.status === "approved" && <button className="btn-primary btn-sm" onClick={async () => { const ref = window.prompt("Référence du virement réellement effectué :"); if (ref?.trim()) await run({ action: "decidePayout", id: r.id, decision: "paid", payoutReference: ref.trim() }, "Paiement marqué comme effectué"); }}>Marquer payé…</button>}</div>)}
    </div>

    <div className="rounded-xl border border-zinc-800 p-4 space-y-2 text-sm">
      <h3 className="font-semibold">🎵 Sons publiés (modération)</h3>
      {d.sounds.length === 0 && <p className="text-xs text-zinc-500">Aucun son publié.</p>}
      {d.sounds.map((s: any) => <div key={s.id} className="flex flex-wrap items-center gap-2 text-xs"><span className="w-48 truncate">{s.title} · {s.email}</span><span>{s.allow_reuse ? "réutilisable" : "privé"} · {s.uses_count} usage(s) · {s.status}</span>{s.status === "active" ? <button className="btn-secondary btn-sm" onClick={() => run({ action: "setSoundStatus", id: s.id, status: "hidden" }, "Son masqué")}>Masquer</button> : <button className="btn-secondary btn-sm" onClick={() => run({ action: "setSoundStatus", id: s.id, status: "active" }, "Son réactivé")}>Réactiver</button>}</div>)}
    </div>
  </section>;
}
