import { quotaPeriodKey } from "@/lib/quota-period";
import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/account/admin";
import { consumeFreeTrial, refundFreeTrial } from "@/lib/free-trial";

const ADMIN_MONTHLY_CAP = 1_000_000_000;

// Owner (or admin) re-queues a failed generation. A retry consumes quota
// again (the failure refunded it), atomically — same rules as a new job.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit("retry:" + clientKey(req, access.user.id), 30, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("generations")
    .select("user_id, created_at, status, target_seconds")
    .eq("id", jobId)
    .single();
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (job.user_id !== access.user.id && access.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  // A retry is only valid for a job that actually FAILED.
  // Completed / pending / processing jobs must never be relaunched here.
  if (job.status !== "failed") {
    return NextResponse.json({ error: "INVALID_STATE", status: job.status }, { status: 409 });
  }

  // Consume the same monthly/daily video-time allowance as a fresh generation.
  // If included time is exhausted, purchased hour credits are used instead.
  const month = quotaPeriodKey(access.profile);
  const day = new Date().toISOString().slice(0, 10);
  let retryFromPlan = false;
  let retryFromCredits = false;
  let retryFromTrial = false;
  if (!access.isAdmin && !access.isModerator) {
    if (access.planKey === "free") {
      retryFromTrial = await consumeFreeTrial(access.user.id);
      if (!retryFromTrial) return NextResponse.json({ error: "FREE_TRIAL_EXHAUSTED" }, { status: 402 });
    } else {
    const { data: ok } = await admin.rpc("consume_generation_time_quota", {
      p_user_id: access.user.id, p_month: month, p_day: day,
      p_seconds: Number(job.target_seconds || 0),
      p_max_month_seconds: access.limits.monthlySeconds,
      p_max_day_seconds: access.limits.dailySeconds,
      p_max_month_jobs: access.limits.monthlyJobs, p_max_day_jobs: access.limits.dailyJobs
    });
    if (ok) retryFromPlan = true;
    else {
      const { data: creditOk } = await admin.rpc("consume_hour_credits", { p_user_id: access.user.id, p_seconds: Number(job.target_seconds || 0) });
      if (!creditOk) return NextResponse.json({ error: "QUOTA_LIMIT" }, { status: 429 });
      retryFromCredits = true;
    }
    }
  }

  const { data: updated } = await admin.from("generations").update({
    status: "pending", clips: [], error: null, video_path: null,
    locked_at: null, attempts: 0, quota_refunded: false,
    quota_source: retryFromTrial ? "trial" : (retryFromPlan ? "plan" : (retryFromCredits ? "credits" : (access.isAdmin || access.isModerator ? "staff" : "none"))),
    quota_seconds: (!access.isAdmin && !access.isModerator) ? Number(job.target_seconds || 0) : 0,
    quota_period: retryFromPlan ? month : null,
    updated_at: new Date().toISOString()
  }).eq("id", jobId);
  if (!updated || updated.length === 0) {
    if (retryFromTrial) await refundFreeTrial(access.user.id);
    if (retryFromPlan) await admin.rpc("refund_generation_time_quota", { p_user_id: access.user.id, p_month: month, p_day: day, p_seconds: Number(job.target_seconds || 0) });
    if (retryFromCredits) await admin.rpc("refund_hour_credits", { p_user_id: access.user.id, p_seconds: Number(job.target_seconds || 0) });
    return NextResponse.json({ error: "RETRY_UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
