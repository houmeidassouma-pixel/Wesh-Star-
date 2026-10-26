# Palette's UX & Accessibility Journal

## 2025-05-10 - Icon-Only Logout Buttons & Mobile Accessibility
**Learning:** Icon-only action buttons (like logout `⏻`) require explicit `aria-label` and `focus-visible` ring indicators for accessibility, plus interactive loading states on async auth operations to prevent double-submissions and clarify pending system state.
**Action:** Always provide explicit `aria-label`, `disabled`, and visual spinner feedback on async icon action buttons.
