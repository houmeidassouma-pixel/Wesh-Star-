# Palette's Journal - Critical Learnings

## 2026-11-04 - Accessible Switch Semantics and Icon Button Accessibility
**Learning:** Custom toggle buttons implemented with `<button>` need explicit `role="switch"` and `aria-checked` attributes plus `aria-describedby` when helper text is present so screen readers recognize them as binary toggles rather than generic buttons. In addition, standalone icon buttons (like logout) must specify an explicit `aria-label` along with keyboard `focus-visible` styling to ensure parity across screen readers and keyboard users.
**Action:** Always include `role="switch"`, `aria-checked`, and focus-visible rings on toggle components; ensure icon-only buttons supply an explicit localized or standard ARIA label.
