import { isCronAuthorized } from "@/lib/cron-auth";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/account/admin";
import { getSettings } from "@/lib/settings";
import { createClip, getClip } from "@/lib/video-provider";
import { uploadVideo, createSignedVideoUrl, downloadFile, publicVideoUrl } from "@/lib/storage";
import { concatClips, ffmpegEnabled } from "@/lib/assembly";
import { publishVideo, configuredPlatforms, getPublishDurationLimitSeconds } from "@/lib/publishers";
import { voiceDesc, voiceIdAt } from "@/lib/voices";
import { characterDesc } from "@/lib/characters";
import { sceneVisualPrompt } from "@/lib/natural-scene";
import { getReusableSound } from "@/lib/creator-db";
import { readStorageFile } from "@/lib/storage";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);
async function addCommunitySound(admin: any, job: any, video: Buffer): Promise<Buffer> {
  if (!job.sound_id) return video;
  if (!ffmpegEnabled()) throw new Error("Le serveur doit avoir FFmpeg activé pour ajouter une musique de fond.");
  const sound = await getReusableSound(String(job.sound_id), String(job.user_id), false);
  if (!sound) throw new Error("Le son choisi n'est plus disponible ou n'est plus réutilisable.");
  const audio = await readStorageFile(String(sound.audio_path));
  const dir = await mkdtemp(path.join(os.tmpdir(), "wesh-sound-"));
  const inputPath = path.join(dir, "input.mp4"), audioPath = path.join(dir, "music.bin"), outputPath = path.join(dir, "output.mp4");
  try {
    await writeFile(inputPath, video); await writeFile(audioPath, audio);
    // Mix background music at 18% while preserving dialogue; if the source has no audio, use the music as its audio track.
    const probe = await execFileAsync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=index", "-of", "csv=p=0", inputPath], { timeout: 30_000 });
    const hasAudio = !!probe.stdout.trim();
    const args = hasAudio
      ? ["-y", "-i", inputPath, "-stream_loop", "-1", "-i", audioPath, "-filter_complex", "[0:a]volume=1[a0];[1:a]volume=0.18[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]", "-map", "0:v:0", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", outputPath]
      : ["-y", "-i", inputPath, "-stream_loop", "-1", "-i", audioPath, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", outputPath];
    await execFileAsync("ffmpeg", args, { timeout: 10 * 60_000, maxBuffer: 10 * 1024 * 1024 });
    await admin.from("sounds").update({ uses_count: Number(sound.uses_count || 0) + 1 }).eq("id", sound.id);
    return await readFile(outputPath);
  } finally { await rm(dir, { recursive: true, force: true }).catch(() => undefined); }
}

// Queue worker: call this endpoint from a cron/systemd timer on your own server.
// minute. Claims ONE job atomically (FOR UPDATE SKIP LOCKED). Bounded retries:
// - job-level attempts cap (no infinite loops)
// - per-scene attempts cap with resubmission
// - scene timeout (stuck predictions are failed and resubmitted/failed)
// - quota is REFUNDED when a job permanently fails (failed jobs don't eat quota)
export async function GET(req: Request) { return processQueue(req); }
export async function POST(req: Request) { return processQueue(req); }

const BATCH = 25; // max new scene submissions per invocation
const now = () => new Date().toISOString();

const DIALOGUE_CAST = [
  { name: "ANNA", desc: "adult female, warm voice" },
  { name: "MAX", desc: "adult male, deep voice" },
  { name: "LUNA", desc: "young female, bright voice" },
  { name: "KAI", desc: "adult male, calm voice" },
  { name: "MIA", desc: "young female, soft voice" },
  { name: "TOM", desc: "adult male, energetic voice" },
  { name: "ZOE", desc: "young female, clear voice" },
  { name: "LEO", desc: "adult male, low raspy voice" },
  { name: "NINA", desc: "adult female, playful voice" },
  { name: "FELIX", desc: "young male, curious voice" }
];
// MAX_CAST: technical ceiling on distinct named speakers. Above this,
// generative video/voice models lose per-character consistency across a
// video, so we cap here rather than silently degrading quality.
const MAX_CAST = 50;
const castFor = (n: number) => Array.from({ length: n }, (_, i) => DIALOGUE_CAST[i % DIALOGUE_CAST.length]);
const dialoguePrompt = (job: any, i: number) => {
  const line = (job.dialogue_lines || [])[i] || "";
  const n = Math.min(MAX_CAST, Math.max(1, Math.floor((job as any).persons) || Math.floor((job as any).dialogue_persons) || 2));
  const cast = castFor(n);
  const meta: Array<{ name?: string; role?: string; voice?: string; character?: string }> = (job as any).persons_meta || [];
  const lineSpeakers: (string | null)[] = (job as any).line_speakers || [];
  const taggedName = lineSpeakers[i];

  let speakerName: string;
  let speakerDesc: string;
  if (taggedName) {
    // The script explicitly named the speaker for this line (e.g. "KEVIN:
    // ..."). Voice AND mannequin/appearance both come from persons_meta[] —
    // assigned ONCE at job creation (src/app/api/generate/route.ts) and
    // never recomputed here — so the same name always resolves to the same
    // voice AND the same appearance for every single scene of the video, in
    // manual AND automatic mode, for up to 50 characters.
    const uniqueNames = Array.from(new Set(lineSpeakers.filter(Boolean))) as string[];
    const idx = Math.max(0, uniqueNames.indexOf(taggedName));
    const known = meta.find((m) => m?.name && m.name === taggedName);
    speakerName = taggedName;
    const appearance = characterDesc((known as any)?.character, idx);
    const voice = voiceDesc((known as any)?.voice, idx);
    speakerDesc = (known?.role ? String(known.role) + " — " : "") + "appearance: " + appearance + "; voice: " + voice;
  } else {
    const mc = meta[i % n];
    const fallback = cast[i % n];
    speakerName = (mc && mc.name) ? String(mc.name) : fallback.name;
    speakerDesc = (mc && mc.role) ? String(mc.role) : fallback.desc;
  }
  const multi = n > 1;
  const naturalCouple = meta.some((m: any) => m?.character === "fraise") && meta.some((m: any) => m?.character === "banani");
  const visualRelationship = naturalCouple
    ? "Visual composition: Fraise (strawberry mascot) and Banane (banana mascot) are both clearly visible together as a couple/partners in the same scene; preserve both distinct appearances throughout the clip. "
    : "";
  const naturalVisual = sceneVisualPrompt(job.natural_scene || { entities: [], relationships: [], actions: [], setting: "", visualStyle: "" });
  return (naturalVisual ? naturalVisual + "\n" : "") + visualRelationship + (multi ? "Group dialogue scene with " + n + " speakers in one continuous location. " : "Solo monologue scene. ") +
    "Each speaker has a DISTINCT voice. " +
    "Speaker \"" + speakerName + "\" (" + speakerDesc + ") says exactly: \"" + line + "\" — " +
    "accurate lip-sync, natural turn-taking, correct speaker attribution, no overlap, complete sentence. " +
    (job.video_language && job.video_language !== "auto" ? "Spoken language: " + job.video_language + ". " : "") +
    (job.color_scheme ? "Color scheme: " + job.color_scheme + ". " : "") +
    "Subtle camera change between lines. Line " + (i + 1) + " of " + job.scenes + ".";
};
const scenePrompt = (job: any, i: number) => {
  const naturalVisual = sceneVisualPrompt(job.natural_scene || { entities: [], relationships: [], actions: [], setting: "", visualStyle: "" });
  if (job.scene_mode === "dialogue") return dialoguePrompt(job, i);
  const base = (naturalVisual ? naturalVisual + "\n" : "") + job.prompt +
    (job.video_language && job.video_language !== 'auto' ? ' (spoken language: ' + job.video_language + ')' : '') +
    (job.color_scheme && job.color_scheme !== 'gelb' ? ' (color scheme: ' + job.color_scheme + ')' : '') +
    (job.voice && job.voice !== 'auto' ? ' (narrator voice: ' + job.voice + ')' : '') +
    (job.character && job.character !== 'banani' ? ' (main character: ' + job.character + ')' : '') +
    "\n\nScene " + (i + 1) + " of " + job.scenes +
    " (each scene is one continuous clip of a longer video).";
  // For non-dialogue videos, make the final generated scene the spoken
  // promotional ending. This keeps the CTA at the end without creating an
  // extra scene or silently increasing the requested video duration.
  const cta = String(job.promotion_cta || "").trim();
  if (cta && i === job.scenes - 1) {
    return base + "\n\nFINAL PROMOTIONAL ENDING: At the end of this final scene, clearly say exactly: \"" +
      cta.replace(/"/g, '\\\"') +
      "\". This is the final spoken call-to-action. Do not place it at the beginning.";
  }
  return base;
};

async function refundOnce(admin: any, job: any) {
  // ATOMIC refund claim: the conditional UPDATE flips quota_refunded from
  // false -> true. Exactly one concurrent worker/process can win the race;
  // everyone else gets 0 rows back and refunds nothing.
  const { data: claimed } = await admin
    .from("generations")
    .update({ quota_refunded: true })
    .eq("id", job.id)
    .eq("quota_refunded", false)
    .select("id");
  if (!claimed || claimed.length === 0) return; // already refunded
  const created = new Date(job.created_at);
  const quotaSeconds = Number(job.quota_seconds || job.target_seconds || 0);
  if (job.quota_source === "trial") {
    await admin.rpc("refund_free_trial", { p_user_id: job.user_id });
  } else if (job.quota_source === "credits") {
    await admin.rpc("refund_hour_credits", { p_user_id: job.user_id, p_seconds: quotaSeconds });
  } else if (job.quota_source === "plan") {
    await admin.rpc("refund_generation_time_quota", {
      p_user_id: job.user_id,
      p_month: String(job.quota_period || created.toISOString().slice(0, 7)),
      p_day: created.toISOString().slice(0, 10),
      p_seconds: quotaSeconds
    });
  }
}

async function failJob(admin: any, job: any, error: string) {
  await refundOnce(admin, job);
  await admin.from("generations")
    .update({ status: "failed", error: error.slice(0, 800), locked_at: null, updated_at: now() })
    .eq("id", job.id);
}


function isRetryableSocialError(error: string): boolean {
  const e = String(error || "").toLowerCase();
  return /(429|rate.?limit|too many requests|408|409|425|500|502|503|504|timeout|timed out|temporarily unavailable|service unavailable|network|fetch failed|econnreset|etimedout|enotfound|connection reset)/i.test(e);
}

const SOCIAL_RETRY_DELAYS_MS = [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

function nextSocialRetry(attempts: number): string {
  const delay = SOCIAL_RETRY_DELAYS_MS[Math.min(Math.max(attempts - 1, 0), SOCIAL_RETRY_DELAYS_MS.length - 1)];
  return new Date(Date.now() + delay).toISOString();
}

async function processSocialRetry(admin: any): Promise<any> {
  const { data: claimed } = await admin.rpc("claim_social_publication_job");
  const job = Array.isArray(claimed) ? claimed[0] : null;
  if (!job) return { processed: false };

  try {
    const result = await publishVideo(job.video_url, job.caption, [job.platform], job.user_id, !!job.fallback_global);
    const r = result[0];
    if (r?.ok) {
      await admin.from("social_publications").update({
        status: "published", error: null, published_url: r.url || null,
        locked_at: null, updated_at: now()
      }).eq("id", job.id);
      await admin.from("generations").update({
        publish_status: { [job.platform]: { ok: true, url: r.url || null } }, updated_at: now()
      }).eq("id", job.generation_id);
      return { processed: true, id: job.id, platform: job.platform, status: "published" };
    }

    const attempts = Number(job.attempts || 0);
    const retryable = isRetryableSocialError(r?.error || "unknown social publishing error");
    if (retryable && attempts < Number(job.max_attempts || 3)) {
      await admin.from("social_publications").update({
        status: "pending", error: (r?.error || "unknown error").slice(0, 1200),
        next_retry_at: nextSocialRetry(attempts), locked_at: null, updated_at: now()
      }).eq("id", job.id);
      return { processed: true, id: job.id, platform: job.platform, status: "scheduled_retry", attempts };
    }

    await admin.from("social_publications").update({
      status: "failed", error: (r?.error || "unknown error").slice(0, 1200),
      next_retry_at: null, locked_at: null, updated_at: now()
    }).eq("id", job.id);
    return { processed: true, id: job.id, platform: job.platform, status: "failed" };
  } catch (e: any) {
    const attempts = Number(job.attempts || 0);
    const message = String(e?.message || "social retry worker error");
    if (isRetryableSocialError(message) && attempts < Number(job.max_attempts || 3)) {
      await admin.from("social_publications").update({
        status: "pending", error: message.slice(0, 1200),
        next_retry_at: nextSocialRetry(attempts), locked_at: null, updated_at: now()
      }).eq("id", job.id);
    } else {
      await admin.from("social_publications").update({
        status: "failed", error: message.slice(0, 1200), next_retry_at: null,
        locked_at: null, updated_at: now()
      }).eq("id", job.id);
    }
    return { processed: true, id: job.id, platform: job.platform, status: "failed" };
  }
}

async function maybePublish(admin: any, job: any, settings: any, videoUrl: string) {
  if (!job.auto_publish) return;
  const { data: owner } = await admin.from("profiles").select("role").eq("id", job.user_id).maybeSingle();
  const fallbackGlobal = owner?.role === "admin";
  let platforms = job.auto_publish_all_platforms === true
    ? await configuredPlatforms(settings, job.user_id, fallbackGlobal)
    : (job.autopilot_platform
      ? [String(job.autopilot_platform)]
      : await configuredPlatforms(settings, job.user_id, fallbackGlobal));
  if (!platforms.length) return;
  // A single render may be cross-posted only to networks whose configured
  // maximum duration accepts this exact video. Format/account/API checks still
  // happen in each publisher and are reported independently.
  if (job.auto_publish_all_platforms === true) {
    const seconds = Number(job.target_seconds || 0);
    const checks = await Promise.all(platforms.map(async (platform: string) => ({
      platform,
      maxSeconds: await getPublishDurationLimitSeconds(platform, job.user_id, fallbackGlobal)
    })));
    platforms = checks.filter((x) => seconds <= x.maxSeconds).map((x) => x.platform);
    if (!platforms.length) {
      await admin.from("generations").update({ publish_status: { cross_post: { ok: false, error: "Aucune plateforme activée n'accepte la durée de cette vidéo." } }, updated_at: now() }).eq("id", job.id);
      return;
    }
  }
  const promotion = settings.site?.promotion;
  let caption = job.prompt.slice(0, 150);
  if (promotion?.enabled && promotion?.cta) caption += "\n\n" + String(promotion.cta).slice(0, 500);
  if (promotion?.enabled && promotion?.url) caption += "\n" + String(promotion.url).slice(0, 500);
  const results = await publishVideo(videoUrl, caption, platforms, job.user_id, fallbackGlobal);
  const status: Record<string, any> = {};
  for (const r of results) {
    status[r.platform] = r;
    const retryable = !r.ok && isRetryableSocialError(r.error || "");
    await admin.from("social_publications").upsert({
      generation_id: job.id, user_id: job.user_id, platform: r.platform,
      status: r.ok ? "published" : (retryable ? "pending" : "failed"),
      attempts: 1, max_attempts: 3, next_retry_at: !r.ok && retryable ? nextSocialRetry(1) : null,
      error: r.ok ? null : (r.error || "unknown error").slice(0, 1200),
      published_url: r.url || null, video_url: videoUrl, caption,
      fallback_global: fallbackGlobal, locked_at: null, updated_at: now()
    }, { onConflict: "generation_id,platform" });
  }
  await admin.from("generations").update({ publish_status: status, updated_at: now() }).eq("id", job.id);
}

async function maybePublishToCommunity(admin: any, job: any, settings: any) {
  // External social posting and Wesh Star community publishing are independent.
  // This runs only when the owner explicitly enabled community auto-publishing
  // on the job and the site administrator has enabled the community feature.
  if (job.auto_publish_to_community !== true || settings.site?.communityEnabled !== true && settings.site?.socialNetworkEnabled !== true) return;
  const title = String(job.prompt || "Ma vidéo").split("\n").map((x: string) => x.trim()).find(Boolean)?.slice(0, 120) || "Ma vidéo";
  const platform = String(job.autopilot_platform || "").trim();
  const description = ("Créée automatiquement avec Wesh Star IA" + (platform ? ` · destination sociale : ${platform}` : "")).slice(0, 1000);
  const { error } = await admin.from("community_posts").upsert({
    user_id: job.user_id,
    generation_id: job.id,
    title,
    description,
    visibility: "public",
    status: "published",
    updated_at: now()
  }, { onConflict: "user_id,generation_id" });
  if (error) {
    // Do not retry or invalidate a finished video because a community insert failed.
    // The admin can inspect server logs and retry publication without regenerating the video.
    console.error("[Wesh Star IA] Community auto-publish failed", { generationId: job.id, error: error.message });
  }
}

async function processQueue(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  // Social publication retries run independently of video generation and do
  // not consume generation quota. One eligible publication is claimed per
  // worker tick using FOR UPDATE SKIP LOCKED.
  await processSocialRetry(admin);
  const { data: claimed } = await admin.rpc("claim_generation_job");
  const job = Array.isArray(claimed) ? claimed[0] : null;
  if (!job) return NextResponse.json({ ok: true, message: "queue empty" });

  const settings = await getSettings();
  const v = settings.video;
  const maxAttempts = Math.max(1, Math.floor(v.maxAttempts) || 5);
  const maxSceneAttempts = Math.max(1, Math.floor(v.maxSceneAttempts) || 3);
  const sceneTimeoutMs = (Math.max(1, Math.floor(v.sceneTimeoutMinutes) || 30)) * 60_000;

  try {
    // Hard stop: too many worker attempts (e.g. persistent provider errors)
    if ((job.attempts || 0) >= maxAttempts) {
      await failJob(admin, job, "Aborted: maximum attempts (" + maxAttempts + ") reached.");
      return NextResponse.json({ ok: false, failed: job.id, reason: "max_attempts" });
    }

    const clips: any[] = Array.isArray(job.clips) ? job.clips : [];
    let changed = false;

    // Phase 1: submit new scenes (bounded batch)
    let submitted = 0;
    for (let i = 0; i < job.scenes; i++) {
      if (clips[i] || submitted >= BATCH) continue;
      let imgUrl: string | undefined;
      const imgs: string[] = Array.isArray((job as any).input_images) && (job as any).input_images.length
        ? (job as any).input_images
        : job.input_image ? [job.input_image] : [];
      const pick = imgs.length ? imgs[i % imgs.length] : null;
      if (pick) {
        try { imgUrl = await createSignedVideoUrl(pick, 3600); } catch {}
      }
      const pred = await createClip(scenePrompt(job, i), imgUrl, Math.max(3, Math.floor(v.clipSeconds) || 5), Boolean((job as any).auto_visual_image), String((job as any).target_platform || "tiktok"));
      clips[i] = { index: i, predictionId: pred.id, status: "processing", attempts: 1, startedAt: now() };
      submitted++;
      changed = true;
    }

    // Phase 2: poll running scenes (with timeout + bounded per-scene retries)
    let allDone = true;
    for (const scene of clips) {
      if (!scene) { allDone = false; continue; }
      if (scene.status !== "processing") continue;

      const startedAt = new Date(scene.startedAt || job.created_at).getTime();
      let r: any;
      if (Date.now() - startedAt > sceneTimeoutMs) {
        r = { status: "failed", error: "scene timeout after " + v.sceneTimeoutMinutes + " min" };
      } else {
        r = await getClip(scene.predictionId);
      }

      if (r.status === "succeeded" && r.videoUrl) {
        const buf = await downloadFile(r.videoUrl);
        const path = job.id + "/scene-" + scene.index + ".mp4";
        await uploadVideo(path, buf);
        scene.status = "done";
        scene.path = path;
        changed = true;
      } else if (r.status === "failed" || r.status === "canceled") {
        const att = (scene.attempts || 1) + 1;
        if (att <= maxSceneAttempts) {
          // Bounded resubmission of this scene only. The job is NOT done:
          // final assembly must wait until every scene is really finished.
          const pred = await createClip(scenePrompt(job, scene.index), undefined, Math.max(3, Math.floor(v.clipSeconds) || 5), Boolean((job as any).auto_visual_image), String((job as any).target_platform || "tiktok"));
          scene.predictionId = pred.id;
          scene.attempts = att;
          scene.startedAt = now();
          changed = true;
          allDone = false;
        } else {
          await failJob(admin, job,
            "Scene " + (scene.index + 1) + " failed after " + maxSceneAttempts + " attempts: " + (r.error || r.status));
          return NextResponse.json({ ok: false, failed: job.id });
        }
      } else {
        allDone = false; // still rendering -> next cron tick
      }
    }
    if (clips.length < job.scenes) allDone = false;

    if (changed) {
      await admin.from("generations")
        .update({ clips, updated_at: now() })
        .eq("id", job.id);
    }
    if (!allDone) return NextResponse.json({ ok: true, processed: job.id, step: "scene" });

    // Phase 3: finalize
    if (job.scenes === 1) {
      let finalPath = clips[0].path;
      if (job.sound_id) {
        const source = await downloadFile(await createSignedVideoUrl(clips[0].path, 120));
        const mixed = await addCommunitySound(admin, job, source);
        finalPath = job.id + "/final-with-sound.mp4";
        await uploadVideo(finalPath, mixed);
      }
      await admin.from("generations")
        .update({ status: "done", video_path: finalPath, locked_at: null, updated_at: now() })
        .eq("id", job.id);
      await maybePublish(admin, job, settings, publicVideoUrl(finalPath));
      await maybePublishToCommunity(admin, job, settings);
      return NextResponse.json({ ok: true, processed: job.id, step: "finalize" });
    }

    if (!ffmpegEnabled()) {
      await failJob(admin, job,
        "Multi-scene assembly requires ffmpeg on the server (ENABLE_FFMPEG=true on VPS/Docker). Individual clips are saved in the native Wesh Star IA server storage.");
      return NextResponse.json({ ok: false, failed: job.id });
    }

    const buffers = [];
    for (const c of clips) {
      buffers.push(await downloadFile(await createSignedVideoUrl(c.path, 120)));
    }
    let finalBuf = await concatClips(buffers);
    if (job.sound_id) finalBuf = await addCommunitySound(admin, job, finalBuf);
    const fpath = job.id + (job.sound_id ? "/final-with-sound.mp4" : "/final.mp4");
    await uploadVideo(fpath, finalBuf);
    await admin.from("generations")
      .update({ status: "done", video_path: fpath, locked_at: null, updated_at: now() })
      .eq("id", job.id);
    await maybePublish(admin, job, settings, publicVideoUrl(fpath));
    await maybePublishToCommunity(admin, job, settings);
    return NextResponse.json({ ok: true, processed: job.id, step: "assembled" });
  } catch (e: any) {
    // Bounded retry: unlock for another attempt until the cap, then fail+refund
    const admin2 = createAdminClient();
    const attempts = (job.attempts || 0) + 1;
    if (attempts >= maxAttempts) {
      await failJob(admin2, { ...job, attempts }, e.message?.slice(0, 400) || "worker error");
    } else {
      await admin2.from("generations")
        .update({ status: "pending", locked_at: null, attempts, updated_at: now() })
        .eq("id", job.id);
    }
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
