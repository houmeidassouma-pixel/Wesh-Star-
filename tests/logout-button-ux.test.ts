import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("LogoutButton provides aria-label, focus-visible indicators, and loading feedback", () => {
  const code = read("src/components/LogoutButton.tsx");

  // Accessibility: Must include aria-label
  assert.match(code, /aria-label=/);

  // Keyboard accessibility: Must include focus-visible focus ring styles
  assert.match(code, /focus-visible:ring-2/);

  // Feedback & interaction: Must handle disabled and loading states
  assert.match(code, /disabled=/);
  assert.match(code, /animate-spin/);
});
