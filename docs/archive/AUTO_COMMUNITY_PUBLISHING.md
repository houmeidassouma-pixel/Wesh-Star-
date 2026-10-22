# Wesh Star IA — automatic community publishing

## Behaviour
- Social-network autopublishing and Wesh Star IA community publishing are separate destinations.
- Admin control: **Settings → Contrôles de lancement → Publier automatiquement aussi sur Wesh Star IA**.
- Moderator control: the moderator Autopilot panel has its own opt-in toggle and Save button.
- Cross-post control: Admin and each moderator can separately opt in to sending the same Autopilot render to all enabled, connected social platforms whose configured maximum duration accepts the video. Otherwise, the existing single-target-platform behavior is preserved.
- A generated Autopilot video is inserted into `community_posts` only when its per-job opt-in is true AND the administrator has enabled the community (`communityEnabled`).
- Manual user-generated videos are not automatically published by this setting; users keep the existing explicit **Publier sur Wesh Star** action.
- Community publishing is public by default for the auto-published post. The site community feature must be enabled first.
- Idempotency is enforced by the unique `(user_id, generation_id)` key and upsert.

## Database update
Apply the migration-safe statement in `db/schema.sql` to the live database:

```sql
ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS auto_publish_to_community boolean NOT NULL DEFAULT false;
ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS auto_publish_all_platforms boolean NOT NULL DEFAULT false;
```

## Important limitations
- Cross-posting filters by configured maximum duration, but it does not automatically reframe/crop the video for each network. It does not bypass OAuth, app review, account permissions, media constraints, or API rate limits.
- Each social network must be connected and its publishing API configured and approved before direct publishing can work.
- A social post being published does not automatically create a Wesh Star IA community post unless the separate community toggle is enabled.
- The automatic community feature only applies to Autopilot jobs created after the setting is enabled; it does not retroactively publish old videos.
