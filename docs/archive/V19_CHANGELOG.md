# Wesh Star IA V19 — Creator Rewards eligibility

- Added a creator-rewards eligibility dashboard inspired by public creator-program patterns: 10,000 followers, 100,000 qualified views in the last 30 days, age 18+ manually verified by an administrator, country allow-list, account good standing, and at least one public video with a requested duration of at least 61 seconds and 1,000 qualified views. Actual media duration and originality still require manual review.
- Added signed-in unique-view tracking per post, qualified after at least five seconds of playback; self-views do not count. Client playback telemetry is only an eligibility signal, not proof against all fraud.
- Added creator application submission, admin review/approval/rejection/suspension, and country/age verification controls. Admin approval rechecks eligibility thresholds.
- Originality, rights, fraud, payment details, and tax/KYC requirements still need manual review and appropriate policies before paying creators.
- These are Wesh Star IA rules inspired by creator reward programs, not a TikTok integration and not a guarantee that TikTok's current terms are identical.
- Configure `WESH_MONETIZATION_COUNTRIES` as a comma-separated allow-list of ISO country codes (for example `DE,FR`). Leave empty until the owner decides which countries are supported.
