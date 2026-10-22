import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import { uploadVideo } from "@/lib/storage";

function workerBase(){return String(process.env.SELF_HOSTED_VIDEO_URL||"http://gpu-worker:8001").replace(/\/$/,"");}
export async function GET(req:Request){
  const access=await getAccess(); if(!access.user) return NextResponse.json({error:"unauthorized"},{status:401});
  const id=new URL(req.url).searchParams.get("jobId"); if(!id) return NextResponse.json({error:"jobId"},{status:400});
  const admin=createAdminClient(); const {data:job}=await admin.from("generations").select("id,user_id,status,video_path,error,input_images,quota_source,quota_seconds,quota_period,quota_refunded").eq("id",id).single();
  if(!job || (job.user_id!==access.user.id && !access.isAdmin)) return NextResponse.json({error:"not found"},{status:404});
  if(job.status==="done" && job.video_path) return NextResponse.json({ok:true,status:"done",progress:100,url:"/api/video/"+id});
  if(job.status==="failed") return NextResponse.json({ok:false,status:"failed",error:job.error});
  const workerJobId=job.input_images?.workerJobId;
  if(!workerJobId) return NextResponse.json({ok:false,status:"failed",error:"Missing worker job"});
  const r=await fetch(workerBase()+"/v1/edit/"+encodeURIComponent(workerJobId),{headers:(process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN)?{Authorization:"Bearer "+(process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN)}:{} ,cache:"no-store"});
  if(!r.ok) return NextResponse.json({ok:true,status:"processing",progress:0});
  const w=await r.json();
  if(w.status==="failed") {
    if (!job.quota_refunded) {
      const qs=job.quota_source, sec=Number(job.quota_seconds||0);
      if(qs==="trial"){ await admin.rpc("refund_free_trial",{p_user_id:job.user_id}); }
      if(qs==="plan" && sec){ const month=new Date().toISOString().slice(0,7), day=new Date().toISOString().slice(0,10); await admin.rpc("refund_generation_time_quota",{p_user_id:job.user_id,p_month:month,p_day:day,p_seconds:sec}); }
      if(qs==="credits" && sec) await admin.rpc("refund_hour_credits",{p_user_id:job.user_id,p_seconds:sec});
      await admin.from("generations").update({status:"failed",error:w.error||"Edit failed",quota_refunded:true,updated_at:new Date().toISOString()}).eq("id",id);
    }
    return NextResponse.json({ok:false,status:"failed",error:w.error});
  }
  if(w.status!=="succeeded") return NextResponse.json({ok:true,status:"processing",progress:Number(w.progress)||0});
  const video=await fetch(workerBase()+"/v1/edit/"+encodeURIComponent(workerJobId)+"/video",{headers:(process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN)?{Authorization:"Bearer "+(process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN)}:{} });
  if(!video.ok) return NextResponse.json({ok:true,status:"processing",progress:100});
  const buf=Buffer.from(await video.arrayBuffer()); const path=access.user.id+"/videos/edit-"+id+".mp4";
  await uploadVideo(path,buf,"video/mp4"); await admin.from("generations").update({status:"done",video_path:path,updated_at:new Date().toISOString()}).eq("id",id);
  return NextResponse.json({ok:true,status:"done",progress:100,url:"/api/video/"+id});
}
