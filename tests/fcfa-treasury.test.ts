import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("la migration V29 ajoute l'origine des encaissements FCFA et l'unicité", () => {
  const sql = read("db/migrations/20261026_fcfa_sources_bank_beneficiaries.sql");
  assert.match(sql, /uq_treasury_source/);
  assert.match(sql, /add column if not exists provider_ref/);
  assert.match(sql, /'banque'/);
});

test("le webhook Flutterwave exige la signature et revérifie la transaction", () => {
  const src = read("src/app/api/payments/flutterwave/webhook/route.ts");
  assert.match(src, /verif-hash/);
  assert.match(src, /verifyFlutterwaveTransaction/);
  assert.match(src, /status: 401/);
});

test("pièces et abonnements en FCFA créditent la trésorerie via un point unique", () => {
  const lib = read("src/lib/payments/flutterwave.ts");
  assert.match(lib, /creditTreasury\(c, "coin_purchase"/);
  assert.match(lib, /creditTreasury\(c, "subscription"/);
  assert.match(lib, /AMOUNT_MISMATCH/);
  for (const f of ["verify", "webhook"]) assert.match(read(`src/app/api/payments/flutterwave/${f}/route.ts`), /settleFlutterwave/);
});

test("les bénéficiaires acceptent un compte bancaire et sont proposés dans l'admin", () => {
  assert.match(read("src/lib/treasury/index.ts"), /operator === "banque"/);
  assert.match(read("src/components/TreasuryPanel.tsx"), /IBAN/);
});

test("le jeton du worker accepte les deux noms de variable", () => {
  assert.match(read("src/lib/video-provider.ts"), /WESH_GPU_WORKER_TOKEN/);
});

test("LiveKit : seuls l'hôte et les invités acceptés peuvent émettre", () => {
  const src = read("src/app/api/live/token/route.ts");
  assert.match(src, /status='accepted'/);
  assert.doesNotMatch(src, /canPublish: true/);
});

test("docker compose n'exige plus LiveKit pour démarrer le site", () => {
  const yml = read("docker-compose.yml");
  assert.doesNotMatch(yml, /LIVEKIT_API_KEY:\?/);
  assert.match(yml, /profiles: \["live"\]/);
});

test("la part créateur/plateforme des cadeaux vient du réglage admin, sans 40 % codé en dur", () => {
  for (const f of ["src/app/api/gifts/send/route.ts", "src/app/api/stripe/webhook/route.ts", "src/lib/payments/flutterwave.ts"]) {
    assert.doesNotMatch(read(f), /\* 0\.40/, f);
  }
  assert.match(read("src/lib/creator-economy.ts"), /creatorSharePct: 60/);
});

test("trésorerie des pièces : retrait de réserve protégé et approbation automatique encadrée", () => {
  const admin = read("src/app/api/admin/creator-economy/route.ts");
  assert.match(admin, /reserveWithdrawal/);
  assert.match(admin, /RESERVE_WOULD_BE_UNDERFUNDED/);
  assert.match(admin, /"FORCER"/);
  assert.match(read("db/migrations/20261027_creator_reserve_withdrawal.sql"), /creator_reserve_withdrawal/);
  const payout = read("src/app/api/creator/payout/route.ts");
  assert.match(payout, /pol\.autoApprove/);
  assert.match(payout, /reserveOk/);
  assert.match(read("src/lib/creator-economy.ts"), /autoApprove: false/);
});

import { convertCoinsToCredits } from "../src/lib/creator-economy.ts";

test("conversion pièces gagnées -> crédits vidéo : arrondi vers le bas, 1 crédit = 10 secondes", () => {
  assert.deepEqual(convertCoinsToCredits(100, 80), { coins: 100, credits: 80, seconds: 800 });
  assert.deepEqual(convertCoinsToCredits(101, 80), { coins: 101, credits: 80, seconds: 800 });
  assert.equal(convertCoinsToCredits(1, 80).credits, 0);
  assert.throws(() => convertCoinsToCredits(0, 80));
});

test("conversion : désactivée par défaut, validée par l'admin, pièces rendues en cas de refus", () => {
  const eco = read("src/lib/creator-economy.ts");
  assert.match(eco, /conversion: \{ enabled: false/);
  assert.match(eco, /payouts: \{ enabled: false/);
  assert.match(read("src/app/api/creator/convert/route.ts"), /CONVERSION_DISABLED/);
  const admin = read("src/app/api/admin/creator-economy/route.ts");
  assert.match(admin, /decideConversion/);
  assert.match(admin, /conversion_refund/);
  assert.match(admin, /add_hour_credits/);
  assert.match(read("src/app/api/creator/payout/route.ts"), /PAYOUTS_DISABLED/);
});
