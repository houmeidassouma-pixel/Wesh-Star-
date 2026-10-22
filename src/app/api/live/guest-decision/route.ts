import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { withTransaction } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!rateLimit("live-guest-decision:" + clientKey(req, access.user.id), 30, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId || ""), guestId = String(body.guestId || ""), decision = String(body.decision || "");
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !/^[0-9a-f-]{36}$/i.test(guestId) || !["approve","reject"].includes(decision)) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const result = await withTransaction(async c => {
    const q = await c.query("select host_id,status,live_mode,guest_limit from public.live_sessions where id=$1 for update", [sessionId]);
    const s = q.rows[0];
    if (!s || s.status !== "live") return { code: 404, error: "LIVE_ENDED" };
    if (s.host_id !== access.user!.id && !access.isAdmin) {
      const moderator = await c.query("select 1 from public.live_session_moderators where session_id=$1 and user_id=$2", [sessionId, access.user!.id]);
      if (!moderator.rows[0]) return { code: 403, error: "FORBIDDEN" };
    }
    const request = await c.query("select status from public.live_guests where session_id=$1 and user_id=$2 for update", [sessionId, guestId]);
    if (!request.rows[0] || request.rows[0].status !== "pending") return { code: 404, error: "REQUEST_NOT_FOUND" };
    if (decision === "approve") {
      if (s.live_mode !== "guests") return { code: 400, error: "GUEST_STAGE_DISABLED" };
      const count = await c.query("select count(*)::int n from public.live_guests where session_id=$1 and status='accepted'", [sessionId]);
      if (Number(count.rows[0]?.n || 0) >= Number(s.guest_limit)) return { code: 409, error: "GUEST_STAGE_FULL" };
    }
    await c.query("update public.live_guests set status=$3,decided_at=now() where session_id=$1 and user_id=$2", [sessionId, guestId, decision === "approve" ? "accepted" : "rejected"]);
    return { code: 200 };
  });
  return result.code === 200 ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.code });
}
