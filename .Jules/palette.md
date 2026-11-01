# Palette's Journal

## 2025-05-18 - Accessible icon-only authentication controls
**Learning:** Icon-only user action controls (such as the sidebar `⏻` logout button) lack discernable text for screen readers and visual focus indicators for keyboard navigation. Adding `aria-label`, localized tooltips, focus rings, and an async loading state prevents duplicate triggers and gives immediate feedback during authentication state transitions.
**Action:** When working on navigation shells or profile bars with icon-only action triggers, always ensure `aria-label`, keyboard `focus-visible` styles, disabled state handling, and interactive loading indicators are present.
