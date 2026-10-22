import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { uploadVideo, deleteStorageFile, localStoragePath } from "@/lib/storage";
import { probeMedia } from "@/lib/media-probe";
import { getEconomy, getReusableSound, withTransaction } from "@/lib/creator-db";

export const runtime = "nodejs";
const VIDEO_EXT: Record<string, string> = { "video/webm": "webm", "video/mp4": "mp4", "video/quicktime": "mov" };
const AUDIO_EXT: Record<string, string> = { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/webm": "webm" };
const MAX_CLIP = 200 * 1024 * 1024, MAX_AUDIO = 25 * 1024 * 1024, MAX_CLIP_SECONDS = 600;
const mime = (f: File) => String(f.type || "").split(";")[0].trim().toLowerCase();

// Enregistre un clip (caméra / montage) dans la bibliothèque de l'utilisateur, et le publie éventuellement dans la communauté
// avec son son (nouveau son importé avec confirmation des droits, ou son existant réutilisé).
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("clip:" + clientKey(req, access.user.id), 10, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const uid = access.user.id;
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const clip = form.get("clip") as File | null;
  if (!clip || typeof clip === "string" || !VIDEO_EXT[mime(clip)]) return NextResponse.json({ error: "INVALID_VIDEO" }, { status: 400 });
  if (clip.size > MAX_CLIP || clip.size < 1) return NextResponse.json({ error: "VIDEO_TOO_LARGE" }, { status: 400 });

  const publish = form.get("publish") === "true";
  const title = String(form.get("title") || "Mon clip").trim().slice(0, 120) || "Mon clip";
  const description = String(form.get("description") || "").trim().slice(0, 1000);
  const visibility = ["public", "followers", "private"].includes(String(form.get("visibility"))) ? String(form.get("visibility")) : "public";
  const soundMode = String(form.get("soundMode") || "none");
  const eco = await getEconomy();
  if (publish) {
    const settings = await getSettings();
    if (!settings.site.communityEnabled && !settings.site.socialNetworkEnabled) return NextResponse.json({ error: "COMMUNITY_DISABLED" }, { status: 404 });
  }
  if (publish && soundMode !== "none" && !eco.soundsEnabled) return NextResponse.json({ error: "SOUNDS_DISABLED" }, { status: 403 });

  const genId = randomUUID();
  const written: string[] = [];
  const cleanup = async () => { for (const p of written) await deleteStorageFile(p).catch(() => undefined); };
  try {
    const videoPath = `${uid}/videos/clip-${genId}.${VIDEO_EXT[mime(clip)]}`;
    await uploadVideo(videoPath, Buffer.from(await clip.arrayBuffer()), mime(clip)); written.push(videoPath);
    const vp = await probeMedia(localStoragePath(videoPath));
    if (!vp || !vp.hasVideo) { await cleanup(); return NextResponse.json({ error: "INVALID_VIDEO" }, { status: 400 }); }
    if (vp.duration > MAX_CLIP_SECONDS) { await cleanup(); return NextResponse.json({ error: "VIDEO_TOO_LONG" }, { status: 400 }); }

    let newSound: { id: string; path: string; title: string; mime: string; allowReuse: boolean } | null = null;
    let existingSoundId: string | null = null;
    if (publish && soundMode === "own") {
      const audio = form.get("sound") as File | null;
      if (form.get("rightsConfirmed") !== "true") { await cleanup(); return NextResponse.json({ error: "RIGHTS_REQUIRED" }, { status: 400 }); }
      if (!audio || typeof audio === "string" || !AUDIO_EXT[mime(audio)] || audio.size > MAX_AUDIO || audio.size < 1) { await cleanup(); return NextResponse.json({ error: "INVALID_AUDIO" }, { status: 400 }); }
      const sid = randomUUID(); const apath = `${uid}/sounds/${sid}.${AUDIO_EXT[mime(audio)]}`;
      await uploadVideo(apath, Buffer.from(await audio.arrayBuffer()), mime(audio)); written.push(apath);
      const ap = await probeMedia(localStoragePath(apath));
      if (!ap || !ap.hasAudio || ap.duration > 600) { await cleanup(); return NextResponse.json({ error: "INVALID_AUDIO" }, { status: 400 }); }
      const t = String(form.get("soundTitle") || audio.name.replace(/\.[^.]+$/, "") || "Son original").trim().slice(0, 80) || "Son original";
      newSound = { id: sid, path: apath, title: t, mime: mime(audio), allowReuse: form.get("allowReuse") === "true" };
    } else if (publish && soundMode === "existing") {
      const s = await getReusableSound(String(form.get("existingSoundId") || ""), uid, access.isAdmin);
      if (!s) { await cleanup(); return NextResponse.json({ error: "SOUND_UNAVAILABLE" }, { status: 400 }); }
      existingSoundId = s.id;
    }

    await withTransaction(async (c) => {
      await c.query(
        `insert into public.generations (id,user_id,prompt,video_type,target_seconds,scenes,status,video_path,quota_source,job_kind)
         values ($1,$2,$3,'short',$4,1,'done',$5,'none','creator_clip')`,
        [genId, uid, "[CREATOR CLIP] " + title, Math.max(1, Math.ceil(vp.duration)), videoPath]);
      let soundId: string | null = existingSoundId;
      if (newSound) {
        await c.query(`insert into public.sounds (id,owner_id,title,audio_path,mime,allow_reuse,rights_confirmed_at) values ($1,$2,$3,$4,$5,$6,now())`,
          [newSound.id, uid, newSound.title, newSound.path, newSound.mime, newSound.allowReuse]);
        soundId = newSound.id;
      }
      if (existingSoundId) await c.query("update public.sounds set uses_count = uses_count + 1 where id=$1", [existingSoundId]);
      if (publish) {
        await c.query(`insert into public.community_posts (user_id,generation_id,title,description,visibility,status,sound_id) values ($1,$2,$3,$4,$5,'published',$6)`,
          [uid, genId, title, description, visibility, soundId]);
      }
    });
    return NextResponse.json({ ok: true, generationId: genId, published: publish });
  } catch (e: any) {
    await cleanup();
    console.error("[publish-clip]", e?.message || e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
