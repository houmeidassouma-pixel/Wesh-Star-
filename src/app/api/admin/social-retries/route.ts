import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const access = await getAccess();
  if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("socialretry:" + clientKey(req, access.user!.id), 30, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (body.all === true) {
    const { data, error } = await admin.from("social_publications")
      .update({ status: "pending", attempts: 0, next_retry_at: now, error: null, locked_at: null, updated_at: now })
      .in("status", ["failed", "pending"])
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: data?.length || 0 });
  }

  if (!body.id || typeof body.id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await admin.from("social_publications")
    .update({ status: "pending", attempts: 0, next_retry_at: now, error: null, locked_at: null, updated_at: now })
    .eq("id", body.id)
    .select("id,platform,status")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, publication: data });
}
