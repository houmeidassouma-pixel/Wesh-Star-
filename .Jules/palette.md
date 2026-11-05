# Palette's Journal - Critical UX Learnings

## 2025-05-18 - Accessible Session-Termination Controls in Compact Sidebar Cards
**Learning:** In compact user info cards (like the sidebar footer in `AppShell`), icon-only action buttons such as the logout button (`⏻`) lack accessible text, focus visible styling, and loading feedback. During async session invalidation, users clicking repeatedly cause redundant requests and experience a lag before navigation.
**Action:** When implementing compact or icon-only session controls, always ensure `aria-label`, `aria-busy`, explicit `type="button"`, `focus-visible:ring-2`, and a disabled loading spinner state are present to protect against multi-click and provide immediate feedback.
