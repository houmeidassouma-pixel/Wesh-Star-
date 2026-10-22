// Règles pures (sans dépendance) de l'économie créateur : jetons, partage des cadeaux, configuration.
// Tout calcul d'argent/jetons se fait côté serveur avec ces fonctions : le navigateur n'envoie jamais un prix ni un pourcentage.

// 1 jeton IA = 10 secondes de génération. Les pièces cadeaux LIVE sont dans coin_ledger et ne sont jamais converties en crédits IA.
export const TOKEN_SECONDS = 10;
export const tokensToSeconds = (t: number) => Math.floor(t) * TOKEN_SECONDS;

export type GiftDef = { id: string; name: string; emoji: string; tokens: number; active: boolean; imageUrl?: string; animationUrl?: string };
export type EffectPricing = { id: string; tier: "free" | "paid"; tokens: number; active: boolean };
export type CoinPack = { id: string; coins: number; priceEur: number; active: boolean };
export type CreatorEconomy = {
  giftsEnabled: boolean;
  creatorSharePct: number;      // part du créateur ; la part plateforme = 100 - creatorSharePct
  gifts: GiftDef[];
  coinPacks: CoinPack[];
  effects: EffectPricing[];
  soundsEnabled: boolean;
  autoEdit: { enabled: boolean; maxClips: number; maxSecondsPerClip: number };
  // LIVE : désactivé par défaut. Aucun flux vidéo en direct n'est branché (voir rapport) : ce module gère salons, présence, cadeaux, coffres.
  live: { enabled: boolean };
  chests: { enabled: boolean; maxClaimants: number; maxTotalTokens: number; expiresMinutes: number; minPresenceSeconds: number; minAccountAgeMinutes: number; maxOpenPerSession: number };
  // Retraits créateurs : approbation automatique (le paiement réel reste à exécuter par un prestataire ou manuellement).
  payouts: { enabled: boolean; autoApprove: boolean; autoApproveMaxEur: number; minAccountAgeDays: number };
  // Conversion des pièces gagnées en crédits vidéo IA (validée par l'admin). 1 crédit vidéo = 10 secondes.
  conversion: { enabled: boolean; creditsPer100Coins: number; minCoins: number };
  aiProposalsEnabled: boolean;   // propositions de cadeaux par l'IA locale (toujours en attente de validation admin)
};

const FREE_BY_DEFAULT = new Set(["normal", "mono", "sepia", "bright"]);
const EFFECT_IDS = ["normal", "mono", "sepia", "bright", "cinema", "vivid", "warm", "cool", "vintage", "dramatic", "dreamy"];

export const defaultEconomy: CreatorEconomy = {
  giftsEnabled: true,
  creatorSharePct: 60,
  // Prix des cadeaux en pièces Wesh ; ces pièces sont séparées des crédits vidéo.
  gifts: [
    { id: "rose", name: "Rose", emoji: "🌹", tokens: 5, active: true },
    { id: "heart", name: "Cœur", emoji: "💖", tokens: 10, active: true },
    { id: "star", name: "Étoile", emoji: "⭐", tokens: 20, active: true },
    { id: "crown", name: "Couronne", emoji: "👑", tokens: 100, active: true },
  ],
  // Starter pricing examples; editable by the administrator before launch.
  coinPacks: [
    { id: "coins_100", coins: 100, priceEur: 1.00, active: true },
    { id: "coins_500", coins: 500, priceEur: 5.00, active: true },
    { id: "coins_1200", coins: 1200, priceEur: 12.00, active: true },
    { id: "coins_3000", coins: 3000, priceEur: 30.00, active: true },
    { id: "coins_7000", coins: 7000, priceEur: 70.00, active: true },
  ],
  effects: EFFECT_IDS.map((id) => ({ id, tier: FREE_BY_DEFAULT.has(id) ? "free" as const : "paid" as const, tokens: FREE_BY_DEFAULT.has(id) ? 0 : 1, active: true })),
  soundsEnabled: true,
  autoEdit: { enabled: true, maxClips: 10, maxSecondsPerClip: 8 },
  live: { enabled: false },
  chests: { enabled: true, maxClaimants: 1000, maxTotalTokens: 100000, expiresMinutes: 10, minPresenceSeconds: 15, minAccountAgeMinutes: 60, maxOpenPerSession: 3 },
  payouts: { enabled: false, autoApprove: false, autoApproveMaxEur: 50, minAccountAgeDays: 7 },
  conversion: { enabled: false, creditsPer100Coins: 80, minCoins: 100 },
  aiProposalsEnabled: true,
};

const int = (v: unknown, min: number, max: number, fb: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
};

function safeAssetUrl(v: unknown): string | undefined {
  const s = String(v || "").trim().slice(0, 1000);
  if (!s) return undefined;
  if (/^\/api\/video-edit\/generate-asset\/image\?jobId=[a-f0-9]{32}$/i.test(s)) return s;
  try { const u = new URL(s); return ["https:", "http:"].includes(u.protocol) ? s : undefined; } catch { return undefined; }
}

export function normalizeEconomy(raw: any): CreatorEconomy {
  const d = defaultEconomy;
  const pct = Number(raw?.creatorSharePct);
  const creatorSharePct = Number.isFinite(pct) ? Math.min(100, Math.max(0, Math.round(pct * 100) / 100)) : d.creatorSharePct;
  const gifts: GiftDef[] = Array.isArray(raw?.gifts)
    ? raw.gifts.slice(0, 30).map((g: any, i: number) => ({
        id: String(g?.id || `gift_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40),
        name: String(g?.name || "Cadeau").trim().slice(0, 40) || "Cadeau",
        emoji: String(g?.emoji || "🎁").slice(0, 8),
        tokens: int(g?.tokens, 1, 100000, 1),
        active: g?.active !== false,
        imageUrl: safeAssetUrl(g?.imageUrl),
        animationUrl: safeAssetUrl(g?.animationUrl),
      })).filter((g: GiftDef, i: number, a: GiftDef[]) => a.findIndex((x) => x.id === g.id) === i)
    : d.gifts;
  // Les effets sont une liste fermée : on part des défauts et on n'accepte que tier / prix / actif.
  const storedPacks = Array.isArray(raw?.coinPacks) ? raw.coinPacks : null;
  const isOldDefaultPacks = !!storedPacks && storedPacks.length === 3 && Number(storedPacks[0]?.coins) === 100 && Math.abs(Number(storedPacks[0]?.priceEur) - 1.49) < 0.01 && Number(storedPacks[1]?.coins) === 550 && Math.abs(Number(storedPacks[1]?.priceEur) - 7.49) < 0.01 && Number(storedPacks[2]?.coins) === 1200 && Math.abs(Number(storedPacks[2]?.priceEur) - 14.99) < 0.01;
  const isV16DefaultPacks = !!storedPacks && storedPacks.length === 5 && [100,500,1200,3000,7000].every((n,i)=>Number(storedPacks[i]?.coins)===n) && [0.99,3.99,7.99,14.99,29.99].every((n,i)=>Math.abs(Number(storedPacks[i]?.priceEur)-n)<0.01);
  const packsInput = isOldDefaultPacks || isV16DefaultPacks ? d.coinPacks : storedPacks;
  const coinPacks = Array.isArray(packsInput) ? packsInput.slice(0, 10).map((p: any, i: number) => ({
    id: String(p?.id || `coins_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40),
    coins: int(p?.coins, 1, 10_000_000, d.coinPacks[i]?.coins || 100),
    priceEur: Math.max(0.5, Math.min(10000, Math.round(Number(p?.priceEur || d.coinPacks[i]?.priceEur || 1) * 100) / 100)),
    active: p?.active !== false,
  })).filter((p: CoinPack, i: number, a: CoinPack[]) => a.findIndex((x) => x.id === p.id) === i) : d.coinPacks;
  const effects: EffectPricing[] = d.effects.map((def) => {
    const r = Array.isArray(raw?.effects) ? raw.effects.find((x: any) => x?.id === def.id) : null;
    if (!r) return def;
    const tier = r.tier === "paid" ? "paid" : "free";
    const tokens = tier === "paid" ? int(r.tokens, 1, 100000, def.tokens || 1) : 0;
    return { id: def.id, tier, tokens, active: r.active !== false };
  });
  const ae = raw?.autoEdit || {};
  const ch = raw?.chests || {};
  return {
    giftsEnabled: raw?.giftsEnabled !== false,
    creatorSharePct,
    gifts,
    coinPacks,
    effects,
    soundsEnabled: raw?.soundsEnabled !== false,
    autoEdit: {
      enabled: ae.enabled !== false,
      maxClips: int(ae.maxClips, 1, 20, d.autoEdit.maxClips),
      maxSecondsPerClip: int(ae.maxSecondsPerClip, 1, 60, d.autoEdit.maxSecondsPerClip),
    },
    live: { enabled: raw?.live?.enabled === true },
    chests: {
      enabled: ch.enabled !== false,
      maxClaimants: int(ch.maxClaimants, 1, 5000, d.chests.maxClaimants),
      maxTotalTokens: int(ch.maxTotalTokens, 1, 1_000_000, d.chests.maxTotalTokens),
      expiresMinutes: int(ch.expiresMinutes, 1, 1440, d.chests.expiresMinutes),
      minPresenceSeconds: int(ch.minPresenceSeconds, 0, 3600, d.chests.minPresenceSeconds),
      minAccountAgeMinutes: int(ch.minAccountAgeMinutes, 0, 525600, d.chests.minAccountAgeMinutes),
      maxOpenPerSession: int(ch.maxOpenPerSession, 1, 20, d.chests.maxOpenPerSession),
    },
    conversion: {
      enabled: raw?.conversion?.enabled === true,
      creditsPer100Coins: int(raw?.conversion?.creditsPer100Coins, 1, 1000, d.conversion.creditsPer100Coins),
      minCoins: int(raw?.conversion?.minCoins, 1, 1_000_000, d.conversion.minCoins),
    },
    payouts: {
      enabled: raw?.payouts?.enabled === true,
      autoApprove: raw?.payouts?.autoApprove === true,
      autoApproveMaxEur: int(raw?.payouts?.autoApproveMaxEur, 10, 1000, d.payouts.autoApproveMaxEur),
      minAccountAgeDays: int(raw?.payouts?.minAccountAgeDays, 0, 365, d.payouts.minAccountAgeDays),
    },
    aiProposalsEnabled: raw?.aiProposalsEnabled === true,
  };
}

// Partage d'un cadeau en jetons ENTIERS : part créateur arrondie vers le bas, le reste va à la plateforme.
// Invariant : creator + platform === tokens, toujours (aucun jeton perdu ni créé).
export function splitGift(tokens: number, creatorSharePct: number) {
  const t = Math.floor(tokens);
  if (!(t >= 1)) throw new Error("Montant de cadeau invalide");
  const pct = Math.min(100, Math.max(0, creatorSharePct));
  const creator = Math.floor((t * pct) / 100 + 1e-9);
  return { tokens: t, creator, platform: t - creator, creatorPct: pct };
}

// Spend purchased coins first; only the remainder comes from creator-earned rewards.
export function planCoinSpend(purchasedBalance: number, earnedBalance: number, amount: number) {
  const purchased = Math.max(0, Math.floor(Number(purchasedBalance) || 0));
  const earned = Math.max(0, Math.floor(Number(earnedBalance) || 0));
  const cost = Math.floor(Number(amount));
  if (!(cost >= 1)) throw new Error("Montant de pièces invalide");
  if (purchased + earned < cost) throw new Error("Solde insuffisant");
  const fromPurchased = Math.min(purchased, cost);
  return { fromPurchased, fromEarned: cost - fromPurchased };
}

// ---------- Coffres LIVE (pièces Wesh Star, jamais crédits IA) ----------
// Règle unique et publique : chaque participant éligible reçoit la MÊME part brute entière, premiers arrivés premiers servis,
// jusqu'à maxClaimants personnes. Aucun hasard. Seul le montant réellement réservé (part x personnes) est débité ;
// les parts non réclamées sont rendues au déposant à la fermeture (clôture manuelle, fin du LIVE ou expiration).
export function planChest(totalTokens: number, maxClaimants: number, limits: { maxClaimants: number; maxTotalTokens: number }) {
  const total = Math.floor(Number(totalTokens));
  const n = Math.floor(Number(maxClaimants));
  if (!(n >= 1) || n > limits.maxClaimants) throw new Error("Nombre de participants invalide (1 à " + limits.maxClaimants + ")");
  if (!(total >= n * 2)) throw new Error("Il faut au moins 2 pièces par participant pour garantir une part créateur non nulle");
  if (total > limits.maxTotalTokens) throw new Error("Montant trop élevé (max " + limits.maxTotalTokens + " jetons)");
  const share = Math.floor(total / n);
  if (share < 2) throw new Error("Il faut au moins 2 pièces par participant");
  return { share, maxClaimants: n, reserved: share * n, unusedRemainder: total - share * n };
}

// Montant de pièces à rendre au déposant à la clôture : parts non réclamées uniquement.
export function chestRefund(maxClaimants: number, claimedCount: number, share: number) {
  return Math.max(0, maxClaimants - claimedCount) * share;
}

// ---------- Propositions de cadeaux par l'IA locale ----------
// La sortie du modèle n'est JAMAIS fiable : on extrait, nettoie, plafonne ; tout reste "pending" jusqu'à validation admin.
export type GiftProposalDraft = { name: string; emoji: string; tokens: number };
export function parseGiftProposals(text: string, max = 8): GiftProposalDraft[] {
  const m = String(text || "").match(/\[[\s\S]*\]/);
  if (!m) return [];
  let arr: any;
  try { arr = JSON.parse(m[0]); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: GiftProposalDraft[] = [];
  for (const x of arr) {
    const name = String(x?.name || "").replace(/[<>]/g, "").trim().slice(0, 40);
    const emoji = String(x?.emoji || "🎁").trim().slice(0, 8) || "🎁";
    const tokens = Math.floor(Number(x?.tokens));
    if (!name || !(tokens >= 1) || tokens > 500 || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, emoji, tokens });
    if (out.length >= max) break;
  }
  return out;
}

// Conversion des pièces gagnées en crédits vidéo IA : crédits entiers (arrondi vers le bas), 1 crédit = 10 secondes.
export function convertCoinsToCredits(coins: number, creditsPer100Coins: number) {
  const c = Math.floor(Number(coins));
  if (!(c >= 1)) throw new Error("Montant de pièces invalide");
  const credits = Math.floor((c * Math.max(0, Number(creditsPer100Coins))) / 100 + 1e-9);
  return { coins: c, credits, seconds: credits * 10 };
}
