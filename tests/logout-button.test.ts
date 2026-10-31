import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("LogoutButton component includes aria-label, loading state and accessible focus visible styling", () => {
  const code = read("src/components/LogoutButton.tsx");
  assert.match(code, /aria-label=\{ariaLabel\}/);
  assert.match(code, /disabled=\{busy\}/);
  assert.match(code, /focus-visible:ring-2/);
  assert.match(code, /animate-spin/);
});

test("AppShell passes localized logout aria-label to LogoutButton", () => {
  const shell = read("src/components/AppShell.tsx");
  assert.match(shell, /<LogoutButton label="⏻" ariaLabel=\{t\?\.logout \|\| "Déconnexion"\} \/>/);
});
