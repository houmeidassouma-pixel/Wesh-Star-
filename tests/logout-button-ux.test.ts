import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("LogoutButton provides accessible attributes, focus rings, and loading state", () => {
  const content = fs.readFileSync("src/components/LogoutButton.tsx", "utf8");

  // A11y & Semantics
  assert.match(content, /type="button"/, "Explicit button type prevents form submission side effects");
  assert.match(content, /aria-label="Déconnexion"/, "ARIA label explains action for screen readers");
  assert.match(content, /aria-busy=\{isLoggingOut\}/, "Indicates busy/loading state to assistive tech");
  assert.match(content, /focus-visible:ring-2/, "Clear focus indicator for keyboard navigation");

  // Interaction safety & feedback
  assert.match(content, /disabled=\{isLoggingOut\}/, "Prevents multiple clicks while logout is processing");
  assert.match(content, /animate-spin/, "Visual spinner provides instant feedback during sign out");
});
