import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";
import { getSettings } from "@/lib/settings";
export async function POST(req: Request) {
  const access = await getAccess(); if (!access.user) return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
  const s=await getSettings(); if(!s.site.communityEnabled && !s.site.socialNetworkEnabled) return NextResponse.json({error:"COMMUNITY_DISABLED"},{status:404});
  const {postId}=await req.json().catch(()=>({})); if(!postId) return NextResponse.json({error:"INVALID"},{status:400});
  const db=getPool(); const p=await db.query(`SELECT id FROM community_posts WHERE id=$1 AND status='published' AND (visibility='public' OR user_id=$2 OR (visibility='followers' AND EXISTS (SELECT 1 FROM community_follows f WHERE f.follower_id=$2 AND f.following_id=community_posts.user_id)))`,[postId,access.user.id]); if(!p.rows[0]) return NextResponse.json({error:"NOT_FOUND"},{status:404});
  const exists=await db.query(`SELECT 1 FROM community_likes WHERE post_id=$1 AND user_id=$2`,[postId,access.user.id]);
  if(exists.rows[0]) await db.query(`DELETE FROM community_likes WHERE post_id=$1 AND user_id=$2`,[postId,access.user.id]);
  else await db.query(`INSERT INTO community_likes(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[postId,access.user.id]);
  return NextResponse.json({ok:true,liked:!exists.rows[0]});
}
