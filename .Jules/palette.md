## 2025-05-18 - Accessibility for icon-only action buttons
**Learning:** Icon-only buttons like `LogoutButton` need explicit `aria-label` attributes and keyboard focus ring styles (`focus-visible:ring-2`) to ensure screen readers can announce them correctly and keyboard users can navigate to them clearly.
**Action:** Always provide `aria-label` and `focus-visible` styles on icon-only interactive controls.
