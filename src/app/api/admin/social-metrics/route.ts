import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import { engagementScore } from "@/lib/social-intelligence";
const PLATFORMS=["tiktok","facebook","instagram","snapchat","youtube","twitch","x","linkedin"];
export async function GET(){
  const access=await getAccess(); if(access.role!=="admin") return NextResponse.json({error:"Forbidden"},{status:403});
  const {data,error}=await createAdminClient().from("social_metrics").select("*").order("score",{ascending:false}).limit(200);
  if(error) return NextResponse.json({error:error.message},{status:500}); return NextResponse.json({metrics:data||[]});
}
export async function POST(req:Request){
  const access=await getAccess(); if(access.role!=="admin") return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>({})); const platform=String(body.platform||"");
  if(!PLATFORMS.includes(platform)) return NextResponse.json({error:"Unknown platform"},{status:400});
  if(typeof body.generation_id!=="string") return NextResponse.json({error:"generation_id required"},{status:400});
  const admin=createAdminClient();
  const {data:g}=await admin.from("generations").select("id,user_id,target_seconds,video_language").eq("id",body.generation_id).maybeSingle();
  if(!g) return NextResponse.json({error:"generation not found"},{status:404});
  const metric={platform,views:Number(body.views||0),likes:Number(body.likes||0),comments:Number(body.comments||0),shares:Number(body.shares||0),saves:Number(body.saves||0),watch_time_seconds:Number(body.watch_time_seconds||0),video_seconds:Number(body.video_seconds||g.target_seconds||0)};
  const score=engagementScore(metric);
  const {data,error}=await admin.from("social_metrics").insert({...metric,score,generation_id:g.id,user_id:g.user_id,publication_id:body.publication_id||null,external_post_id:body.external_post_id||null,format_profile:typeof body.format_profile==="string"?body.format_profile.slice(0,120):null,hook_style:typeof body.hook_style==="string"?body.hook_style.slice(0,120):null,caption_style:typeof body.caption_style==="string"?body.caption_style.slice(0,120):null,language:typeof body.language==="string"?body.language.slice(0,40):g.video_language||"auto"}).select("*").single();
  if(error) return NextResponse.json({error:error.message},{status:500}); return NextResponse.json({ok:true,metric:data});
}
