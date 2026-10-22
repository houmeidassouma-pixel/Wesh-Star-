import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { withTransaction } from "@/lib/creator-db";
import { settleChest } from "@/lib/live-db";

// Clôture manuelle par le déposant, l'hôte du LIVE ou un admin : les parts non réclamées sont rendues au déposant.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { chestId } = await req.json().catch(() => ({}));
  const id = String(chestId || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const out = await withTransaction(async (c) => {
    const r = await c.query("select ch.depositor_id, s.host_id from public.chests ch join public.live_sessions s on s.id=ch.session_id where ch.id=$1", [id]);
    const row = r.rows[0];
    if (!row) return { code: 404, error: "NOT_FOUND" };
    if (row.depositor_id !== access.user!.id && row.host_id !== access.user!.id && !access.isAdmin) return { code: 403, error: "FORBIDDEN" };
    const s = await settleChest(c, id, true);
    return { code: 200, ...s };
  });
  return out.code === 200 ? NextResponse.json({ ok: true, closed: (out as any).closed, refunded: (out as any).refunded }) : NextResponse.json({ error: (out as any).error }, { status: out.code });
}
