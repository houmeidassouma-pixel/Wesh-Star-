# Palette's Journal

## Critical UX & Accessibility Learnings

## 2026-03-30 - Accessible Icon Buttons in App Navigation & Shells
**Learning:** Icon-only interactive controls (like the ⏻ sign-out button in user status cards) often lack `aria-label`, leaving screen reader users without context, and lack disabled/loading states during async auth operations which invites double-submissions.
**Action:** Always provide localized `aria-label`, visible focus indicator ring (`focus-visible:ring-2`), and async busy state with an accessible spinner or disabled state for icon-only action triggers.
