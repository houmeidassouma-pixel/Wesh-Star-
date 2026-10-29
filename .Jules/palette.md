## 2025-05-18 - Custom Toggle Switches Require ARIA Roles & Checked States
**Learning:** Custom button-based toggle switches do not automatically convey their state or purpose to screen reader users without proper ARIA attributes.
**Action:** Always add `role="switch"` and `aria-checked={checked}` to custom toggle switch components, along with focus-visible ring styles for keyboard navigation.
