import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";
import { getSettings } from "@/lib/settings";
export async function POST(req: Request) {
  const access=await getAccess(); if(!access.user) return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
  const s=await getSettings(); if(!s.site.communityEnabled && !s.site.socialNetworkEnabled) return NextResponse.json({error:"COMMUNITY_DISABLED"},{status:404});
  const b=await req.json().catch(()=>({})); const postId=String(b.postId||""); const reason=String(b.reason||"Autre").trim().slice(0,300);
  if(!postId) return NextResponse.json({error:"INVALID"},{status:400});
  const pe=await getPool().query(`SELECT 1 FROM community_posts WHERE id::text=$1`,[postId]); if(!pe.rows[0]) return NextResponse.json({error:"NOT_FOUND"},{status:404});
  await getPool().query(`INSERT INTO community_reports(post_id,reporter_id,reason) VALUES($1,$2,$3) ON CONFLICT(post_id,reporter_id) DO NOTHING`,[postId,access.user.id,reason]);
  return NextResponse.json({ok:true});
}
