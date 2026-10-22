import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function GET(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ jobs: [] }, { status: 401 });
  if (!rateLimit("list:" + clientKey(req, access.user.id), 120, 60_000)) {
    return NextResponse.json({ jobs: [] }, { status: 429 });
  }
  const { data } = await createAdminClient()
    .from("generations")
    .select("id,prompt,video_type,target_seconds,scenes,status,error,created_at,clips")
    .eq("user_id", access.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ jobs: data || [] });
}
