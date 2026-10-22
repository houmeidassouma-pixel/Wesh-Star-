import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import { createSignedVideoUrl } from "@/lib/storage";
import { rateLimit, clientKey } from "@/lib/ratelimit";

// Secure video serving: only the owner (or an admin) gets a signed URL.
export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit("video:" + clientKey(req, access.user.id), 240, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  const { data: job } = await createAdminClient()
    .from("generations")
    .select("user_id, status, video_path")
    .eq("id", params.jobId)
    .single();

  if (!job || job.status !== "done" || !job.video_path) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (job.user_id !== access.user.id && access.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const download = new URL(req.url).searchParams.has("download");
  const url = await createSignedVideoUrl(job.video_path, 3600, download);
  return NextResponse.redirect(url);
}
