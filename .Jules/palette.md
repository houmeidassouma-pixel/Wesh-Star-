## 2025-05-15 - Accessible Icon-Only Actions
**Learning:** Icon-only utility buttons like `LogoutButton` in user cards often omit localized ARIA labels, visual loading states, and keyboard focus rings.
**Action:** Always provide explicit `aria-label`, visible keyboard focus states (`focus-visible:ring-2`), and disable buttons during asynchronous operations.
