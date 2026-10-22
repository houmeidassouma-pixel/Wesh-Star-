import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";

function b64url(value: string) { return Buffer.from(value).toString("base64url"); }
function makeToken(apiKey: string, secret: string, userId: string, name: string, room: string, canPublish: boolean) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: apiKey, sub: userId, name: name.slice(0, 80), nbf: now - 5, iat: now, exp: now + 60 * 60,
    video: { room, roomJoin: true, canPublish, canSubscribe: true, canPublishData: canPublish }
  }));
  const input = `${header}.${payload}`;
  return `${input}.${createHmac("sha256", secret).update(input).digest("base64url")}`;
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  const apiKey = process.env.LIVEKIT_API_KEY || "";
  const secret = process.env.LIVEKIT_API_SECRET || "";
  const url = process.env.LIVEKIT_PUBLIC_URL || "";
  if (!apiKey || !secret || !url || !/^wss?:\/\//i.test(url)) {
    return NextResponse.json({ error: "LIVE_STREAM_NOT_CONFIGURED", message: "Le serveur LiveKit n'est pas configuré. Vérifie LIVEKIT_API_KEY, LIVEKIT_API_SECRET et LIVEKIT_PUBLIC_URL." }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId || "");
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const s = await query("select id, host_id, title from public.live_sessions where id=$1 and status='live'", [sessionId]);
  if (!s.rows[0]) return NextResponse.json({ error: "LIVE_ENDED" }, { status: 404 });
  const blocked = await query("select 1 from public.live_session_blocks where session_id=$1 and user_id=$2", [sessionId, access.user.id]);
  if (blocked.rows[0]) return NextResponse.json({ error: "LIVE_BLOCKED" }, { status: 403 });
  const room = `wesh-${sessionId}`;
  const isHost = s.rows[0].host_id === access.user.id;
  // Seuls l'hôte et les invités acceptés par l'hôte peuvent émettre caméra/micro ; les autres regardent seulement.
  let canPublish = isHost;
  if (!isHost) {
    const g = await query("select 1 from public.live_guests where session_id=$1 and user_id=$2 and status='accepted'", [sessionId, access.user.id]);
    canPublish = Boolean(g.rows[0]);
  }
  const token = makeToken(apiKey, secret, access.user.id, String(access.user.email || "Wesh user"), room, canPublish);
  return NextResponse.json({ ok: true, url, token, room, title: s.rows[0].title, isHost, canPublish });
}
