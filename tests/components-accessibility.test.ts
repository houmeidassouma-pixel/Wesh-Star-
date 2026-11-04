import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("BlueToggle declares switch role, aria-checked, description binding and focus-visible styling", () => {
  const code = read("src/components/BlueToggle.tsx");
  assert.match(code, /role="switch"/);
  assert.match(code, /aria-checked=\{checked\}/);
  assert.match(code, /aria-describedby=\{description \? descId : undefined\}/);
  assert.match(code, /focus-visible:ring-2/);
  assert.match(code, /focus-visible:ring-blue-500/);
});

test("LogoutButton provides accessible label and keyboard focus-visible styling", () => {
  const code = read("src/components/LogoutButton.tsx");
  assert.match(code, /aria-label="Déconnexion"/);
  assert.match(code, /focus-visible:ring-2/);
  assert.match(code, /focus-visible:ring-red-500/);
});
