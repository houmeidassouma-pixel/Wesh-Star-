import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";

export async function GET(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (process.env.COMMUNICATIONS_ENABLED !== "true") return NextResponse.json({ error: "COMMUNICATIONS_DISABLED" }, { status: 503 });
  const url = new URL(req.url);
  const callId = url.searchParams.get("callId") || "";
  const after = Math.max(0, Number(url.searchParams.get("after") || 0));
  const db = getPool();
  const call = await db.query(`SELECT id,caller_id,callee_id,status FROM communication_calls WHERE id=$1 AND (caller_id=$2 OR callee_id=$2)`, [callId, access.user.id]);
  if (!call.rows[0]) return NextResponse.json({ error: "CALL_NOT_FOUND" }, { status: 404 });
  const signals = await db.query(`SELECT id, sender_id, signal_type, payload, created_at FROM call_signals WHERE call_id=$1 AND id>$2 AND sender_id<>$3 ORDER BY id ASC LIMIT 100`, [callId, after, access.user.id]);
  return NextResponse.json({ call: call.rows[0], signals: signals.rows });
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (process.env.COMMUNICATIONS_ENABLED !== "true") return NextResponse.json({ error: "COMMUNICATIONS_DISABLED" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const callId = String(body.callId || "");
  const type = String(body.signalType || "");
  const allowed = ["offer", "answer", "ice-candidate", "accepted", "declined", "ended"];
  if (!callId || !allowed.includes(type)) return NextResponse.json({ error: "INVALID_SIGNAL" }, { status: 400 });
  const db = getPool();
  const call = await db.query(`SELECT id,caller_id,callee_id,status FROM communication_calls WHERE id=$1 AND (caller_id=$2 OR callee_id=$2)`, [callId, access.user.id]);
  if (!call.rows[0]) return NextResponse.json({ error: "CALL_NOT_FOUND" }, { status: 404 });
  const payload = body.payload ?? null;
  if (JSON.stringify(payload ?? {}).length > 20000) return NextResponse.json({ error: "SIGNAL_TOO_LARGE" }, { status: 413 });
  if (type === "accepted" || type === "declined" || type === "ended") {
    const status = type === "accepted" ? "accepted" : type === "declined" ? "declined" : "ended";
    await db.query(`UPDATE communication_calls SET status=$2, accepted_at=CASE WHEN $2='accepted' THEN now() ELSE accepted_at END, ended_at=CASE WHEN $2 IN ('ended','declined') THEN now() ELSE ended_at END WHERE id=$1`, [callId, status]);
  }
  const inserted = await db.query(`INSERT INTO call_signals(call_id,sender_id,signal_type,payload) VALUES($1,$2,$3,$4::jsonb) RETURNING id`, [callId, access.user.id, type, JSON.stringify(payload)]);
  return NextResponse.json({ ok: true, id: inserted.rows[0].id });
}
