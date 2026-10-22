import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";
export async function GET() {
  const started = Date.now();
  try { await getPool().query("select 1"); return NextResponse.json({ ok:true, service:"wesh-star-ia", database:"ok", uptimeCheckMs:Date.now()-started }); }
  catch { return NextResponse.json({ ok:false, service:"wesh-star-ia", database:"error" }, { status:503 }); }
}
