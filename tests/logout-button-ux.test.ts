import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("LogoutButton includes accessible aria-label, loading feedback, and focus styling", () => {
  const component = read("../src/components/LogoutButton.tsx");
  assert.match(component, /aria-label="Se déconnecter"/);
  assert.match(component, /title="Se déconnecter"/);
  assert.match(component, /focus-visible:ring-2/);
  assert.match(component, /disabled=\{loading\}/);
  assert.match(component, /animate-spin/);
});
