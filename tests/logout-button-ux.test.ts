import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("LogoutButton provides accessible aria-label, loading spinner, and keyboard focus classes", () => {
  const content = fs.readFileSync("src/components/LogoutButton.tsx", "utf-8");

  // Accessible aria-label support
  assert.ok(content.includes('aria-label={ariaLabel}'), "LogoutButton should set aria-label attribute");
  assert.ok(content.includes('ariaLabel = "Se déconnecter"'), "LogoutButton should have default accessible ariaLabel");

  // Loading state
  assert.ok(content.includes("disabled={loading}"), "LogoutButton should be disabled when loading");
  assert.ok(content.includes("animate-spin"), "LogoutButton should show a spinner when loading");

  // Keyboard accessibility
  assert.ok(content.includes("focus-visible:ring-2"), "LogoutButton should have focus-visible ring");
  assert.ok(content.includes("focus-visible:ring-violet-500/60"), "LogoutButton should match design system focus ring");
});
