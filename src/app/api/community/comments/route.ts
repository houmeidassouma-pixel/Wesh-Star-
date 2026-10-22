import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";
import { getSettings } from "@/lib/settings";
import { listComments } from "@/lib/community";

// Latest comments of a post the caller is allowed to see.
export async function GET(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const s = await getSettings();
  if (!s.site.communityEnabled && !s.site.socialNetworkEnabled) return NextResponse.json({ error: "COMMUNITY_DISABLED" }, { status: 404 });
  const postId = String(new URL(req.url).searchParams.get("postId") || "");
  if (!/^[0-9a-f-]{36}$/i.test(postId)) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const p = await getPool().query(
    `SELECT 1 FROM community_posts WHERE id=$1 AND status='published' AND (visibility='public' OR user_id=$2 OR (visibility='followers' AND EXISTS (SELECT 1 FROM community_follows f WHERE f.follower_id=$2 AND f.following_id=community_posts.user_id)))`,
    [postId, access.user.id]
  );
  if (!p.rows[0]) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ comments: await listComments(postId) });
}
