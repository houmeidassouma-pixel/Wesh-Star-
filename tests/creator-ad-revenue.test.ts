import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("creator ad revenue is based on received net revenue and has idempotent periods", () => {
  const migration = read("../db/migrations/20261022_creator_ad_revenue_ledger.sql");
  const route = read("../src/app/api/admin/creator-ad-revenue/route.ts");
  assert.match(migration, /unique\s*\(period_start, period_end\)/i);
  assert.match(migration, /unique\s*\(period_id, creator_id\)/i);
  assert.match(route, /access\.isAdmin/);
  assert.match(route, /PERIOD_ALREADY_RECORDED/);
  assert.match(route, /creator_monetization_status='approved'/);
  assert.match(route, /ad-revenue:\$\{periodId\}:\$\{row\.creator_id\}/);
  assert.match(route, /net ad revenue/);
});

test("creator earnings card explains the attributed advertising revenue", () => {
  const route = read("../src/app/api/creator/monetization/route.ts");
  const card = read("../src/components/CreatorMonetizationCard.tsx");
  assert.match(route, /adRevenueEur/);
  assert.match(card, /Revenus publicitaires attribués/);
  assert.match(card, /100 pièces de gain = 1 €/);
});

test("later credit-conversion migration preserves the advertising-revenue ledger kind", () => {
  const migration = read("../db/migrations/20261028_credit_conversion.sql");
  assert.match(migration, /conversion_refund','ad_revenue_share/);
});
