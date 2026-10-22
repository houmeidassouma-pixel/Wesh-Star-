import { quotaPeriodKey } from "@/lib/quota-period";
import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import { createSignedVideoUrl, uploadVideo } from "@/lib/storage";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import path from "path";
import { consumeFreeTrial, refundFreeTrial } from "@/lib/free-trial";

function workerBase() { return String(process.env.SELF_HOSTED_VIDEO_URL || "http://gpu-worker:8001").replace(/\/$/, ""); }

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });
  if (access.profile?.blocked) return NextResponse.json({ ok:false, error:"ACCOUNT_BLOCKED" }, { status:403 });
  if (!rateLimit("edit:" + clientKey(req, access.user.id), 10, 60_000)) return NextResponse.json({ok:false,error:"RATE_LIMIT"},{status:429});
  let body:any={}; try { body=await req.json(); } catch {}
  const videoPath=String(body.videoPath||""); const assetPath=String(body.assetPath||""); const assetUrl=String(body.assetUrl||"");
  const instruction=String(body.instruction||"Ajoute cet objet derrière moi").slice(0,1000);
  if (!videoPath || (!assetPath && !assetUrl)) return NextResponse.json({ok:false,error:"FILES_REQUIRED"},{status:400});
  if (!videoPath.startsWith(access.user.id+"/") || (assetPath && !assetPath.startsWith(access.user.id+"/"))) return NextResponse.json({ok:false,error:"FORBIDDEN"},{status:403});

  // Ask ffprobe on the app host to estimate the video duration for quota accounting.
  let seconds=30;
  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const exec=promisify(execFile);
    const local = process.env.WESH_STORAGE_ROOT || "/app/storage";
    const p = path.join(local, videoPath);
    const r=await exec("ffprobe",["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",p]);
    seconds=Math.max(3,Math.ceil(Number(r.stdout.trim())||30));
  } catch {}
  if (seconds > access.maxSeconds && !access.isAdmin && !access.isModerator) return NextResponse.json({ok:false,error:"LENGTH"},{status:400});

  const admin=createAdminClient(); const uid=access.user.id;
  const month=new Date().toISOString().slice(0,7), day=new Date().toISOString().slice(0,10);
  let quotaFromPlan=false, credits=0, trialConsumed=false;
  if (!(access.isAdmin||access.isModerator)) {
    if (access.planKey === "free") {
      trialConsumed = await consumeFreeTrial(uid);
      if (!trialConsumed) return NextResponse.json({ok:false,error:"FREE_TRIAL_EXHAUSTED"},{status:402});
    } else {
    const {data:ok}=await admin.rpc("consume_generation_time_quota",{p_user_id:uid,p_month:month,p_day:day,p_seconds:seconds,p_max_month_seconds:access.limits.monthlySeconds,p_max_day_seconds:access.limits.dailySeconds,p_max_month_jobs:access.limits.monthlyJobs,p_max_day_jobs:access.limits.dailyJobs});
    if(ok) quotaFromPlan=true;
    else { const {data:creditOk}=await admin.rpc("consume_hour_credits",{p_user_id:uid,p_seconds:seconds}); if(!creditOk) return NextResponse.json({ok:false,error:"QUOTA_LIMIT",requiredSeconds:seconds},{status:429}); credits=seconds; }
    }
  }

  const inputUrl=await createSignedVideoUrl(videoPath,3600);
  const finalAssetUrl=assetUrl || await createSignedVideoUrl(assetPath,3600);
  const workerRes=await fetch(workerBase()+"/v1/edit",{method:"POST",headers:{"Content-Type":"application/json",...((process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN)?{Authorization:"Bearer "+(process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN)}:{})},body:JSON.stringify({video_url:inputUrl,asset_url:finalAssetUrl,instruction,mode:"object_behind_subject",x:Number(body.x)||0.58,y:Number(body.y)||0.42,scale:Number(body.scale)||0.28})});
  if(!workerRes.ok){ if(trialConsumed) await refundFreeTrial(uid); if(quotaFromPlan) await admin.rpc("refund_generation_time_quota",{p_user_id:uid,p_month:month,p_day:day,p_seconds:seconds}); if(credits) await admin.rpc("refund_hour_credits",{p_user_id:uid,p_seconds:credits}); return NextResponse.json({ok:false,error:"WORKER_UNAVAILABLE"},{status:503}); }
  const w=await workerRes.json();
  const {data:job,error}=await admin.from("generations").insert({user_id:uid,prompt:"[VIDEO EDIT] "+instruction,video_type:"short",target_seconds:seconds,scenes:1,clips:[],status:"processing",input_images:{videoPath,assetPath:assetPath||null,assetUrl:assetUrl||null,workerJobId:w.id,editMode:assetUrl?"generated_object_behind_subject":"object_behind_subject"},quota_source:trialConsumed?"trial":quotaFromPlan?"plan":credits?"credits":"staff",quota_seconds:seconds,quota_period:quotaFromPlan?month:null}).select("id").single();
  if(error||!job){ if(trialConsumed) await refundFreeTrial(uid); if(quotaFromPlan) await admin.rpc("refund_generation_time_quota",{p_user_id:uid,p_month:month,p_day:day,p_seconds:seconds}); if(credits) await admin.rpc("refund_hour_credits",{p_user_id:uid,p_seconds:credits}); return NextResponse.json({ok:false,error:"DB_ERROR"},{status:500}); }
  return NextResponse.json({ok:true,jobId:job.id,workerJobId:w.id,seconds});
}
