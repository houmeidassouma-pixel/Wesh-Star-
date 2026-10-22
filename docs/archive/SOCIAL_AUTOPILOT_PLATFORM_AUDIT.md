# Social Autopilot — implementation and launch-readiness audit

## What the new switches do
- **Auto-publish to Wesh Star IA** is independent from external social posting. If both the admin community feature and the Autopilot community switch are enabled, a completed Autopilot video is added to the Wesh Star IA community feed.
- **Cross-post the same video to all compatible platforms** sends a completed Autopilot render to every enabled, connected social account whose configured maximum duration accepts the target duration. It is off by default. If off, existing one-target-platform scheduling is preserved.
- Cross-posting does not guarantee that every remote platform accepts the upload. Results are stored independently in `social_publications` / `publish_status`.

## Platform status inferred from this repository (not live credential tests)
| Platform | Code path present | Production requirements / limitations |
|---|---|---|
| Facebook | Yes — Graph API video upload | Page permissions/token, correct account type and Meta app permissions required. |
| Instagram | Yes — Reels container + publish flow | Instagram Business/Creator account, linked Meta permissions, public media URL and API eligibility required. |
| YouTube | Yes — resumable Data API upload | OAuth refresh token, Google API enabled, quota and upload-policy compliance required. |
| TikTok | Yes — Content Posting API endpoint | Developer app approval and `video.publish` scope required for public direct posting. Current code still needs a compliance pass for per-post consent, creator privacy choices/status polling, and AI-generated-content labelling before claiming full unattended production readiness. |
| X | Yes — video media upload + post | Correct OAuth 1.0a user-context credentials, API access tier and media constraints required. |
| LinkedIn | Yes — REST video upload + post | Access token, owner URN, product scopes, API version and account permissions required. |
| Snapchat | Partial/partner-dependent | The code requires `SNAPCHAT_UPLOAD_ENDPOINT`; repository comments note Snap partnership/API access is needed. Not ready just by entering a token. |
| Twitch | Special mode | Sends a prerecorded video as an RTMP stream using FFmpeg and a stream key; this is not ordinary feed-video publishing and requires operational testing. |

## Required end-to-end checks
1. Test OAuth connect, token refresh/expiry and disconnect for each account separately.
2. Test a short video on every platform and verify a real remote post URL/status.
3. Test a video longer than each platform's configured maximum and confirm the cross-post selector skips that platform.
4. Verify portrait/square/landscape outputs; current cross-post mode checks duration, but does not automatically reframe/crop each platform's video.
5. For TikTok, follow current Content Posting API guidelines: user consent, creator info/privacy options, status checks, app audit and AI-generated-content labelling.
6. Do not tell users a post succeeded until the remote platform reports success. TikTok's returned publish ID is not itself a final public post URL.

## Important
A configured account, a visible UI switch, or a successful local generation does not prove the remote API is approved or operational. API credentials and platform reviews are deployment prerequisites, not code that a ZIP can supply.
