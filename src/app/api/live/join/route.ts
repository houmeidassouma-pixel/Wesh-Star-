import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";

// Rejoindre un LIVE ; rappelé toutes les ~20 s par le navigateur comme signal de présence.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("live-join:" + clientKey(req, access.user.id), 20, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const { sessionId } = await req.json().catch(() => ({}));
  const id = String(sessionId || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const s = await query("select id from public.live_sessions where id=$1 and status='live'", [id]);
  if (!s.rows[0]) return NextResponse.json({ error: "LIVE_ENDED" }, { status: 404 });
  const blocked = await query("select 1 from public.live_session_blocks where session_id=$1 and user_id=$2", [id, access.user.id]);
  if (blocked.rows[0]) return NextResponse.json({ error: "LIVE_BLOCKED" }, { status: 403 });
  // joined_at n'est jamais réécrit : le temps de présence minimum du coffre ne peut pas être "remis à zéro".
  await query(`insert into public.live_participants (session_id,user_id) values ($1,$2)
               on conflict (session_id,user_id) do update set last_seen_at = now()`, [id, access.user.id]);
  return NextResponse.json({ ok: true });
}
