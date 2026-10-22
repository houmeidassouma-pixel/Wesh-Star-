import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { withTransaction } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("live-moderator:" + clientKey(req, access.user.id), 20, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId || ""), action = String(body.action || "");
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !["add","remove","block","unblock"].includes(action)) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const result = await withTransaction(async c => {
    const sr = await c.query("select host_id,status from public.live_sessions where id=$1 for update", [sessionId]);
    const session = sr.rows[0];
    if (!session || session.status !== "live") return { code: 404, error: "LIVE_ENDED" };
    const isHost = session.host_id === access.user!.id || access.isAdmin;
    const assigned = await c.query("select 1 from public.live_session_moderators where session_id=$1 and user_id=$2", [sessionId, access.user!.id]);
    if (!isHost && (!assigned.rows[0] || !["block","unblock"].includes(action))) return { code: 403, error: "HOST_ONLY" };
    let targetId = String(body.userId || "");
    if (action === "add") {
      const username = String(body.username || "").trim().replace(/^@/, "").toLowerCase();
      if (!/^[a-z0-9_]{2,32}$/.test(username)) return { code: 400, error: "INVALID_USERNAME" };
      const u = await c.query("select id from public.profiles where lower(username)=lower($1) and coalesce(blocked,false)=false limit 1", [username]);
      if (!u.rows[0]) return { code: 404, error: "USER_NOT_FOUND" };
      targetId = String(u.rows[0].id);
    }
    if (!/^[0-9a-f-]{36}$/i.test(targetId) || targetId === session.host_id) return { code: 400, error: "INVALID_USER" };
    if (action === "add") await c.query("insert into public.live_session_moderators(session_id,user_id,created_by) values($1,$2,$3) on conflict do nothing", [sessionId,targetId,access.user!.id]);
    if (action === "remove") await c.query("delete from public.live_session_moderators where session_id=$1 and user_id=$2", [sessionId,targetId]);
    if (action === "block") await c.query("insert into public.live_session_blocks(session_id,user_id,blocked_by,reason) values($1,$2,$3,$4) on conflict(session_id,user_id) do update set blocked_by=excluded.blocked_by,reason=excluded.reason", [sessionId,targetId,access.user!.id,String(body.reason||"").slice(0,200)]);
    if (action === "unblock") await c.query("delete from public.live_session_blocks where session_id=$1 and user_id=$2", [sessionId,targetId]);
    if (action === "block") await c.query("update public.live_guests set status='rejected',decided_at=now() where session_id=$1 and user_id=$2 and status in ('pending','accepted')", [sessionId,targetId]);
    return { code: 200 };
  });
  return result.code === 200 ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.code });
}
