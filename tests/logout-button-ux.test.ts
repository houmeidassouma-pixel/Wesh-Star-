import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("LogoutButton provides accessible label, focus visible styles, and async loading state", () => {
  const code = read("src/components/LogoutButton.tsx");

  // Accessibility: ARIA label & title for icon-only button
  assert.match(code, /aria-label="Se déconnecter"/);
  assert.match(code, /title="Se déconnecter"/);

  // UX & Async: disabled state and aria-busy when loading
  assert.match(code, /disabled=\{loading\}/);
  assert.match(code, /aria-busy=\{loading\}/);
  assert.match(code, /animate-spin/);

  // Keyboard navigation & accessibility focus indicator
  assert.match(code, /focus-visible:ring-2/);
  assert.match(code, /disabled:opacity-50/);
});
