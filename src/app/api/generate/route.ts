import { quotaPeriodKey } from "@/lib/quota-period";
import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { moderateText } from "@/lib/moderation";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/account/admin";
import { voiceIdAt, isValidVoiceId } from "@/lib/voices";
import { characterIdAt, isValidCharacterId } from "@/lib/characters";
import { consumeFreeTrial, refundFreeTrial } from "@/lib/free-trial";
import { parseNaturalScene } from "@/lib/natural-scene";
import { getReusableSound } from "@/lib/creator-db";

const ADMIN_MONTHLY_CAP = 1_000_000_000;

// All limits, prices and permissions are resolved SERVER-SIDE (access.ts).
// The frontend only sends: prompt, seconds, idempotencyKey.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ ok: false, error: "ACCOUNT_BLOCKED" }, { status: 403 });

  // Rate limit: 20 generation requests / minute per user+IP
  if (!rateLimit("generate:" + clientKey(req, access.user.id), 20, 60_000)) {
    return NextResponse.json({ ok: false, error: "RATE_LIMIT" }, { status: 429 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const { prompt, seconds, idempotencyKey, videoLanguage, inputImage, inputImages, colorScheme, voice, character, sceneMode, persons, personsMeta, imageMode, autoPublish } = body;
  const requestedSoundId = typeof body.soundId === "string" ? body.soundId : "";
  const promptText = typeof prompt === "string" ? prompt.trim() : "";
  if (!promptText) return NextResponse.json({ ok: false, error: "PROMPT_REQUIRED" }, { status: 400 });
  if (promptText.length > 12000) return NextResponse.json({ ok: false, error: "PROMPT_TOO_LONG", maxLength: 12000 }, { status: 413 });
  const admin = createAdminClient();
  const uid = access.user.id;
  const L = access.limits;
  const s = access.settings;
  let selectedSoundId: string | null = null;
  if (requestedSoundId) {
    if (!/^[0-9a-f-]{36}$/i.test(requestedSoundId)) return NextResponse.json({ ok: false, error: "SOUND_UNAVAILABLE" }, { status: 400 });
    const reusableSound = await getReusableSound(requestedSoundId, uid, access.isAdmin);
    if (!reusableSound) return NextResponse.json({ ok: false, error: "SOUND_UNAVAILABLE" }, { status: 400 });
    selectedSoundId = reusableSound.id;
  }

  // 1. Content moderation
  const mod = moderateText(String(prompt || ""));
  if (mod.blocked) {
    await admin.from("moderation_log").insert({
      user_id: uid,
      email: access.user.email,
      prompt: String(prompt).slice(0, 500),
      reason: "blocked term: " + mod.matched
    });
    return NextResponse.json({ ok: false, message: "BLOCKED" });
  }

  // 2. Video length (server-authoritative)
  const secs = Math.floor(Number(seconds));
  // Platform choice is REQUIRED before creating a video
  const validPlats = ["youtube", "tiktok", "reels", "shorts", "feed", "x", "linkedin", "facebook"];
  const plat = String(body.platform || "");
  if (!validPlats.includes(plat)) {
    return NextResponse.json({ ok: false, error: "PLATFORM_REQUIRED" }, { status: 400 });
  }

  const maxAllowedSeconds = (access.isAdmin || access.isModerator) ? L.maxSeconds : Math.min(L.maxSeconds, 10 * 60);
  if (!secs || secs < 10 || secs > maxAllowedSeconds) {
    return NextResponse.json({ ok: false, error: "LENGTH", minSeconds: 10, maxSeconds: maxAllowedSeconds }, { status: 400 });
  }

  // 3. Idempotency: same key -> return the already-created job (no duplicates)
  if (idempotencyKey) {
    const key = String(idempotencyKey).slice(0, 80);
    const { data: existing } = await admin
      .from("generations")
      .select("id")
      .eq("user_id", uid)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true, jobId: existing.id, duplicate: true });
  }

  // 4. Duplicate submission guard: identical prompt still active within 90 s
  const cutoff = new Date(Date.now() - 90_000).toISOString();
  const { data: dup } = await admin
    .from("generations")
    .select("id")
    .eq("user_id", uid)
    .eq("prompt", String(prompt).slice(0, 4000))
    .in("status", ["pending", "processing"])
    .gte("created_at", cutoff)
    .maybeSingle();
  if (dup) return NextResponse.json({ ok: true, jobId: dup.id, duplicate: true });

  // 5. Global daily circuit breaker (platform-wide spend protection)
  if (!(access.isAdmin || access.isModerator)) {
    const { data: globalOk } = await admin.rpc("check_global_daily_cap", {
      p_max: Math.max(1, Math.floor(s.site.maxDailyGenerations) || 2000)
    });
    if (!globalOk) {
      return NextResponse.json({ ok: false, error: "GLOBAL_LIMIT" }, { status: 503 });
    }
  }

  // 6. Dialogue mode: split the story into speaker lines.
  //    Preferred format (what the AI script writer and the manual editor
  //    both produce): one line per turn, "NAME: line text". When a line is
  //    tagged with a name, that EXACT name is kept as the speaker for that
  //    line — no more guessing by position — so names stay correctly
  //    attributed even with many characters speaking in an irregular order.
  //    Falls back to plain sentence-splitting (old behavior, speaker
  //    assigned by rotation) for scripts written without name tags.
  const isDialogue = sceneMode === "dialogue";
  const NAME_LINE = /^([^:\n]{1,30}):\s*(.+)$/;
  let storyLines: string[] = [];
  let lineSpeakers: (string | null)[] = [];
  if (isDialogue) {
    const rawLines = String(prompt).split(/\r?\n+/).map((x) => x.trim()).filter(Boolean);
    const taggedCount = rawLines.filter((l) => NAME_LINE.test(l)).length;
    if (rawLines.length && taggedCount >= Math.ceil(rawLines.length * 0.6)) {
      // Majority of lines are "NAME: text" -> trust the tags.
      for (const l of rawLines.slice(0, 10000)) {
        const m = l.match(NAME_LINE);
        if (m) { lineSpeakers.push(m[1].trim().slice(0, 30)); storyLines.push(m[2].trim()); }
        else { lineSpeakers.push(null); storyLines.push(l); }
      }
    } else {
      storyLines = String(prompt).replace(/\n+/g, ". ").split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean).slice(0, 24);
      lineSpeakers = storyLines.map(() => null);
    }
  }
  const personCount = Math.min(50, Math.max(1, Math.floor(Number(persons)) || 2));

  // Natural-language scene understanding: the request can contain arbitrary
  // visual elements (mannequins, food, animals, objects, vehicles, places,
  // etc.). We parse them once and persist the scene plan with the job so the
  // worker can render the same complete visual specification in every clip.
  const naturalScene = await parseNaturalScene(String(prompt || ""));

  // Natural-language character casting: requests such as “Fraise et Banane
  // sont en couple” automatically resolve to the matching Wesh characters
  // without requiring the user to configure the character panel manually.
  const natural = String(prompt || "").toLowerCase();
  const wantsFraise = /\bfraise\b|\bstrawberr(y|ies)\b/.test(natural);
  const wantsBanane = /\bbanane\b|\bbanana\b|\bbanani\b/.test(natural);
  const naturalCast = (wantsFraise ? ["fraise"] : []).concat(wantsBanane ? ["banani"] : []);
  const naturalCouple = naturalCast.length >= 2 && /\bcouple\b|\bensemble\b|\bmar[iî]\b|\bfemme\b|\bhusband\b|\bwife\b|\bpartners?\b/.test(natural);

  // 6b. Character -> voice assignment. Computed ONCE here and stored on the
  //     job, never recomputed per-scene later — that's what keeps a given
  //     character's voice fixed for the whole video, even across dozens of
  //     scenes and up to 50 characters.
  //     - Manual mode: the Studio already picked a voice per name; keep it
  //       (falling back to a deterministic pick if missing/invalid).
  //     - Automatic mode: no personsMeta was sent, so we derive the cast
  //       from the names actually tagged in the script (see storyLines
  //       parsing below) and assign voices in first-appearance order.
  let finalPersonsMeta: Array<{ name: string; role: string; voice: string; character: string; kind?: string; description?: string }> | null = null;
  if (isDialogue) {
    if (Array.isArray(personsMeta) && personsMeta.length) {
      // Manual mode: keep the user's name/voice/mannequin pairing, sanitized.
      finalPersonsMeta = personsMeta.slice(0, personCount).map((x: any, idx: number) => ({
        name: String(x?.name || "").slice(0, 30),
        role: String(x?.role || "").slice(0, 30),
        voice: isValidVoiceId(x?.voice) ? x.voice : voiceIdAt(idx),
        character: isValidCharacterId(x?.character) ? x.character : characterIdAt(idx)
      }));
    } else {
      // Automatic mode: derive the cast from names actually tagged in the
      // script, in first-appearance order, and assign each one a distinct
      // voice AND a distinct mannequin from their respective catalogs. The
      // two catalogs have different sizes (16 voices, 40 mannequins), so
      // voices start repeating past 16 characters while mannequins keep
      // being distinct up to 40 — always deterministic, never random.
      const uniqueNames = Array.from(new Set(lineSpeakers.filter((x): x is string => !!x))).slice(0, personCount);
      finalPersonsMeta = naturalCast.length
        ? naturalCast.map((character, idx) => ({
            name: character === "fraise" ? "Fraise" : "Banane",
            role: naturalCouple ? "partenaire du couple" : "",
            voice: voiceIdAt(idx),
            character
          }))
        : (uniqueNames.length
          ? uniqueNames.map((name, idx) => ({ name, role: "", voice: voiceIdAt(idx), character: characterIdAt(idx) }))
          : null); // no tagged names at all -> worker's plain rotation fallback applies
    }
  }
  // Keep all naturally detected entities with the job. Named character entries
  // remain compatible with the existing mannequin/voice system; arbitrary
  // objects/foods/animals are carried as visual entities for the worker.
  if (naturalScene.entities.length) {
    const existing = Array.isArray(finalPersonsMeta) ? finalPersonsMeta : [];
    for (const e of naturalScene.entities.slice(0, 50)) {
      if (!existing.some((x) => x.name.toLowerCase() === e.name.toLowerCase())) {
        existing.push({ name: e.name, role: e.role || "", voice: voiceIdAt(existing.length), character: characterIdAt(existing.length), kind: e.kind, description: e.description });
      }
    }
    finalPersonsMeta = existing.slice(0, 50);
  }

  // Automatic Wesh Star IA promotion: when enabled, every generated
  // video ends with the configured spoken CTA. For dialogue jobs it becomes
  // the final speaker line, so it is actually rendered as speech.
  const promotion = s.site?.promotion;
  const promotionCta = promotion?.enabled && promotion?.spoken
    ? String(promotion.cta || "").trim().slice(0, 240)
    : "";
  if (promotionCta) {
    if (isDialogue) {
      const promoSpeaker = finalPersonsMeta?.[0]?.name || "ANNA";
      storyLines.push(promotionCta);
      lineSpeakers.push(promoSpeaker);
    }
  }

  // A natural visual request can intentionally contain one sentence only
  // (for example: “Fraise et Banane sont en couple”). It is still a valid
  // two-character scene, so do not reject it as a too-short dialogue.
  if (isDialogue && storyLines.length < (personCount === 1 || naturalCast.length >= 2 ? 1 : 2)) {
    return NextResponse.json({ ok: false, error: "DIALOGUE_TOO_SHORT" }, { status: 400 });
  }
  // Purchased credit packs are stored as seconds and can unlock generation
  // beyond the subscription's normal duration. Admin/moderator bypass this.
  let consumedHourCredits = 0;
  if (!access.isAdmin && !access.isModerator && secs > L.maxSeconds) {
    const { data: creditOk } = await admin.rpc("consume_hour_credits", { p_user_id: uid, p_seconds: secs });
    if (!creditOk) return NextResponse.json({ ok: false, error: "INSUFFICIENT_HOUR_CREDITS" }, { status: 402 });
    consumedHourCredits = secs;
  }

  // Scene count + ESTIMATED COST CHECK before anything is launched.
  const clipSec = Math.max(3, Math.floor(s.video.clipSeconds) || 10);
  let scenes = isDialogue ? storyLines.length : Math.max(1, Math.ceil(secs / clipSec));
  const hardSceneCap = 25000; // technical safety valve, not a plan limit
  scenes = (access.isAdmin || access.isModerator || consumedHourCredits > 0)
    ? Math.min(scenes, hardSceneCap)
    : Math.min(scenes, L.maxScenes, Math.floor(s.video.maxScenesPerJob) || 800);
  const estCostEur = +(scenes * (s.video.costPerClipEur || 0.5)).toFixed(2);
  if (!access.isAdmin && !consumedHourCredits && estCostEur > L.maxJobCostEur) {
    return NextResponse.json({ ok: false, error: "COST_LIMIT", estCostEur }, { status: 400 });
  }

  // 7. ATOMIC quota consumption: generation count + video time.
  //    1 hour = 3600 seconds. Failed jobs refund BOTH counters.
  //    If the monthly/daily included time is exhausted, purchased hour credits
  //    can be used as the user's extra allowance.
  const month = quotaPeriodKey(access.profile);
  const day = new Date().toISOString().slice(0, 10);
  let quotaFromPlan = false;
  let trialConsumed = false;
  if (!(access.isAdmin || access.isModerator)) {
    if (access.planKey === "free") {
      trialConsumed = await consumeFreeTrial(uid);
      if (!trialConsumed) return NextResponse.json({ ok: false, error: "FREE_TRIAL_EXHAUSTED", message: "Les 2 essais gratuits de 10 secondes ont été utilisés. Choisissez un quota payant pour continuer." }, { status: 402 });
    } else {
    const { data: quotaOk } = await admin.rpc("consume_generation_time_quota", {
      p_user_id: uid,
      p_month: month,
      p_day: day,
      p_seconds: secs,
      p_max_month_seconds: L.monthlySeconds,
      p_max_day_seconds: L.dailySeconds,
      p_max_month_jobs: L.monthlyJobs,
      p_max_day_jobs: L.dailyJobs
    });
    if (quotaOk) {
      quotaFromPlan = true;
    } else {
      const { data: creditOk } = await admin.rpc("consume_hour_credits", { p_user_id: uid, p_seconds: secs });
      if (!creditOk) return NextResponse.json({ ok: false, error: "QUOTA_LIMIT", requiredSeconds: secs }, { status: 429 });
      consumedHourCredits += secs;
    }
    }
  }

  // 8. Per-user concurrency cap (prevents huge parallel scene storms).
  //    Checked AFTER quota consumption; if exceeded we refund immediately.
  const { count: active } = await admin
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .in("status", ["pending", "processing"]);
  if ((active || 0) >= (Math.floor(s.site.maxConcurrentJobsPerUser) || 3)) {
    if (trialConsumed) await refundFreeTrial(uid);
    if (quotaFromPlan) await admin.rpc("refund_generation_time_quota", { p_user_id: uid, p_month: month, p_day: day, p_seconds: secs });
    if (consumedHourCredits) await admin.rpc("refund_hour_credits", { p_user_id: uid, p_seconds: consumedHourCredits });
    return NextResponse.json({ ok: false, error: "CONCURRENT_LIMIT" }, { status: 429 });
  }

  // 9. Create the job (quota already consumed -> always counted exactly once)
  const { data: inserted, error } = await admin
    .from("generations")
    .insert({
      user_id: uid,
      prompt: String(prompt).slice(0, 4000),
      video_language: (() => {
        const v = String(videoLanguage || "auto").trim();
        return /^(auto|[a-z]{2,3}(-[a-z]{2,4})?)$/i.test(v)
          ? v.slice(0, 20).toLowerCase()
          : v.replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, "").slice(0, 40) || "auto";
      })(),
      color_scheme: /^[a-z]{3,12}$/.test(String(colorScheme || "")) ? String(colorScheme).slice(0, 12) : "gelb",
      voice: /^[a-z]{3,16}$/.test(String(voice || "")) ? String(voice).slice(0, 16) : "auto",
      character: /^[a-z]{3,16}$/.test(String(character || "")) ? String(character).slice(0, 16) : "banani",
      scene_mode: isDialogue ? "dialogue" : "single",
      persons: isDialogue ? Math.min(50, Math.max(1, Math.floor(Number(persons)) || 2)) : 1,
      image_mode: imageMode === true,
      auto_publish: (access.isAdmin || (access.isModerator && access.modPerms.autopilot)) && autoPublish === true,
      // Bug fix (kept from before): this used to slice to a hardcoded 5,
      // silently dropping any name past the 5th. Now `finalPersonsMeta` is
      // already computed above (manual pairing or auto-derived), each entry
      // carrying its own persistent `voice` id.
      persons_meta: finalPersonsMeta,
      sound_id: selectedSoundId,
      natural_scene: naturalScene,
      auto_visual_image: naturalScene.entities.length > 0,
      dialogue_persons: isDialogue ? personCount : 2,
      dialogue_lines: isDialogue ? storyLines : null,
      line_speakers: isDialogue ? lineSpeakers : null,
      promotion_cta: promotionCta || null,
      input_image: typeof inputImage === "string" && inputImage.startsWith(uid + "/inputs/") ? inputImage.slice(0, 200) : null,
      input_images: Array.isArray(inputImages)
        ? inputImages.slice(0, 10).filter((x: any) => typeof x === "string" && x.startsWith(uid + "/inputs/")).map((x: string) => x.slice(0, 200))
        : null,
      video_type: secs <= 60 ? "short" : "long",
      target_platform: plat,
      target_seconds: secs,
      scenes,
      clips: [],
      status: "pending",
      quota_source: trialConsumed ? "trial" : (quotaFromPlan ? "plan" : (consumedHourCredits > 0 ? "credits" : (access.isAdmin || access.isModerator ? "staff" : "none"))),
      quota_seconds: (trialConsumed || quotaFromPlan || consumedHourCredits > 0) ? secs : 0,
      quota_period: quotaFromPlan ? month : null,
      idempotency_key: idempotencyKey ? String(idempotencyKey).slice(0, 80) : null
    })
    .select("id")
    .single();

  if (error) {
    // Unique violation on idempotency key (concurrent double-submit) -> return existing
    if (error.code === "23505" && idempotencyKey) {
      const { data: existing } = await admin
        .from("generations")
        .select("id")
        .eq("user_id", uid)
        .eq("idempotency_key", String(idempotencyKey).slice(0, 80))
        .maybeSingle();
      if (existing) {
        if (trialConsumed) await refundFreeTrial(uid);
        if (quotaFromPlan) await admin.rpc("refund_generation_time_quota", { p_user_id: uid, p_month: month, p_day: day, p_seconds: secs });
        if (consumedHourCredits) await admin.rpc("refund_hour_credits", { p_user_id: uid, p_seconds: consumedHourCredits });
        return NextResponse.json({ ok: true, jobId: existing.id, duplicate: true });
      }
    }
    if (trialConsumed) await refundFreeTrial(uid);
    if (quotaFromPlan) await admin.rpc("refund_generation_time_quota", { p_user_id: uid, p_month: month, p_day: day, p_seconds: secs });
    if (consumedHourCredits) await admin.rpc("refund_hour_credits", { p_user_id: uid, p_seconds: consumedHourCredits });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "QUEUED", jobId: inserted?.id, scenes, estCostEur });
}
