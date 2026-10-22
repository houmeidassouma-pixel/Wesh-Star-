import { getPool } from "@/lib/db/pool";
import { createSignedVideoUrl } from "@/lib/storage";

export async function listCommunityPosts(userId: string, tab: string = "for-you", targetPostId?: string) {
  const values: any[] = [userId];
  let where = `(pr.blocked = false AND p.status = 'published' AND (p.visibility = 'public' OR (p.visibility = 'followers' AND EXISTS (SELECT 1 FROM community_follows vf WHERE vf.follower_id=$1 AND vf.following_id=p.user_id)) OR (p.visibility = 'private' AND p.user_id=$1)))`;
  if (tab === "following") {
    where += ` AND p.user_id IN (SELECT following_id FROM community_follows WHERE follower_id = $1)`;
  }
  if (targetPostId) {
    values.push(targetPostId);
    where += ` AND p.id = $${values.length}`;
  }
  if (tab === "trending") {
    // Keep the query deterministic and cheap: recent posts ordered by engagement.
    const q = await getPool().query(`
      SELECT p.id,p.user_id,p.generation_id,p.title,p.description,p.visibility,p.created_at,
             pr.email, pr.verified_badge,
             g.video_path,
             p.sound_id, CASE WHEN so.status='active' THEN so.title END AS sound_title,
             (so.status='active' AND (so.allow_reuse OR so.owner_id=$1)) AS sound_reusable,
             EXISTS(SELECT 1 FROM sound_favorites sf WHERE sf.sound_id=so.id AND sf.user_id=$1) AS sound_favorite,
             EXISTS(SELECT 1 FROM promotion_campaigns pc WHERE pc.target_type='video' AND pc.target_id=p.id AND pc.status='active' AND pc.ends_at > now()) AS promoted,
           (SELECT coalesce(sum(gt.tokens),0)::int FROM gift_transactions gt WHERE gt.post_id=p.id) AS gift_tokens,
             (SELECT count(*)::int FROM community_likes l WHERE l.post_id=p.id) likes,
             (SELECT count(*)::int FROM community_comments c WHERE c.post_id=p.id) comments,
             EXISTS(SELECT 1 FROM community_likes l2 WHERE l2.post_id=p.id AND l2.user_id=$1) liked,
             EXISTS(SELECT 1 FROM community_follows f WHERE f.follower_id=$1 AND f.following_id=p.user_id) following
      FROM community_posts p
      JOIN profiles pr ON pr.id=p.user_id
      JOIN generations g ON g.id=p.generation_id
      LEFT JOIN sounds so ON so.id=p.sound_id
      WHERE ${where}
      ORDER BY EXISTS(SELECT 1 FROM promotion_campaigns pc WHERE pc.target_type='video' AND pc.target_id=p.id AND pc.status='active' AND pc.ends_at > now()) DESC, ((SELECT count(*) FROM community_likes l3 WHERE l3.post_id=p.id) * 3 + (SELECT count(*) FROM community_comments c2 WHERE c2.post_id=p.id) * 2) DESC, p.created_at DESC
      LIMIT 60`, values);
    return withUrls(q.rows);
  }
  const q = await getPool().query(`
    SELECT p.id,p.user_id,p.generation_id,p.title,p.description,p.visibility,p.created_at,
           pr.email, pr.verified_badge,
           g.video_path,
           p.sound_id, CASE WHEN so.status='active' THEN so.title END AS sound_title,
           (so.status='active' AND (so.allow_reuse OR so.owner_id=$1)) AS sound_reusable,
           EXISTS(SELECT 1 FROM sound_favorites sf WHERE sf.sound_id=so.id AND sf.user_id=$1) AS sound_favorite,
           EXISTS(SELECT 1 FROM promotion_campaigns pc WHERE pc.target_type='video' AND pc.target_id=p.id AND pc.status='active' AND pc.ends_at > now()) AS promoted,
           (SELECT coalesce(sum(gt.tokens),0)::int FROM gift_transactions gt WHERE gt.post_id=p.id) AS gift_tokens,
           (SELECT count(*)::int FROM community_likes l WHERE l.post_id=p.id) likes,
           (SELECT count(*)::int FROM community_comments c WHERE c.post_id=p.id) comments,
           EXISTS(SELECT 1 FROM community_likes l2 WHERE l2.post_id=p.id AND l2.user_id=$1) liked,
           EXISTS(SELECT 1 FROM community_follows f WHERE f.follower_id=$1 AND f.following_id=p.user_id) following
    FROM community_posts p
    JOIN profiles pr ON pr.id=p.user_id
    JOIN generations g ON g.id=p.generation_id
      LEFT JOIN sounds so ON so.id=p.sound_id
    WHERE ${where}
    ORDER BY EXISTS(SELECT 1 FROM promotion_campaigns pc WHERE pc.target_type='video' AND pc.target_id=p.id AND pc.status='active' AND pc.ends_at > now()) DESC, p.created_at DESC
    LIMIT 60`, values);
  return withUrls(q.rows);
}

async function withUrls(rows: any[]) {
  // Never send the creator's e-mail or the raw storage path to the browser.
  return Promise.all(rows.map(async (r) => {
    const { email, video_path, ...safe } = r;
    return {
      ...safe,
      handle: handleOf(email),
      video_url: video_path ? await createSignedVideoUrl(video_path, 3600) : null,
    };
  }));
}

function handleOf(email: any) {
  return String(email || "créateur").split("@")[0];
}

export async function listComments(postId: string) {
  const r = await getPool().query(`
    SELECT c.id,c.body,c.created_at,c.user_id,p.email,p.verified_badge
    FROM community_comments c JOIN profiles p ON p.id=c.user_id
    WHERE c.post_id=$1 AND p.blocked=false ORDER BY c.created_at DESC LIMIT 50`, [postId]);
  return r.rows.map(({ email, ...c }: any) => ({ ...c, handle: handleOf(email) }));
}
