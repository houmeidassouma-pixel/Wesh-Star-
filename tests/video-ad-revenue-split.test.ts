import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

test("video advertising revenue split defaults to 90% platform / 10% creators and is admin configurable", () => {
  const settings = readFileSync(join(root, "src/lib/settings.ts"), "utf8");
  const admin = readFileSync(join(root, "src/components/AdsManager.tsx"), "utf8");
  assert.match(settings, /ads: \{ enabled: false, creatorSharePercent: 10,/);
  assert.match(settings, /creatorSharePercent: Math\.max\(0, Math\.min\(100,/);
  assert.match(admin, /creatorSharePercent,network/);
  assert.match(admin, /\{100-creatorSharePercent\}%/);
  assert.match(admin, /Valeur initiale : 10 % pour les créateurs et 90 % pour Wesh Star IA/);
});
