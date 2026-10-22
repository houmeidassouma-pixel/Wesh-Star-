# Wesh Star IA — V7 competitor upgrades

Base: Wesh-Star-IA-V6-WALLETS-FCFA(3).zip (13 October 2026)

## Added in this package
- Admin switch to automatically publish completed Autopilot videos to the Wesh Star IA community feed.
- Moderator opt-in for automatic Wesh Star IA community publishing.
- Admin and moderator opt-in to cross-post the same Autopilot video to all enabled, connected social accounts that accept the configured video duration.
- Independent destination logic: Wesh Star community publishing is separate from external social publishing.
- Idempotent community upsert using the existing `(user_id, generation_id)` uniqueness rule.
- Migration-safe PostgreSQL columns and platform-readiness / deployment documentation.

## Defaults and safety
- Both new automation choices default OFF.
- Community auto-publishing requires the administrator's community feature flag to be ON as well.
- Cross-posting filters connected/enabled platforms by configured maximum duration. It does not auto-crop or reframe for each network.
- Social platform posting still depends on real OAuth/API credentials, account permissions, platform app approval, network limits and remote success responses.

## Validation
- Changed TypeScript/TSX files passed TypeScript transpilation syntax checks.
- Full Next.js build was not run because dependencies could not be installed within the available environment. Run `npm install` and `npm run build` in the deployment environment before publishing.
- Apply `db/migrations/20261013_autopilot_crosspost_community.sql` before using the new job fields.
