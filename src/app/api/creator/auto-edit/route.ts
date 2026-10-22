import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir } from "fs/promises";
import path from "path";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { uploadVideo, deleteStorageFile, localStoragePath } from "@/lib/storage";
import { probeMedia } from "@/lib/media-probe";
import { buildMontageArgs, type MontageInput } from "@/lib/auto-montage";
import { effectById } from "@/lib/creator-effects";
import { getEconomy, getReusableSound, unlockedEffects } from "@/lib/creator-db";

export const runtime = "nodejs";
const run = promisify(execFile);
const VIDEO_EXT: Record<string, string> = { "video/webm": "webm", "video/mp4": "mp4", "video/quicktime": "mov" };
const AUDIO_EXT: Record<string, string> = { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/webm": "webm" };
const mime = (f: File) => String(f.type || "").split(";")[0].trim().toLowerCase();
const MAX_GLOBAL_JOBS = 2;
let activeJobs = 0; // par processus : limite la charge CPU de FFmpeg

// Montage automatique réel (FFmpeg côté serveur) : coupe, recadrage 9:16, assemblage, effet, musique. Traitement en arrière-plan.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("montage:" + clientKey(req, access.user.id), 5, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const uid = access.user.id;
  const eco = await getEconomy();
  if (!eco.autoEdit.enabled) return NextResponse.json({ error: "AUTO_EDIT_DISABLED" }, { status: 403 });
  if (activeJobs >= MAX_GLOBAL_JOBS) return NextResponse.json({ error: "SERVER_BUSY" }, { status: 503 });
  const running = await query("select count(*)::int n from public.generations where user_id=$1 and job_kind='auto_montage' and status='processing' and updated_at > now() - interval '20 minutes'", [uid]);
  if (running.rows[0].n >= 1) return NextResponse.json({ error: "JOB_ALREADY_RUNNING" }, { status: 429 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const files = form.getAll("clips").filter((f): f is File => typeof f !== "string");
  if (files.length < 1 || files.length > eco.autoEdit.maxClips) return NextResponse.json({ error: "CLIP_COUNT", max: eco.autoEdit.maxClips }, { status: 400 });
  if (files.some((f) => !VIDEO_EXT[mime(f)] || f.size < 1 || f.size > 200 * 1024 * 1024)) return NextResponse.json({ error: "INVALID_VIDEO" }, { status: 400 });
  const secondsPerClip = Math.max(1, Math.min(eco.autoEdit.maxSecondsPerClip, Math.floor(Number(form.get("secondsPerClip")) || 5)));

  // Effet : doit exister, être actif, et être gratuit OU débloqué (staff : libre). Contrôle côté serveur.
  const effectId = String(form.get("effectId") || "normal");
  const eff = eco.effects.find((e) => e.id === effectId && e.active); const def = effectById(effectId);
  if (!eff || !def) return NextResponse.json({ error: "EFFECT_UNAVAILABLE" }, { status: 400 });
  if (eff.tier === "paid" && !(access.isAdmin || access.isModerator) && !(await unlockedEffects(uid)).includes(eff.id)) return NextResponse.json({ error: "EFFECT_LOCKED" }, { status: 402 });

  const jobId = randomUUID();
  const temp: string[] = [];
  const cleanupTemp = async () => { for (const p of temp) await deleteStorageFile(p).catch(() => undefined); };
  try {
    const inputs: MontageInput[] = [];
    for (let i = 0; i < files.length; i++) {
      const rel = `${uid}/inputs/montage-${jobId}-${i}.${VIDEO_EXT[mime(files[i])]}`;
      await uploadVideo(rel, Buffer.from(await files[i].arrayBuffer()), mime(files[i])); temp.push(rel);
      const pr = await probeMedia(localStoragePath(rel));
      if (!pr || !pr.hasVideo || pr.duration <= 0) { await cleanupTemp(); return NextResponse.json({ error: "INVALID_VIDEO", index: i }, { status: 400 }); }
      inputs.push({ path: localStoragePath(rel), hasAudio: pr.hasAudio, duration: pr.duration });
    }
    let soundAbs: string | null = null;
    const soundMode = String(form.get("soundMode") || "none");
    if (soundMode === "own") {
      const audio = form.get("sound") as File | null;
      if (form.get("rightsConfirmed") !== "true") { await cleanupTemp(); return NextResponse.json({ error: "RIGHTS_REQUIRED" }, { status: 400 }); }
      if (!audio || typeof audio === "string" || !AUDIO_EXT[mime(audio)] || audio.size > 25 * 1024 * 1024) { await cleanupTemp(); return NextResponse.json({ error: "INVALID_AUDIO" }, { status: 400 }); }
      const rel = `${uid}/inputs/montage-${jobId}-music.${AUDIO_EXT[mime(audio)]}`;
      await uploadVideo(rel, Buffer.from(await audio.arrayBuffer()), mime(audio)); temp.push(rel);
      const ap = await probeMedia(localStoragePath(rel));
      if (!ap || !ap.hasAudio) { await cleanupTemp(); return NextResponse.json({ error: "INVALID_AUDIO" }, { status: 400 }); }
      soundAbs = localStoragePath(rel);
    } else if (soundMode === "existing") {
      const s = await getReusableSound(String(form.get("existingSoundId") || ""), uid, access.isAdmin);
      if (!s) { await cleanupTemp(); return NextResponse.json({ error: "SOUND_UNAVAILABLE" }, { status: 400 }); }
      soundAbs = localStoragePath(s.audio_path); // fichier du son : lecture seule, jamais supprimé
      await query("update public.sounds set uses_count = uses_count + 1 where id=$1", [s.id]);
    }
    const soundVolume = Math.max(0, Math.min(100, Number(form.get("soundVolume")) || 60)) / 100;

    await query(`insert into public.generations (id,user_id,prompt,video_type,target_seconds,scenes,status,quota_source,job_kind)
                 values ($1,$2,$3,'short',$4,1,'processing','none','auto_montage')`, [jobId, uid, "[MONTAGE AUTO] " + files.length + " clip(s)", secondsPerClip * files.length]);

    const outRel = `${uid}/videos/montage-${jobId}.mp4`;
    const args = buildMontageArgs({ inputs, secondsPerClip, soundPath: soundAbs, soundVolume, effectFilter: def.ffmpeg, output: localStoragePath(outRel) });
    activeJobs++;
    void (async () => {
      try {
        await mkdir(path.dirname(localStoragePath(outRel)), { recursive: true });
        await run("ffmpeg", args, { timeout: 10 * 60_000, maxBuffer: 10 * 1024 * 1024 });
        const op = await probeMedia(localStoragePath(outRel));
        if (!op || !op.hasVideo) throw new Error("sortie invalide");
        await query("update public.generations set status='done', video_path=$2, target_seconds=$3, updated_at=now() where id=$1", [jobId, outRel, Math.max(1, Math.ceil(op.duration))]);
      } catch (e: any) {
        console.error("[auto-montage]", jobId, String(e?.stderr || e?.message || e).slice(0, 500));
        await deleteStorageFile(outRel).catch(() => undefined);
        await query("update public.generations set status='failed', error=$2, updated_at=now() where id=$1", [jobId, "Le montage a échoué. Vérifie tes vidéos et réessaie."]).catch(() => undefined);
      } finally { activeJobs--; await cleanupTemp(); }
    })();
    return NextResponse.json({ ok: true, jobId });
  } catch (e: any) {
    await cleanupTemp();
    console.error("[auto-montage-start]", e?.message || e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
