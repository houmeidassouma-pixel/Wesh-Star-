## 2025-05-18 - Accessible Icon Buttons and Async Feedback
**Learning:** Icon-only interactive controls (like sign-out or icon buttons in navigation/cards) lack screen reader descriptions and focus-visible indicators if not explicitly annotated with `aria-label` and `focus-visible:ring`. Additionally, async actions without loading states allow rapid repeated clicks.
**Action:** Always provide `aria-label`, `aria-busy`, keyboard `focus-visible` styles, and disabled loading states for icon-only interactive components.
