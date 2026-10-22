import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/account/admin";
import { hasPerm } from "@/lib/permissions";

// Staff (admin + moderator) can manage generations. Every removal is
// written to the moderation log with who did it and why.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.isAdmin && !(access.canModerate && hasPerm((access.profile as any)?.permissions, "remove"))) {
    return NextResponse.json({ error: "Forbidden — missing permission: remove" }, { status: 403 });
  }
  if (!rateLimit("admingen:" + clientKey(req, access.user!.id), 60, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  const { jobId, action } = await req.json();
  if (!jobId || !["retry", "delete"].includes(action)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: job } = await admin
    .from("generations")
    .select("id, user_id, prompt, status")
    .eq("id", jobId)
    .single();
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "retry") {
    if (job.status !== "failed") {
      return NextResponse.json({ error: "INVALID_STATE", status: job.status }, { status: 409 });
    }
    await admin.from("generations")
      .update({ status: "pending", clips: [], error: null, video_path: null, locked_at: null, attempts: 0, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    return NextResponse.json({ ok: true });
  }

  // delete: log the removal, then delete
  await admin.from("moderation_log").insert({
    user_id: access.user!.id,
    email: access.user!.email,
    prompt: String(job.prompt || "").slice(0, 500),
    reason: "content removed by " + access.role
  });
  await admin.from("generations").delete().eq("id", jobId);
  return NextResponse.json({ ok: true });
}
