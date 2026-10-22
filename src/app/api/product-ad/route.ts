import { quotaPeriodKey } from "@/lib/quota-period";
import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { consumeFreeTrial, refundFreeTrial } from "@/lib/free-trial";
import { createAdminClient } from "@/lib/account/admin";
import { createSignedVideoUrl } from "@/lib/storage";
import { rateLimit, clientKey } from "@/lib/ratelimit";

function workerBase(){return String(process.env.SELF_HOSTED_VIDEO_URL||"http://gpu-worker:8001").replace(/\/$/,"");}
function authHeaders(){return (process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN)?{Authorization:"Bearer "+(process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN)}:{};}

export async function POST(req:Request){
  const access=await getAccess(); if(!access.user)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  if(access.profile?.blocked)return NextResponse.json({ok:false,error:"ACCOUNT_BLOCKED"},{status:403});
  if(!rateLimit("product-ad:"+clientKey(req,access.user.id),5,60_000))return NextResponse.json({ok:false,error:"RATE_LIMIT"},{status:429});
  let b:any={}; try{b=await req.json()}catch{}
  const imagePath=String(b.imagePath||""); const mode=b.mode==="wear"?"wear":"showcase";
  const mannequin=String(b.mannequin||"adult model").slice(0,300); const brief=String(b.brief||"").slice(0,2000);
  const seconds=Math.min(access.maxSeconds,10,Math.max(3,Math.floor(Number(b.seconds)||5)));
  if(!imagePath || !imagePath.startsWith(access.user.id+"/inputs/"))return NextResponse.json({ok:false,error:"PRODUCT_IMAGE_REQUIRED"},{status:400});
  const month=new Date().toISOString().slice(0,7),day=new Date().toISOString().slice(0,10); let quotaFromPlan=false,credits=0,trialConsumed=false;
  if(!(access.isAdmin||access.isModerator)){
    if(access.planKey === "free"){
      trialConsumed=await consumeFreeTrial(access.user.id);
      if(!trialConsumed)return NextResponse.json({ok:false,error:"FREE_TRIAL_EXHAUSTED"},{status:402});
    } else {
    const {data:ok}=await createAdminClient().rpc("consume_generation_time_quota",{p_user_id:access.user.id,p_month:month,p_day:day,p_seconds:seconds,p_max_month_seconds:access.limits.monthlySeconds,p_max_day_seconds:access.limits.dailySeconds,p_max_month_jobs:access.limits.monthlyJobs,p_max_day_jobs:access.limits.dailyJobs});
    if(ok)quotaFromPlan=true; else {const {data:co}=await createAdminClient().rpc("consume_hour_credits",{p_user_id:access.user.id,p_seconds:seconds});if(!co)return NextResponse.json({ok:false,error:"QUOTA_LIMIT",requiredSeconds:seconds},{status:429});credits=seconds;}
    }
  }
  const admin=createAdminClient();
  const imageUrl=await createSignedVideoUrl(imagePath,3600);
  const prompt=`Commercial product advertisement. ${mode==="wear"?"Show the uploaded product being worn or naturally used by the mannequin when physically plausible. Preserve the product's visible design, proportions and branding as much as possible.":"Present the uploaded product prominently in a premium commercial scene; keep the product recognizable and visually central."} Mannequin: ${mannequin}. ${brief} No invented competing product. Professional advertising cinematography, realistic motion, clean composition.`;
  const wr=await fetch(workerBase()+"/v1/jobs",{method:"POST",headers:{"Content-Type":"application/json",...authHeaders()},body:JSON.stringify({prompt,image_url:imageUrl,duration_seconds:seconds,width:480,height:832,fps:16})});
  if(!wr.ok){if(trialConsumed)await refundFreeTrial(access.user.id);if(quotaFromPlan)await admin.rpc("refund_generation_time_quota",{p_user_id:access.user.id,p_month:month,p_day:day,p_seconds:seconds});if(credits)await admin.rpc("refund_hour_credits",{p_user_id:access.user.id,p_seconds:credits});return NextResponse.json({ok:false,error:"LOCAL_GPU_UNAVAILABLE"},{status:503});}
  const w=await wr.json();
  const {data:job,error}=await admin.from("generations").insert({user_id:access.user.id,prompt:"[PRODUCT AD] "+prompt,video_type:"short",target_seconds:seconds,scenes:1,clips:[],status:"processing",input_image:imagePath,persons:1,character:mode==="wear"?"product_model":"banani",scene_mode:"single",quota_source:trialConsumed?"trial":quotaFromPlan?"plan":credits?"credits":"staff",quota_seconds:seconds,quota_period:quotaFromPlan?month:null,input_images:{workerJobId:w.id,productImage:imagePath,productMode:mode}}).select("id").single();
  if(error||!job){if(trialConsumed)await refundFreeTrial(access.user.id);if(quotaFromPlan)await admin.rpc("refund_generation_time_quota",{p_user_id:access.user.id,p_month:month,p_day:day,p_seconds:seconds});if(credits)await admin.rpc("refund_hour_credits",{p_user_id:access.user.id,p_seconds:credits});return NextResponse.json({ok:false,error:"DB_ERROR"},{status:500});}
  return NextResponse.json({ok:true,jobId:job.id});
}
