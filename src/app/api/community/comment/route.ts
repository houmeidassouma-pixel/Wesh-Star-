import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";
import { getSettings } from "@/lib/settings";
export async function POST(req: Request) {
  const access=await getAccess(); if(!access.user) return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
  const s=await getSettings(); if(!s.site.communityEnabled && !s.site.socialNetworkEnabled) return NextResponse.json({error:"COMMUNITY_DISABLED"},{status:404});
  const b=await req.json().catch(()=>({})); const postId=String(b.postId||""); const body=String(b.body||"").trim().slice(0,500);
  if(!postId||!body) return NextResponse.json({error:"INVALID"},{status:400});
  const db=getPool(); const p=await db.query(`SELECT id FROM community_posts WHERE id=$1 AND status='published' AND visibility='public'`,[postId]);
  if(!p.rows[0]) return NextResponse.json({error:"NOT_FOUND"},{status:404});
  await db.query(`INSERT INTO community_comments(post_id,user_id,body) VALUES($1,$2,$3)`,[postId,access.user.id,body]);
  return NextResponse.json({ok:true});
}
