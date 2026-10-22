import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("coin wallet keeps purchased coins, creator earnings and platform share in separate ledger accounts", () => {
  const sql = read("db/migrations/20261015_coin_wallet_creator_economy.sql");
  assert.match(sql, /wallet_type text not null check \(wallet_type in \('coins','earnings','platform'\)\)/);
  assert.match(sql, /entry_key text not null unique/);
  const route = read("src/app/api/gifts/send/route.ts");
  assert.match(route, /planCoinSpend/);
  assert.match(route, /'gift_received'/);
  assert.match(route, /'platform_gift_share'/);
  assert.doesNotMatch(route, /hour_credits_seconds\s*=\s*hour_credits_seconds\s*-/);
});

test("coin purchases require a Stripe webhook before crediting the wallet", () => {
  const checkout = read("src/app/api/coins/checkout/route.ts");
  const webhook = read("src/app/api/stripe/webhook/route.ts");
  assert.match(checkout, /metadata\[coin_purchase_id\]/);
  assert.match(webhook, /coin_purchase_id/);
  assert.match(webhook, /verifyStripeSignature/);
  assert.match(webhook, /on conflict \(entry_key\) do nothing/);
});

test("creator withdrawals reserve earned coins and require admin payment reference", () => {
  const payout = read("src/app/api/creator/payout/route.ts");
  const admin = read("src/app/api/admin/creator-economy/route.ts");
  assert.match(payout, /wallet_type='earnings'/);
  assert.match(payout, /payout_reserve/);
  assert.match(admin, /PAYOUT_REFERENCE_REQUIRED/);
  assert.match(admin, /payout_refund/);
});

test("generation studio offers 10-second increments up to 10 minutes for users, subject to server quota", () => {
  const studio = read("src/components/GenerateStudio.tsx");
  const page = read("src/app/(app)/generate/page.tsx");
  const api = read("src/app/api/ai/script/route.ts");
  const generate = read("src/app/api/generate/route.ts");
  assert.match(studio, /10 \* 60/);
  assert.match(studio, /const ALL_OPTIONS = \[10, 20, 30, 40, 50/);
  assert.match(page, /10 \* 60/);
  assert.match(api, /600/);
  assert.match(generate, /Math.min\(L.maxSeconds, 10 \* 60\)/);
});


test("LIVE chests use gift coins and never generation credits; claim splits creator/platform share", () => {
  const create = read("src/app/api/live/chest/create/route.ts");
  const claim = read("src/app/api/live/chest/claim/route.ts");
  const settle = read("src/lib/live-db.ts");
  assert.match(create, /planCoinSpend/);
  assert.match(create, /chest_deposit/);
  assert.doesNotMatch(create, /hour_credits_seconds/);
  assert.match(claim, /splitGift/);
  assert.match(claim, /chest_platform_share/);
  assert.doesNotMatch(claim, /hour_credits_seconds/);
  assert.match(settle, /chest_refund/);
  assert.doesNotMatch(settle, /hour_credits_seconds/);
});

test("AI credit unit is 10 seconds and payment documentation distinguishes Google Pay from Play Billing", () => {
  const economy = read("src/lib/creator-economy.ts");
  const docs = read("PAYMENTS_GOOGLE_PLAY_GOOGLE_PAY_AND_AI_PRICING.md");
  assert.match(economy, /TOKEN_SECONDS = 10/);
  assert.match(docs, /Google Pay/);
  assert.match(docs, /Google Play Billing/);
  assert.match(docs, /pas encore intégrées au parcours d'achat de pièces/i);
});


test("AI gift proposals are pending until admin approval publishes a shared gift", () => {
  const admin = read("src/app/api/admin/creator-economy/route.ts");
  const panel = read("src/components/CreatorEconomyPanel.tsx");
  assert.match(admin, /body.action === "decideProposal"/);
  assert.match(admin, /status='pending'/);
  assert.match(admin, /gifts: \[\.\.\.current\.gifts/);
  assert.match(panel, /Approuver/);
  assert.match(panel, /Catalogue de cadeaux/);
});


test("creator payout enforces the provisional minimum of 1,000 earned coins", () => {
  const payout = read("src/app/api/creator/payout/route.ts");
  const panel = read("src/components/CoinWalletPanel.tsx");
  assert.match(payout, /coins < minCoins/);
  assert.match(payout, /MIN_PAYOUT_NOT_REACHED/);
  assert.match(payout, /WESH_CREATOR_PAYOUT_MIN_EUR/);
  assert.match(panel, /min=\{Number\(data\.minPayoutCoins \|\| 1000\)\}/);
});

test("admin enters quota minutes while user-facing generation balances are credits", () => {
  const panel = read("src/components/QuotaManagementPanel.tsx");
  const api = read("src/app/api/admin/quota/route.ts");
  const pricing = read("src/components/PricingCards.tsx");
  assert.match(panel, /Durée à ajouter \/ définir \(minutes\)/);
  assert.match(api, /const seconds = minutes \* 60/);
  assert.match(pricing, /crédits vidéo inclus/);
  assert.doesNotMatch(panel, /Ajouter des jetons/);
});

test("LIVE offers solo and a host-approved guest stage capped at nine", () => {
  const migration = read("db/migrations/20261019_live_guest_stage.sql");
  const start = read("src/app/api/live/start/route.ts");
  const request = read("src/app/api/live/guest-request/route.ts");
  const decision = read("src/app/api/live/guest-decision/route.ts");
  assert.match(migration, /guest_limit BETWEEN 0 AND 9/);
  assert.match(start, /Math.min\(9/);
  assert.match(request, /status='pending'/);
  assert.match(decision, /s.host_id !== access.user/);
});


test("background gift proposals queue local GPU images and remain pending for admin review", () => {
  const generator = read("src/lib/gift-proposals.ts");
  const route = read("src/app/api/worker/gift-proposals/route.ts");
  assert.match(generator, /v1\/assets\/generate/);
  assert.match(generator, /image_url/);
  assert.match(generator, /pending/);
  assert.match(route, /CRON_SECRET|isCronAuthorized/);
});

test("one-off video packs use 80 credits per euro and start at seven minutes", () => {
  const settings = read("src/lib/settings.ts");
  const admin = read("src/components/HourTiersForm.tsx");
  assert.match(settings, /Math.max\(7/);
  assert.match(settings, /\* 6 \/ 80/);
  assert.match(admin, /Prix € \(modifiable\)/);
  assert.match(admin, /value=\{r.price\} onChange/);
  assert.match(admin, /min=\{7\}/);
});


test("new subscriptions default to one-time manual payment with optional monthly recurring Stripe", () => {
  const checkout = read("src/app/api/stripe/checkout/route.ts");
  const webhook = read("src/app/api/stripe/webhook/route.ts");
  const migration = read("db/migrations/20261020_manual_renewal_and_platform_treasury.sql");
  assert.match(checkout, /params.set\("mode", "payment"\)/);
  assert.match(checkout, /body.autoRenew === true/);
  assert.match(checkout, /params.set\("mode", "subscription"\)/);
  assert.match(checkout, /recurring\]\[interval/);
  assert.match(checkout, /period === "year"/);
  assert.match(webhook, /manual_subscription_reference/);
  assert.match(migration, /manual_subscription_payments/);
});

test("coin purchases record the platform cash share (admin setting, default 40%) and the creator reserve in euro cents", () => {
  const webhook = read("src/app/api/stripe/webhook/route.ts");
  const migration = read("db/migrations/20261020_manual_renewal_and_platform_treasury.sql");
  assert.match(webhook, /Math\.floor\(grossCents \* \(100 - \(await getEconomy\(\)\)\.creatorSharePct\) \/ 100\)/);
  assert.match(webhook, /coin_purchase_creator_reserve/);
  assert.match(migration, /amount_cents bigint/);
});


test("LIVE host can assign per-session moderators who can approve guests and block users", () => {
  const migration = read("db/migrations/20261020_manual_renewal_and_platform_treasury.sql");
  const route = read("src/app/api/live/moderator/route.ts");
  const decision = read("src/app/api/live/guest-decision/route.ts");
  const join = read("src/app/api/live/join/route.ts");
  assert.match(migration, /live_session_moderators/);
  assert.match(migration, /live_session_blocks/);
  assert.match(route, /"add","remove","block","unblock"/);
  assert.match(decision, /live_session_moderators/);
  assert.match(join, /live_session_blocks/);
});


test("Stripe recurring billing is opt-in and manual renewal remains the default", () => {
  const checkout = read("src/app/api/stripe/checkout/route.ts");
  const pricing = read("src/components/PricingCards.tsx");
  assert.match(checkout, /body.autoRenew === true/);
  assert.match(checkout, /subscription_data\[metadata\]\[user_id\]/);
  assert.match(checkout, /recurring\]\[interval\]/);
  assert.match(pricing, /checked=\{autoRenew/);
  assert.match(pricing, /Désactivée par défaut/);
});

test("Moderator appointment resolves an existing username, not an email address", () => {
  const live = read("src/app/api/live/moderator/route.ts");
  const admin = read("src/app/api/admin/moderators/route.ts");
  const liveUi = read("src/components/LiveRoom.tsx");
  assert.match(live, /lower\(username\)=lower\(\$1\)/);
  assert.match(admin, /ilike\("username", normalizedUsername\)/);
  assert.match(liveUi, /Nom d’utilisateur/);
  assert.doesNotMatch(live, /body\.email/);
});

test("creator monetization requires 10,000 followers and an allowed country", () => {
  const route = read("src/app/api/creator/monetization/route.ts");
  assert.match(route, /FOLLOWER_THRESHOLD = 10_000/);
  assert.match(route, /WESH_MONETIZATION_COUNTRIES/);
  assert.match(route, /followerThresholdMet && countryApproved/);
});

test("creator rewards checks 10,000 followers, 100,000 qualified views in 30 days, age, country and account standing", () => {
  const route = read("src/app/api/creator/monetization/route.ts");
  const migration = read("db/migrations/20261022_creator_rewards_eligibility.sql");
  const viewRoute = read("src/app/api/community/view/route.ts");
  assert.match(route, /FOLLOWER_THRESHOLD = 10_000/);
  assert.match(route, /VIEW_THRESHOLD = 100_000/);
  assert.match(route, /now\(\)-interval '30 days'/);
  assert.match(route, /MIN_VIDEO_SECONDS = 61/);
  assert.match(route, /creator_age_verified/);
  assert.match(route, /WESH_MONETIZATION_COUNTRIES/);
  assert.match(route, /followerThresholdMet && countryApproved/);
  assert.match(migration, /unique\(post_id, viewer_id\)/);
  assert.match(viewRoute, /watchedSeconds/);
  assert.match(viewRoute, /\$4 >= 5/);
});


test("generation errors explain exhausted trial and insufficient video credits", () => {
  const studio = read("src/components/GenerateStudio.tsx");
  assert.match(studio, /INSUFFICIENT_HOUR_CREDITS/);
  assert.match(studio, /FREE_TRIAL_EXHAUSTED/);
  assert.match(studio, /ACCOUNT_BLOCKED/);
});

test("monthly subscription quota remains separate from the 10-minute per-video ceiling", () => {
  const settings = read("src/lib/settings.ts");
  const access = read("src/lib/access.ts");
  assert.match(settings, /id: "pro_15m"[^\n]*dailyMinutes: 15/);
  assert.match(settings, /id: "pro_30m"[^\n]*dailyMinutes: 30/);
  assert.match(access, /maxSeconds: Math\.min\(10 \* 60, dynamicTier\.minutes \* 60\)/);
  assert.match(access, /dailySeconds: Math\.min\(dynamicTier\.minutes, dynamicTier\.dailyMinutes\) \* 60/);
  const gpu = read("gpu-worker/server.py");
  assert.match(gpu, /duration_seconds: int = Field\(default=5, ge=3, le=10\)/);
  assert.match(read("src/app/api/worker/process/route.ts"), /concatClips\(buffers\)/);
});
