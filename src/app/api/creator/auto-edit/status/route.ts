import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";

export async function GET(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const id = String(new URL(req.url).searchParams.get("jobId") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const r = await query("select id,status,error,video_path,updated_at, (updated_at < now() - interval '20 minutes') as stale from public.generations where id=$1 and user_id=$2 and job_kind='auto_montage'", [id, access.user.id]);
  const j = r.rows[0];
  if (!j) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  // Job resté "processing" trop longtemps (ex. redémarrage du serveur) : on le déclare échoué au lieu de laisser l'utilisateur attendre.
  if (j.status === "processing" && j.stale) {
    await query("update public.generations set status='failed', error='Délai dépassé (montage interrompu).', updated_at=now() where id=$1 and status='processing'", [id]);
    return NextResponse.json({ ok: false, status: "failed", error: "Délai dépassé (montage interrompu)." });
  }
  if (j.status === "done" && j.video_path) return NextResponse.json({ ok: true, status: "done", url: "/api/video/" + id });
  if (j.status === "failed") return NextResponse.json({ ok: false, status: "failed", error: j.error || "Échec" });
  return NextResponse.json({ ok: true, status: "processing" });
}
