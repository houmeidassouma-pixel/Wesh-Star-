import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("LogoutButton includes aria-label and focus-visible styling", () => {
  const filePath = path.join(process.cwd(), "src/components/LogoutButton.tsx");
  const code = fs.readFileSync(filePath, "utf8");

  assert.ok(
    code.includes('aria-label={ariaLabel}'),
    "LogoutButton must have an aria-label attribute"
  );
  assert.ok(
    code.includes("focus-visible:ring-2"),
    "LogoutButton must have focus-visible styling for keyboard accessibility"
  );
});
