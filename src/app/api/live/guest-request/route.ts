import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { withTransaction } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("live-guest-request:" + clientKey(req, access.user.id), 5, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId || "");
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const result = await withTransaction(async c => {
    const q = await c.query("select host_id,status,live_mode,guest_limit from public.live_sessions where id=$1 for update", [sessionId]);
    const s = q.rows[0];
    if (!s || s.status !== "live") return { code: 404, error: "LIVE_ENDED" };
    if (s.host_id === access.user!.id) return { code: 400, error: "HOST_CANNOT_REQUEST" };
    const blocked = await c.query("select 1 from public.live_session_blocks where session_id=$1 and user_id=$2", [sessionId, access.user!.id]);
    if (blocked.rows[0]) return { code: 403, error: "LIVE_BLOCKED" };
    if (s.live_mode !== "guests" || Number(s.guest_limit) < 1) return { code: 400, error: "GUEST_STAGE_DISABLED" };
    const old = await c.query("select status from public.live_guests where session_id=$1 and user_id=$2", [sessionId, access.user!.id]);
    if (old.rows[0]?.status === "accepted") return { code: 200, status: "accepted" };
    if (old.rows[0]?.status === "pending") return { code: 200, status: "pending" };
    const count = await c.query("select count(*)::int n from public.live_guests where session_id=$1 and status='accepted'", [sessionId]);
    if (Number(count.rows[0]?.n || 0) >= Number(s.guest_limit)) return { code: 409, error: "GUEST_STAGE_FULL" };
    await c.query(`insert into public.live_guests(session_id,user_id,status,requested_at,decided_at) values($1,$2,'pending',now(),null)
      on conflict(session_id,user_id) do update set status='pending',requested_at=now(),decided_at=null`, [sessionId, access.user!.id]);
    return { code: 200, status: "pending" };
  });
  return result.code === 200 ? NextResponse.json({ ok: true, status: result.status }) : NextResponse.json({ error: result.error }, { status: result.code });
}
