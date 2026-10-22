# Wesh Star IA — ADS SIDEBAR + VERSION VERIFICATION

## Added in this revision
- Non-intrusive ad rail for authenticated app pages.
- Desktop: ad column on the right; the main workspace remains usable.
- Mobile/tablet: ad block moves below the main content instead of blocking it.
- AdSense/custom network ads are preferred when configured; existing first-party campaigns remain the fallback.
- When the admin enables ads, the default settings now allow ads for free users, paid users and public visitors. The master switch remains OFF by default until the admin activates and configures a network/campaign.
- No pop-up, forced redirect or full-screen interstitial was added.

## Existing functions verified
- Monthly recurring Stripe subscriptions remain present.
- Generation credits are separate from gift coins: 1 AI token = 10 seconds. Gift coins are used only for gifts, LIVE and chests.
- Lifetime free trial remains 2 generations of 10 seconds.
- Self-hosted GPU worker/video path remains present.
- Local Ollama/FFmpeg/storage architecture remains present.
- Moderator + admin areas remain present.
- Social autopilot remains present for the configured platforms.
- Public video/community/feed/gallery feature was not found in app routes and was not reintroduced.
- The previously removed sport feature was searched for in executable/source text; no standalone sport feature was found. Remaining matches were only incidental substrings/document wording, not a sport module.
- No Puppeteer or Playwright dependency was found.
- No Gemini dependency was found.
- No user-facing ChatGPT/Gemini/Claude model selector was found.

## Important runtime note
This archive is code-verified, not a guarantee that a production GPU, Stripe account, AdSense account, domain, OAuth credentials or server environment are already configured. Those real-world credentials/configuration still have to be supplied at deployment.
