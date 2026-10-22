import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { getReusableSound } from "@/lib/creator-db";
import { rateLimit, clientKey } from "@/lib/ratelimit";

// Bascule favori / non favori d'un son (persisté en base, par utilisateur).
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!rateLimit("sndfav:" + clientKey(req, access.user.id), 60, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const { soundId } = await req.json().catch(() => ({}));
  const id = String(soundId || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const uid = access.user.id;
  const ex = await query("select 1 from public.sound_favorites where user_id=$1 and sound_id=$2", [uid, id]);
  if (ex.rows.length) {
    await query("delete from public.sound_favorites where user_id=$1 and sound_id=$2", [uid, id]);
    return NextResponse.json({ ok: true, favorite: false });
  }
  if (!(await getReusableSound(id, uid, access.isAdmin))) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await query("insert into public.sound_favorites (user_id,sound_id) values ($1,$2) on conflict do nothing", [uid, id]);
  return NextResponse.json({ ok: true, favorite: true });
}
