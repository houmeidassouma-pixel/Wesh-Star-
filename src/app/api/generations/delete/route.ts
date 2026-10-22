import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/account/admin";
import { deleteStorageFile } from "@/lib/storage";

// Owner (or admin) deletes one of their generations. If the job had consumed
// quota but never completed (and was not refunded yet), refund it first.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit("delete:" + clientKey(req, access.user.id), 30, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("generations")
    .select("user_id, status, quota_refunded, quota_source, quota_seconds, created_at, target_seconds, video_path, clips, input_image, input_images")
    .eq("id", jobId)
    .single();
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (job.user_id !== access.user.id && access.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!job.quota_refunded && job.status !== "done") {
    const created = new Date(job.created_at);
    const quotaSeconds = Number(job.quota_seconds || job.target_seconds || 0);
    if (job.quota_source === "trial") {
      await admin.rpc("refund_free_trial", { p_user_id: job.user_id });
    } else if (job.quota_source === "credits") {
      await admin.rpc("refund_hour_credits", { p_user_id: job.user_id, p_seconds: quotaSeconds });
    } else if (job.quota_source === "plan") {
      await admin.rpc("refund_generation_time_quota", {
        p_user_id: job.user_id,
        p_month: created.toISOString().slice(0, 7),
        p_day: created.toISOString().slice(0, 10),
        p_seconds: quotaSeconds
      });
    }
  }

  const paths = new Set<string>();
  if (job.video_path) paths.add(String(job.video_path));
  if (Array.isArray((job as any).clips)) for (const c of (job as any).clips) if (c?.path) paths.add(String(c.path));
  if (job.input_image) paths.add(String(job.input_image));
  if (Array.isArray((job as any).input_images)) for (const p of (job as any).input_images) if (p) paths.add(String(p));
  for (const p of paths) { try { await deleteStorageFile(p); } catch {} }
  await admin.from("generations").delete().eq("id", jobId);
  return NextResponse.json({ ok: true });
}
