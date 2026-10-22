import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { withTransaction } from "@/lib/creator-db";
import { settleDueChests } from "@/lib/live-db";

// Fin du LIVE par l'hôte (ou un admin) : tous les coffres ouverts sont clôturés et les parts non réclamées remboursées.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { sessionId } = await req.json().catch(() => ({}));
  const id = String(sessionId || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const out = await withTransaction(async (c) => {
    const r = await c.query("select host_id,status from public.live_sessions where id=$1 for update", [id]);
    const s = r.rows[0];
    if (!s) return { code: 404, error: "NOT_FOUND" };
    if (s.host_id !== access.user!.id && !access.isAdmin) return { code: 403, error: "FORBIDDEN" };
    if (s.status === "live") await c.query("update public.live_sessions set status='ended', ended_at=now() where id=$1", [id]);
    await settleDueChests(c, id);
    return { code: 200 };
  });
  return out.code === 200 ? NextResponse.json({ ok: true }) : NextResponse.json({ error: out.error }, { status: out.code });
}
