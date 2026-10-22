import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
function workerBase() { return String(process.env.SELF_HOSTED_VIDEO_URL || "http://gpu-worker:8001").replace(/\/$/, ""); }
function authHeaders() { return (process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN) ? { Authorization: "Bearer " + (process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN) } : {}; }
export async function GET(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  const id=new URL(req.url).searchParams.get("jobId")||"";
  if(!id) return NextResponse.json({ok:false,error:"JOB_REQUIRED"},{status:400});
  const r=await fetch(workerBase()+"/v1/assets/"+encodeURIComponent(id),{cache:"no-store",headers:authHeaders()});
  if(!r.ok) return NextResponse.json({ok:false,error:"WORKER_UNAVAILABLE"},{status:503});
  const d=await r.json();
  return NextResponse.json({ok:true,...d});
}
