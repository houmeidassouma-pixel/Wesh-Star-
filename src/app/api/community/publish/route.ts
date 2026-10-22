import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getPool } from "@/lib/db/pool";
import { getSettings } from "@/lib/settings";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  const settings = await getSettings();
  if (!settings.site.communityEnabled && !settings.site.socialNetworkEnabled) return NextResponse.json({ error: "COMMUNITY_DISABLED" }, { status: 404 });
  if (!rateLimit("community-publish:" + clientKey(req, access.user.id), 20, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const generationId = String(body.generationId || "");
  const title = String(body.title || "Ma vidéo").trim().slice(0, 120) || "Ma vidéo";
  const description = String(body.description || "").trim().slice(0, 1000);
  const visibility = ["public", "followers", "private"].includes(body.visibility) ? body.visibility : "public";
  const pool = getPool();
  const g = await pool.query(`SELECT id,video_path,status,prompt FROM generations WHERE id=$1 AND user_id=$2 LIMIT 1`, [generationId, access.user.id]);
  const generation = g.rows[0];
  if (!generation || generation.status !== "done" || !generation.video_path) return NextResponse.json({ error: "VIDEO_NOT_READY" }, { status: 400 });
  await pool.query(`
    INSERT INTO community_posts(user_id,generation_id,title,description,visibility,status)
    VALUES($1,$2,$3,$4,$5,'published')
    ON CONFLICT(user_id,generation_id) DO UPDATE SET title=excluded.title,description=excluded.description,visibility=excluded.visibility,status='published',updated_at=now()`,
    [access.user.id, generationId, title, description, visibility]);
  return NextResponse.json({ ok: true });
}
