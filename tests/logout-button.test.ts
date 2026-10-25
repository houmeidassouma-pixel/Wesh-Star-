import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("LogoutButton includes aria-label, focus-visible ring and disabled state when logging out", () => {
  const content = read("src/components/LogoutButton.tsx");

  // Check ARIA attributes
  assert.match(content, /aria-label=/);
  assert.match(content, /aria-busy=/);

  // Check disabled & loading state
  assert.match(content, /disabled=\{isLoggingOut\}/);
  assert.match(content, /disabled:cursor-not-allowed/);

  // Check keyboard focus visible styles
  assert.match(content, /focus-visible:ring-2/);
});
