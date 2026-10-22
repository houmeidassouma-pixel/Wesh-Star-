import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";

function workerBase() { return String(process.env.SELF_HOSTED_VIDEO_URL || "http://gpu-worker:8001").replace(/\/$/, ""); }
function authHeaders() { return (process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN) ? { Authorization: "Bearer " + (process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN) } : {}; }

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });
  if (access.profile?.blocked) return NextResponse.json({ ok:false, error:"ACCOUNT_BLOCKED" }, { status:403 });
  if (!rateLimit("assetgen:" + clientKey(req, access.user.id), 5, 60_000)) return NextResponse.json({ok:false,error:"RATE_LIMIT"},{status:429});
  let body:any={}; try { body=await req.json(); } catch {}
  const prompt=String(body.prompt||"").trim().slice(0,1000);
  if (!prompt) return NextResponse.json({ok:false,error:"PROMPT_REQUIRED"},{status:400});
  const r=await fetch(workerBase()+"/v1/assets/generate",{method:"POST",headers:{"Content-Type":"application/json",...authHeaders()},body:JSON.stringify({prompt,width:768,height:768})});
  if(!r.ok) return NextResponse.json({ok:false,error:"WORKER_UNAVAILABLE"},{status:503});
  const d=await r.json();
  return NextResponse.json({ok:true,jobId:d.id,status:d.status});
}
