# Competitor feature implementation status — Wesh Star IA

This update adds independent automatic community publishing for Autopilot videos, an opt-in cross-post mode for all enabled/connected platforms compatible with the rendered video duration, and documents deployment requirements. It does not claim that every advanced editor feature or every social network integration is production-ready.

## Existing code modules to validate before launch
- `src/components/VideoEditor.tsx`: AI-assisted object insertion into an existing video; depends on the configured local image-generation and video-editing worker.
- `src/components/ProductAdStudio.tsx`: product-ad creation flow.
- `src/components/GenerateStudio.tsx`: video generation controls.
- `src/components/ModeratorAutopilot.tsx` and `src/app/api/worker/autopilot/route.ts`: per-platform Autopilot profiles and scheduling.
- `src/components/PublishToWesh.tsx` and `src/app/api/community/publish/route.ts`: explicit community publishing for regular user videos.
- `src/app/api/worker/process/route.ts`: generation finalization and social publishing orchestration.

## Recommended launch acceptance tests
1. Generate one short video using the actual configured GPU/model; verify final MP4, audio, and storage path.
2. Enable community + auto-community publishing, run one Autopilot job, and verify one public `community_posts` row is created.
3. Disable auto-community publishing and verify that the next Autopilot video is not added to the community automatically.
4. Keep community disabled and verify that no automatic community post is created even if the per-job flag is true.
5. Enable cross-posting and verify the same generated video is sent to each connected, enabled platform whose duration limit accepts it; confirm incompatible platforms are skipped.
6. Connect and test each social platform independently. Confirm the published URL/status from the platform API instead of assuming success.
7. Test platform-specific aspect ratios, duration limits, captions, subtitles, music rights, AI labels, and API review requirements.
8. Verify token debit/refund behaviour on successful generation, permanent failure, and social publishing failure.

## Not completed by a ZIP-only code change
A true multi-track timeline editor, reliable character identity across video models, local TTS/music/subtitle model packaging, and fully approved direct-post connectors require implementation/testing against the actual GPU, model files, platform developer apps, OAuth scopes, credentials, and production environment. UI modules alone do not guarantee these features work end-to-end.
