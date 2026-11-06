# Palette's Journal

## 2025-11-06 - Accessible Icon Buttons & Signout State
**Learning:** Icon-only control buttons (like LogoutButton in user account drawers) need an explicit `aria-label`, visible keyboard focus rings (`focus-visible:ring-2 focus-visible:ring-violet-500/60`), and loading feedback (`disabled`, `aria-busy`) during async auth operations to prevent accidental multiple submissions and improve screen-reader accessibility.
**Action:** When working on navigation or header icon buttons, ensure `aria-label`, `aria-busy`, and `focus-visible` styling are included by default.
