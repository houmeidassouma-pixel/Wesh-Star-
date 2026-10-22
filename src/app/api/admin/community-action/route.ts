import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";
export async function POST(req:Request){
  const access=await getAccess(); if(!access.isAdmin && !access.canModerate) return NextResponse.json({error:"Forbidden"},{status:403});
  const b=await req.json().catch(()=>({})); const postId=String(b.postId||""); const action=String(b.action||"");
  if(!postId||!['hide','remove','restore'].includes(action)) return NextResponse.json({error:"Invalid"},{status:400});
  const status=action==='restore'?'published':action==='hide'?'hidden':'removed';
  await getPool().query(`UPDATE community_posts SET status=$1,updated_at=now() WHERE id=$2`,[status,postId]);
  await getPool().query(`INSERT INTO moderation_log(user_id,email,prompt,reason) VALUES($1,$2,$3,$4)`,[access.user?.id,access.user?.email,'— community post '+postId+' —','community '+action]);
  return NextResponse.json({ok:true});
}
