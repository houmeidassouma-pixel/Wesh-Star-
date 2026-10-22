import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("default site brand is Wesh Star IA and remains admin-editable", () => {
  assert.match(read("src/lib/settings.ts"), /name: "Wesh Star IA"/);
  assert.match(read("src/components/SettingsForm.tsx"), /const \[name, setName\] = useState\(site\.name \|\| "Wesh Star IA"\)/);
  assert.match(read("src/components/SettingsForm.tsx"), /name, tagline, accentColor/);
});

test("admin can configure feed ad frequency and maximum ads per visit", () => {
  const admin = read("src/components/AdsManager.tsx");
  const feed = read("src/components/CommunityFeed.tsx");
  assert.match(admin, /feedAdEveryPosts:feedEvery/);
  assert.match(admin, /maxFeedAdsPerVisit:maxFeedAds/);
  assert.match(feed, /i % feedAdEvery === 0/);
  assert.match(feed, /i \/ feedAdEvery <= feedAdLimit/);
});

test("daily ad cap zero disables internal ad serving", () => {
  assert.match(read("src/app/api/ads/serve/route.ts"), /!ads\.enabled \|\| Number\(ads\.frequencyCapPerDay\) <= 0/);
});

test("site promotion pricing is still configurable in admin settings", () => {
  assert.match(read("src/components/SettingsForm.tsx"), /promotionPricing: \{ pricePer1000Views, minViews: minPromoViews, maxViews: maxPromoViews \}/);
});
