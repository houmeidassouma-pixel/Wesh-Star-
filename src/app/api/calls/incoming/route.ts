import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";

export async function GET() {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (process.env.COMMUNICATIONS_ENABLED !== "true") return NextResponse.json({ error: "COMMUNICATIONS_DISABLED" }, { status: 503 });
  const result = await getPool().query(`SELECT id,caller_id,callee_id,call_type,status,created_at FROM communication_calls WHERE (callee_id=$1 OR caller_id=$1) AND status IN ('ringing','accepted') AND created_at > now() - interval '2 hours' ORDER BY created_at DESC LIMIT 10`, [access.user.id]);
  return NextResponse.json({ calls: result.rows });
}
