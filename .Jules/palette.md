## 2026-11-01 - Icon-Only Navigation Buttons and Focus Indicators
**Learning:** Icon-only navigation and session buttons (like the logout power symbol `⏻` in sidebar/header cards) are completely unannounced to screen readers without an explicit `aria-label`, and custom-styled buttons lacking `focus-visible` styling become invisible during keyboard tab navigation.
**Action:** Always provide explicit localized `aria-label`s, `focus-visible:ring-2` focus states, and async loading/disabled indicators to prevent double execution on icon-only session controls.
