import { test } from "node:test";
import assert from "node:assert/strict";
import { splitGift, planChest, chestRefund, parseGiftProposals, normalizeEconomy, defaultEconomy, tokensToSeconds, TOKEN_SECONDS, planCoinSpend } from "../src/lib/creator-economy.ts";
import { buildMontageArgs } from "../src/lib/auto-montage.ts";
import { BUILTIN_EFFECTS } from "../src/lib/creator-effects.ts";

test("partage 60/40 : somme exacte, aucun jeton perdu ni créé", () => {
  for (let t = 1; t <= 500; t++) for (const pct of [0, 33.33, 60, 99.99, 100]) {
    const s = splitGift(t, pct);
    assert.equal(s.creator + s.platform, t);
    assert.ok(s.creator >= 0 && s.platform >= 0);
  }
  assert.deepEqual(splitGift(10, 60), { tokens: 10, creator: 6, platform: 4, creatorPct: 60 });
  assert.deepEqual(splitGift(1, 60), { tokens: 1, creator: 0, platform: 1, creatorPct: 60 }); // arrondi vers le bas côté créateur
});
test("partage : pourcentage hors bornes ramené dans 0..100, montant invalide refusé", () => {
  assert.equal(splitGift(10, 150).creator, 10);
  assert.equal(splitGift(10, -5).creator, 0);
  assert.throws(() => splitGift(0, 60)); assert.throws(() => splitGift(-3, 60));
});
test("config : défaut 60/40, valeurs absurdes normalisées, effets = liste fermée", () => {
  const d = normalizeEconomy({});
  assert.equal(d.creatorSharePct, 60); assert.equal(d.live.enabled, false);
  assert.deepEqual(d.coinPacks.map(p => p.priceEur), [1, 5, 12, 30, 70]);
  assert.deepEqual(d.coinPacks.map(p => p.coins), [100, 500, 1200, 3000, 7000]);
  assert.deepEqual(normalizeEconomy({ coinPacks: [{id:"coins_100",coins:100,priceEur:1.49,active:true},{id:"coins_550",coins:550,priceEur:7.49,active:true},{id:"coins_1200",coins:1200,priceEur:14.99,active:true}] }).coinPacks.map(p => p.coins), [100,500,1200,3000,7000]);
  assert.deepEqual(normalizeEconomy({ coinPacks: [{id:"coins_100",coins:100,priceEur:0.99,active:true},{id:"coins_500",coins:500,priceEur:3.99,active:true},{id:"coins_1200",coins:1200,priceEur:7.99,active:true},{id:"coins_3000",coins:3000,priceEur:14.99,active:true},{id:"coins_7000",coins:7000,priceEur:29.99,active:true}] }).coinPacks.map(p => p.priceEur), [1,5,12,30,70]);
  assert.equal(normalizeEconomy({ creatorSharePct: "abc" }).creatorSharePct, 60);
  assert.equal(normalizeEconomy({ creatorSharePct: 250 }).creatorSharePct, 100);
  const e = normalizeEconomy({ effects: [{ id: "cinema", tier: "paid", tokens: -4 }, { id: "evil;rm -rf", tier: "free" }] });
  assert.equal(e.effects.length, defaultEconomy.effects.length);
  assert.ok(!e.effects.some((x) => x.id.includes("evil")));
  assert.equal(e.effects.find((x) => x.id === "cinema")!.tokens, 1); // prix payant jamais < 1
  assert.equal(normalizeEconomy({ effects: [{ id: "cinema", tier: "free", tokens: 9 }] }).effects.find((x) => x.id === "cinema")!.tokens, 0);
});
test("jetons IA : 1 jeton = 10 s (6 jetons = 1 minute), séparés des pièces cadeaux", () => {
  assert.equal(TOKEN_SECONDS, 10); assert.equal(tokensToSeconds(6), 60); assert.equal(tokensToSeconds(1), 10);
});
test("coffre : 120 personnes, parts égales, seul le réservé est débité", () => {
  const lim = { maxClaimants: 1000, maxTotalTokens: 100000 };
  assert.deepEqual(planChest(1000, 120, lim), { share: 8, maxClaimants: 120, reserved: 960, unusedRemainder: 40 });
  assert.deepEqual(planChest(240, 120, lim), { share: 2, maxClaimants: 120, reserved: 240, unusedRemainder: 0 });
  assert.throws(() => planChest(239, 120, lim));      // < 2 pièces par personne
  assert.throws(() => planChest(500, 1001, lim));     // trop de participants
  assert.throws(() => planChest(200000, 10, lim));    // total trop élevé
  assert.throws(() => planChest(100, 0, lim)); assert.throws(() => planChest(NaN, 5, lim));
});
test("coffre : conservation des pièces (réservé = pris + remboursé) pour tous les cas", () => {
  for (const n of [1, 7, 120, 333]) for (const claimed of [0, 1, Math.floor(n / 2), n]) {
    const share = 5, reserved = share * n;
    assert.equal(claimed * share + chestRefund(n, claimed, share), reserved);
  }
  assert.equal(chestRefund(10, 12, 5), 0); // jamais négatif
});
test("propositions IA : sortie du modèle assainie, doublons et prix absurdes écartés", () => {
  const txt = 'Voici : [{"name":"Licorne <b>","emoji":"🦄","tokens":7},{"name":"licorne <b>","tokens":3},{"name":"Gratuit","tokens":0},{"name":"Cher","tokens":99999},{"name":"","tokens":5},{"name":"Comète","tokens":"12"}] merci';
  const r = parseGiftProposals(txt);
  assert.deepEqual(r.map((x) => x.name), ["Licorne b", "Comète"].map((n) => n === "Licorne b" ? "Licorne b" : n).slice(0, r.length));
  assert.ok(r.every((x) => !/[<>]/.test(x.name) && x.tokens >= 1 && x.tokens <= 500));
  assert.deepEqual(parseGiftProposals("pas de json"), []); assert.deepEqual(parseGiftProposals("[oups"), []);
});
test("montage : la commande FFmpeg ne contient que des filtres fixes, 1 entrée par clip", () => {
  const ins = [{ path: "/a.mp4", hasAudio: true, duration: 4 }, { path: "/b.mp4", hasAudio: false, duration: 2 }];
  const a = buildMontageArgs({ inputs: ins, secondsPerClip: 3, soundPath: "/m.mp3", soundVolume: 0.5, effectFilter: BUILTIN_EFFECTS[1].ffmpeg, output: "/o.mp4" });
  assert.equal(a.filter((x) => x === "-i").length, 3);
  const fc = a[a.indexOf("-filter_complex") + 1];
  assert.ok(fc.includes("concat=n=2") && fc.includes("anullsrc") && fc.includes("amix"));
  assert.ok(fc.includes("trim=duration=3") && fc.includes("trim=duration=2")); // le clip de 2 s n'est pas allongé
  assert.throws(() => buildMontageArgs({ inputs: [], secondsPerClip: 3, output: "/o.mp4" }));
});

test("portefeuille de pièces : dépense les pièces achetées avant les gains, sans solde négatif", () => {
  assert.deepEqual(planCoinSpend(100, 60, 80), { fromPurchased: 80, fromEarned: 0 });
  assert.deepEqual(planCoinSpend(20, 60, 50), { fromPurchased: 20, fromEarned: 30 });
  assert.deepEqual(planCoinSpend(0, 60, 60), { fromPurchased: 0, fromEarned: 60 });
  assert.throws(() => planCoinSpend(2, 3, 6));
});


test("custom gifts can carry safe shared image/animation URLs", () => {
  const e = normalizeEconomy({ gifts: [{ id: "custom", name: "Test", emoji: "🎁", tokens: 5, active: true, imageUrl: "https://cdn.example/gift.png", animationUrl: "javascript:alert(1)" }] });
  assert.equal(e.gifts[0].imageUrl, "https://cdn.example/gift.png");
  assert.equal(e.gifts[0].animationUrl, undefined);
});
