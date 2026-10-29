import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Data Saver is exposed in settings and slows generation polling", () => {
  const settings = read("../src/app/(app)/settings/page.tsx");
  const component = read("../src/components/DataSaverSettings.tsx");
  const jobs = read("../src/components/useJobs.ts");
  assert.match(settings, /DataSaverSettings/);
  assert.match(component, /wesh-data-saver/);
  assert.match(jobs, /visibilityState !== "visible"/);
  assert.match(jobs, /saver \? 25000/);
});

test("completed generations expose a model share link and TikTok upload handoff", () => {
  const studio = read("../src/components/GenerateStudio.tsx");
  const landing = read("../src/app/(marketing)/use-model/page.tsx");
  assert.match(studio, /Partager le modèle/);
  assert.match(studio, /www\.tiktok\.com\/upload/);
  assert.match(landing, /Utiliser ce modèle avec Wesh Star IA/);
  assert.match(landing, /\/generate\?template=/);
});

test("login return destination rejects external redirect URLs", () => {
  const login = read("../src/components/LoginForm.tsx");
  assert.match(login, /requested\.startsWith\("\/"\) && !requested\.startsWith\("\/\/"\)/);
});

test("BlueToggle has proper accessibility switch role, aria-checked, and focus-visible attributes", () => {
  const toggle = read("../src/components/BlueToggle.tsx");
  assert.match(toggle, /role="switch"/);
  assert.match(toggle, /aria-checked=\{checked\}/);
  assert.match(toggle, /focus-visible:ring-2/);
});
