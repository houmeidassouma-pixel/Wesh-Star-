import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";

function workerBase() { return String(process.env.SELF_HOSTED_VIDEO_URL || "http://gpu-worker:8001").replace(/\/$/, ""); }
function authHeaders() { return (process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN) ? { Authorization: "Bearer " + (process.env.SELF_HOSTED_WORKER_TOKEN || process.env.WESH_GPU_WORKER_TOKEN) } : {}; }

export async function GET(req: Request) {
  const access = await getAccess();
  if (!access.user) return new NextResponse("unauthorized", {status:401});
  const id=new URL(req.url).searchParams.get("jobId")||"";
  if(!id) return new NextResponse("job required", {status:400});
  const r=await fetch(workerBase()+"/v1/assets/"+encodeURIComponent(id)+"/image",{cache:"no-store",headers:authHeaders()});
  if(!r.ok) return new NextResponse("not ready", {status:r.status});
  return new NextResponse(await r.arrayBuffer(),{status:200,headers:{"Content-Type":"image/png","Cache-Control":"private, max-age=3600"}});
}
