## 2025-05-18 - Icon-Only Navigation Action Buttons

**Learning:** Icon-only action buttons embedded in navigation bars or user status cards (such as logout icons like `⏻`) lack accessible descriptions for screen readers if missing `aria-label`, and need clear `focus-visible` ring indicators for keyboard users.
**Action:** Always provide explicit `aria-label` attributes and keyboard focus ring styles (`focus-visible:ring-2`) on icon-only buttons across app shell components.
