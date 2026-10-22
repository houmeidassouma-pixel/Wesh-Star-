import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";

// One unique view per signed-in viewer and public post. Qualified after 5 seconds.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!rateLimit("community-view:" + clientKey(req, access.user.id), 120, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const postId = String(body.postId || "");
  const watchedSeconds = Number(body.watchedSeconds);
  if (!/^[0-9a-f-]{36}$/i.test(postId) || !Number.isFinite(watchedSeconds) || watchedSeconds < 0 || watchedSeconds > 3600) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const db = getPool();
  const post = await db.query(`SELECT p.id,p.user_id,g.target_seconds FROM community_posts p JOIN generations g ON g.id=p.generation_id JOIN profiles owner ON owner.id=p.user_id WHERE p.id=$1 AND p.status='published' AND p.visibility='public' AND owner.blocked=false`, [postId]);
  if (!post.rows[0]) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const creatorId = String(post.rows[0].user_id);
  if (creatorId === access.user.id) return NextResponse.json({ ok: true, qualified: false, selfView: true });
  const watched = Math.min(3600, Math.floor(watchedSeconds * 100) / 100);
  const result = await db.query(`
    INSERT INTO creator_video_views(post_id,creator_id,viewer_id,max_watched_seconds,qualified_at)
    VALUES($1,$2,$3,$4,CASE WHEN $4 >= 5 THEN now() ELSE NULL END)
    ON CONFLICT(post_id,viewer_id) DO UPDATE SET
      max_watched_seconds=GREATEST(creator_video_views.max_watched_seconds,EXCLUDED.max_watched_seconds),
      qualified_at=CASE WHEN creator_video_views.qualified_at IS NOT NULL THEN creator_video_views.qualified_at WHEN EXCLUDED.max_watched_seconds >= 5 THEN now() ELSE NULL END,
      last_seen_at=now()
    RETURNING qualified_at IS NOT NULL AS qualified
  `, [postId, creatorId, access.user.id, watched]);
  const qualified = Boolean(result.rows[0]?.qualified);
  if (watched >= 5) {
    // Count one qualified, signed-in viewer per campaign/post. The unique key prevents repeat calls inflating delivery.
    await db.query(`
      with eligible as (
        select pc.id as campaign_id, pc.target_views
          from promotion_campaigns pc
         where pc.target_type='video' and pc.target_id=$1 and pc.status='active'
           and pc.ends_at > now() and pc.impressions < pc.target_views
      ), inserted as (
        insert into promotion_impressions(campaign_id, viewer_id)
        select e.campaign_id, $2 from eligible e
        on conflict (campaign_id, viewer_id) do nothing
        returning campaign_id
      ), updated as (
        update promotion_campaigns pc set
          impressions = pc.impressions + 1,
          status = case when pc.impressions + 1 >= pc.target_views then 'completed' else pc.status end,
          updated_at = now()
        from inserted i where pc.id=i.campaign_id
        returning pc.id
      ) select count(*)::int as counted from updated
    `, [postId, access.user.id]);
  }
  return NextResponse.json({ ok: true, qualified });
}
