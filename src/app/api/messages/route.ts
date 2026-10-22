import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";

export async function GET(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const other = new URL(req.url).searchParams.get("with") || "";
  if (!other || other === access.user.id) return NextResponse.json({ error: "INVALID_PARTICIPANT" }, { status: 400 });
  const result = await getPool().query(`
    SELECT id, sender_id, recipient_id, body, created_at, read_at
    FROM private_messages
    WHERE (sender_id=$1 AND recipient_id=$2) OR (sender_id=$2 AND recipient_id=$1)
    ORDER BY created_at ASC LIMIT 200`, [access.user.id, other]);
  await getPool().query(`UPDATE private_messages SET read_at=now() WHERE sender_id=$1 AND recipient_id=$2 AND read_at IS NULL`, [other, access.user.id]);
  return NextResponse.json({ messages: result.rows });
}
