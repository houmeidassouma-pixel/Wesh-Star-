import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import { uploadVideo } from "@/lib/storage";
function workerBase(){return String(process.env.SELF_HOSTED_VIDEO_URL||"http://gpu-worker:8001").replace(/\/$/,"");}
function authHeaders(){return (process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN)?{Authorization:"Bearer "+(process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN)}:{};}
export async function GET(req:Request){
  const access=await getAccess();if(!access.user)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  const id=new URL(req.url).searchParams.get("jobId")||"";if(!id)return NextResponse.json({ok:false,error:"JOB_REQUIRED"},{status:400});
  const admin=createAdminClient();const {data:job}=await admin.from("generations").select("id,user_id,status,video_path,error,input_images,quota_source,quota_seconds,quota_period,quota_refunded").eq("id",id).single();
  if(!job||(job.user_id!==access.user.id&&!access.isAdmin))return NextResponse.json({ok:false,error:"NOT_FOUND"},{status:404});
  if(job.status==="done"&&job.video_path)return NextResponse.json({ok:true,status:"done",progress:100,url:"/api/video/"+id});
  if(job.status==="failed")return NextResponse.json({ok:false,status:"failed",error:job.error});
  const wid=job.input_images?.workerJobId;if(!wid)return NextResponse.json({ok:false,status:"failed",error:"Missing local GPU job"});
  const r=await fetch(workerBase()+"/v1/jobs/"+encodeURIComponent(wid),{headers:authHeaders(),cache:"no-store"});if(!r.ok)return NextResponse.json({ok:true,status:"processing",progress:0});
  const w=await r.json();
  if(w.status==="failed"){
    if(!job.quota_refunded){
      const sec=Number(job.quota_seconds||0), qs=job.quota_source;
      if(qs==="trial"){await admin.rpc("refund_free_trial",{p_user_id:job.user_id});}
      if(qs==="plan"&&sec){const month=String(job.quota_period || new Date().toISOString().slice(0,7)),day=new Date().toISOString().slice(0,10);await admin.rpc("refund_generation_time_quota",{p_user_id:job.user_id,p_month:month,p_day:day,p_seconds:sec});}
      if(qs==="credits"&&sec)await admin.rpc("refund_hour_credits",{p_user_id:job.user_id,p_seconds:sec});
    }
    await admin.from("generations").update({status:"failed",error:w.error||"Local GPU generation failed",quota_refunded:true,updated_at:new Date().toISOString()}).eq("id",id);
    return NextResponse.json({ok:false,status:"failed",error:w.error||"Local GPU generation failed"});
  }
  if(w.status!=="succeeded")return NextResponse.json({ok:true,status:"processing",progress:w.progress||50});
  const vr=await fetch(workerBase()+"/v1/jobs/"+encodeURIComponent(wid)+"/video",{headers:authHeaders()});if(!vr.ok)return NextResponse.json({ok:true,status:"processing",progress:95});
  const buf=Buffer.from(await vr.arrayBuffer());const path=access.user.id+"/videos/product-ad-"+id+".mp4";await uploadVideo(path,buf,"video/mp4");await admin.from("generations").update({status:"done",video_path:path,updated_at:new Date().toISOString()}).eq("id",id);return NextResponse.json({ok:true,status:"done",progress:100,url:"/api/video/"+id});
}
