import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";

export async function GET(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 3) return NextResponse.json({ contacts: [] });
  const result = await getPool().query(`SELECT id,email FROM profiles WHERE id<>$1 AND lower(coalesce(email,'')) LIKE $2 ORDER BY email LIMIT 10`, [access.user.id, `${q.replace(/[\\%_]/g, "\\$&")}%`]);
  return NextResponse.json({ contacts: result.rows.map((r: any) => ({ id: r.id, handle: String(r.email || "utilisateur").split("@")[0] })) });
}
