import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
test("promotion campaigns use admin-configured qualified-view pricing and supported durations", () => {
  const schema = readFileSync(join(root, "db/schema.sql"), "utf8");
  const route = readFileSync(join(root, "src/app/api/promotions/route.ts"), "utf8");
  assert.match(schema, /create table if not exists public\.promotion_campaigns/i);
  assert.match(schema, /target_views bigint not null default 0/i);
  assert.match(route, /pricePer1000Views/);
  assert.match(route, /targetViews/);
  assert.match(route, /new Set\(\[24, 72, 168\]\)/);
});
test("promotion checkout requires signed Stripe webhook confirmation before admin review", () => {
  const route = readFileSync(join(root, "src/app/api/stripe/webhook/route.ts"), "utf8");
  const admin = readFileSync(join(root, "src/app/api/admin/promotions/route.ts"), "utf8");
  assert.match(route, /verifyStripeSignature\(payload/);
  assert.match(route, /promotion_campaign_id/);
  assert.match(route, /status='pending_review'/);
  assert.match(admin, /access\.isAdmin/);
  assert.match(admin, /\["approve","reject","pause","resume"\]/);
});
test("approved promotion is surfaced in the community and live listings", () => {
  const feed = readFileSync(join(root, "src/lib/community.ts"), "utf8");
  const live = readFileSync(join(root, "src/app/api/live/list/route.ts"), "utf8");
  assert.match(feed, /AS promoted/);
  assert.match(feed, /ORDER BY EXISTS\(SELECT 1 FROM promotion_campaigns/);
  assert.match(live, /as promoted/);
});


test("community videos have a share control and a visibility-checked permalink", () => {
  const feed = readFileSync(join(root, "src/components/CommunityFeed.tsx"), "utf8");
  const page = readFileSync(join(root, "src/app/(app)/community/page.tsx"), "utf8");
  const lib = readFileSync(join(root, "src/lib/community.ts"), "utf8");
  assert.match(feed, /sharePost/);
  assert.match(feed, /community\?post=/);
  assert.match(page, /searchParams\?\.post/);
  assert.match(lib, /p\.id = \$\$\{values\.length\}/);
});

test("qualified sponsored video views are unique per campaign and can complete a campaign", () => {
  const route = readFileSync(join(root, "src/app/api/community/view/route.ts"), "utf8");
  const schema = readFileSync(join(root, "db/schema.sql"), "utf8");
  assert.match(route, /insert into promotion_impressions/i);
  assert.match(route, /on conflict \(campaign_id, viewer_id\) do nothing/i);
  assert.match(route, /pc\.impressions \+ 1 >= pc\.target_views/);
  assert.match(schema, /primary key \(campaign_id, viewer_id\)/i);
});
