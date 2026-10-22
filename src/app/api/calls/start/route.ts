import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (process.env.COMMUNICATIONS_ENABLED !== "true") return NextResponse.json({ error: "COMMUNICATIONS_DISABLED" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const calleeId = String(body.calleeId || "");
  const callType = body.callType === "video" ? "video" : body.callType === "audio" ? "audio" : "";
  if (!calleeId || calleeId === access.user.id || !callType) return NextResponse.json({ error: "INVALID_CALL" }, { status: 400 });
  const db = getPool();
  const recipient = await db.query(`SELECT id FROM profiles WHERE id=$1`, [calleeId]);
  if (!recipient.rows[0]) return NextResponse.json({ error: "RECIPIENT_NOT_FOUND" }, { status: 404 });
  const active = await db.query(`SELECT id FROM communication_calls WHERE (caller_id=$1 OR callee_id=$1) AND status IN ('ringing','accepted') AND created_at > now() - interval '2 hours' LIMIT 1`, [access.user.id]);
  if (active.rows[0]) return NextResponse.json({ error: "CALL_ALREADY_ACTIVE" }, { status: 409 });
  const created = await db.query(`INSERT INTO communication_calls(caller_id,callee_id,call_type) VALUES($1,$2,$3) RETURNING id,caller_id,callee_id,call_type,status,created_at`, [access.user.id, calleeId, callType]);
  return NextResponse.json({ call: created.rows[0] }, { status: 201 });
}
