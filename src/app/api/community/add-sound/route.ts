import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { getReusableSound } from "@/lib/creator-db";
import { readStorageFile, uploadVideo } from "@/lib/storage";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export const runtime = "nodejs";
const run = promisify(execFile);

// Re-mixes a reusable community sound into the actual video file of the user's published post.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!rateLimit("community-add-sound:" + clientKey(req, access.user.id), 3, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  let body: any = {}; try { body = await req.json(); } catch {}
  const postId = String(body.postId || ""), soundId = String(body.soundId || "");
  if (!/^[0-9a-f-]{36}$/i.test(postId) || !/^[0-9a-f-]{36}$/i.test(soundId)) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const post = await query(`select p.id,p.user_id,p.generation_id,g.video_path from public.community_posts p join public.generations g on g.id=p.generation_id where p.id=$1 and p.status='published'`, [postId]);
  const row = post.rows[0];
  if (!row || (!access.isAdmin && row.user_id !== access.user.id)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!row.video_path) return NextResponse.json({ error: "VIDEO_UNAVAILABLE" }, { status: 400 });
  const sound = await getReusableSound(soundId, access.user.id, access.isAdmin);
  if (!sound) return NextResponse.json({ error: "SOUND_UNAVAILABLE" }, { status: 400 });
  const video = await readStorageFile(String(row.video_path));
  const audio = await readStorageFile(String(sound.audio_path));
  const dir = await mkdtemp(path.join(os.tmpdir(), "wesh-post-sound-"));
  const input = path.join(dir, "video.mp4"), music = path.join(dir, "music.bin"), output = path.join(dir, "mixed.mp4");
  const outPath = `${row.user_id}/videos/community-sound-${randomUUID()}.mp4`;
  try {
    await writeFile(input, video); await writeFile(music, audio);
    const probe = await run("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=index", "-of", "csv=p=0", input], { timeout: 30_000 });
    const hasAudio = !!probe.stdout.trim();
    const args = hasAudio
      ? ["-y", "-i", input, "-stream_loop", "-1", "-i", music, "-filter_complex", "[0:a]volume=1[a0];[1:a]volume=0.18[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]", "-map", "0:v:0", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", output]
      : ["-y", "-i", input, "-stream_loop", "-1", "-i", music, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", output];
    await run("ffmpeg", args, { timeout: 10 * 60_000, maxBuffer: 10 * 1024 * 1024 });
    const mixed = await readFile(output);
    await uploadVideo(outPath, mixed, "video/mp4");
    await query("update public.generations set video_path=$1, updated_at=now() where id=$2", [outPath, row.generation_id]);
    await query("update public.community_posts set sound_id=$1 where id=$2", [sound.id, postId]);
    await query("update public.sounds set uses_count=uses_count+1 where id=$1", [sound.id]);
    return NextResponse.json({ ok: true, message: "Son ajouté au fichier vidéo publié." });
  } catch (e: any) {
    console.error("[community-add-sound]", e?.message || e);
    return NextResponse.json({ error: "AUDIO_MIX_FAILED", message: "Le mixage a échoué. Vérifie que FFmpeg est installé et que la vidéo contient une piste audio." }, { status: 503 });
  } finally { await rm(dir, { recursive: true, force: true }).catch(() => undefined); }
}
