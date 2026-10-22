import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const recipientId = String(body.recipientId || "");
  const message = String(body.body || "").trim();
  if (!recipientId || recipientId === access.user.id || !message || message.length > 4000) {
    return NextResponse.json({ error: "INVALID_MESSAGE" }, { status: 400 });
  }
  const db = getPool();
  const recipient = await db.query(`SELECT id FROM profiles WHERE id=$1`, [recipientId]);
  if (!recipient.rows[0]) return NextResponse.json({ error: "RECIPIENT_NOT_FOUND" }, { status: 404 });
  // Modest anti-spam guard: maximum 30 messages per minute per sender.
  const recent = await db.query(`SELECT count(*)::int AS n FROM private_messages WHERE sender_id=$1 AND created_at > now() - interval '1 minute'`, [access.user.id]);
  if (Number(recent.rows[0]?.n || 0) >= 30) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  const inserted = await db.query(`INSERT INTO private_messages(sender_id,recipient_id,body) VALUES($1,$2,$3) RETURNING id,sender_id,recipient_id,body,created_at,read_at`, [access.user.id, recipientId, message]);
  return NextResponse.json({ message: inserted.rows[0] }, { status: 201 });
}
