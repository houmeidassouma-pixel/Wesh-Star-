import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";
import { getSettings } from "@/lib/settings";
export async function POST(req: Request) {
  const access=await getAccess(); if(!access.user) return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});
  const s=await getSettings(); if(!s.site.communityEnabled && !s.site.socialNetworkEnabled) return NextResponse.json({error:"COMMUNITY_DISABLED"},{status:404});
  const b=await req.json().catch(()=>({})); const target=String(b.userId||""); if(!target||target===access.user.id) return NextResponse.json({error:"INVALID"},{status:400});
  const db=getPool(); const tgt=await db.query(`SELECT 1 FROM profiles WHERE id::text=$1`,[target]); if(!tgt.rows[0]) return NextResponse.json({error:"NOT_FOUND"},{status:404});
  const exists=await db.query(`SELECT 1 FROM community_follows WHERE follower_id=$1 AND following_id=$2`,[access.user.id,target]);
  if(exists.rows[0]) await db.query(`DELETE FROM community_follows WHERE follower_id=$1 AND following_id=$2`,[access.user.id,target]);
  else await db.query(`INSERT INTO community_follows(follower_id,following_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[access.user.id,target]);
  return NextResponse.json({ok:true,following:!exists.rows[0]});
}
