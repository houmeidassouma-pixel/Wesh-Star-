import { isCronAuthorized } from "@/lib/cron-auth";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/account/admin";
import { getSettings } from "@/lib/settings";
import { configuredPlatforms } from "@/lib/publishers";
import { getTrendingTopic } from "@/lib/trends";
import { voiceIdAt } from "@/lib/voices";
import { characterIdAt } from "@/lib/characters";
import { buildOptimizationContext } from "@/lib/social-intelligence";
import { allowedDurationsForPlatform, AUTOPILOT_DURATION_OPTIONS_SECONDS } from "@/lib/autopilot-duration";
import { getPublishDurationLimitSeconds } from "@/lib/publishers";

const DAY_EMOTIONS = ["romantique","drôle","triste","dramatique","romantique","drôle","neutre"];
const THEMES: Record<string, string[]> = {
  romantique: ["une rencontre inattendue", "un message d'amour envoyé au mauvais moment", "deux personnes qui se retrouvent après des années"],
  drôle: ["un malentendu hilarant", "un voisin qui fait une chose complètement absurde", "une journée normale qui tourne au chaos"],
  triste: ["un adieu difficile", "un souvenir qui revient soudainement", "une amitié qui doit faire face à une séparation"],
  dramatique: ["un secret découvert au dernier moment", "une décision qui change toute une famille", "un choix impossible avant une grande révélation"],
  colère: ["une dispute qui révèle une vérité", "une injustice qui provoque une réaction", "un conflit entre deux amis"],
  peur: ["un bruit étrange dans une maison vide", "un appel mystérieux au milieu de la nuit", "une découverte inquiétante"],
  neutre: ["une petite histoire du quotidien", "une situation relatable de la vie moderne", "une surprise simple mais touchante"]
};

const FALLBACK_PROFILES: Record<string, { videosPerDay: number; hours: number[]; durationsSeconds?: number[]; trendDriven: boolean }> = {
  tiktok: { videosPerDay: 3, hours: [], durationsSeconds: [60,120,300,600], trendDriven: true },
  facebook: { videosPerDay: 3, hours: [1,2,3,4], durationsSeconds: [60,120,300,600,1800,3600,7200,10800,14400], trendDriven: true },
  youtube: { videosPerDay: 3, hours: [1,2,3,4,5,6], durationsSeconds: [60,120,300,600,1800,3600,7200,10800,14400,18000,21600], trendDriven: true },
  snapchat: { videosPerDay: 3, hours: [], durationsSeconds: [60,120,300,600], trendDriven: true },
  instagram: { videosPerDay: 3, hours: [], durationsSeconds: [60,120,300,600,900], trendDriven: true },
  twitch: { videosPerDay: 1, hours: [1,2,3,4,5,6], durationsSeconds: [3600,7200,10800,14400,18000,21600], trendDriven: true },
  x: { videosPerDay: 2, hours: [], durationsSeconds: [60,120,300,600], trendDriven: true },
  linkedin: { videosPerDay: 1, hours: [], durationsSeconds: [60,120,300,600,1800], trendDriven: true }
};

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }

async function run(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const settings = await getSettings();
  const enabled = settings.site?.autopilotEnabled ?? settings.site?.tiktok?.autopilot ?? true;
  if (!enabled) return NextResponse.json({ skipped: true, reason: "autopilot disabled" });

  const configuredAdminId = process.env.AUTOPILOT_USER_ID;
  const admin = createAdminClient();

  type Candidate = { id: string; role: "admin" | "moderator"; fallbackGlobal: boolean };
  const candidates: Candidate[] = [];

  // Existing admin autopilot remains exactly as before.
  if (configuredAdminId) {
    const { data: ownerProfile } = await admin.from("profiles")
      .select("role, blocked").eq("id", configuredAdminId).maybeSingle();
    if (ownerProfile?.role === "admin" && !ownerProfile.blocked) {
      candidates.push({ id: configuredAdminId, role: "admin", fallbackGlobal: true });
    }
  }

  // Additive moderator autopilot: only moderators explicitly granted the
  // `autopilot` permission AND who enabled it for their own account.
  const { data: moderatorProfiles } = await admin.from("profiles")
    .select("id, role, blocked, permissions, autopilot_enabled, autopilot_settings")
    .eq("role", "moderator").eq("blocked", false);
  const moderatorSettings: Record<string, any> = Object.fromEntries((moderatorProfiles || []).map((p: any) => [p.id, p.autopilot_settings || {}]));
  for (const p of moderatorProfiles || []) {
    const perms = Array.isArray(p.permissions) ? p.permissions : [];
    if (p.autopilot_enabled === true && perms.includes("autopilot")) {
      candidates.push({ id: p.id, role: "moderator", fallbackGlobal: false });
    }
  }

  if (!candidates.length) {
    return NextResponse.json({ skipped: true, reason: "no eligible autopilot owner" });
  }

  let selected: { candidate: Candidate; targetPlatform: string; profiles: any } | null = null;
  let selectedScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const available = await configuredPlatforms(settings, candidate.id, candidate.fallbackGlobal);
    const candidateProfiles = candidate.role === "moderator"
      ? (moderatorSettings[candidate.id]?.platforms || {})
      : (settings.site?.autopilotProfiles || {});
    const candidatePlatforms = available.filter((p) => candidateProfiles[p]?.enabled !== false);
    if (!candidatePlatforms.length) continue;

    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
    const { data: todayJobs } = await admin.from("generations")
      .select("autopilot_platform")
      .eq("user_id", candidate.id).eq("auto_publish", true)
      .gte("created_at", dayStart.toISOString());
    const counts: Record<string, number> = {};
    for (const row of todayJobs || []) counts[row.autopilot_platform || "legacy"] = (counts[row.autopilot_platform || "legacy"] || 0) + 1;

    const target = candidatePlatforms.find((p) =>
      counts[p] < Math.max(0, Math.min(1000, Math.floor(
        candidateProfiles[p]?.videosPerDay ?? FALLBACK_PROFILES[p]?.videosPerDay ?? settings.site.autopilotPerDay ?? 3
      )))
    ) || null;
    if (target) {
      const score = Object.values(counts).reduce((sum, n) => sum + Number(n || 0), 0);
      if (score < selectedScore) {
        selected = { candidate, targetPlatform: target, profiles: candidateProfiles };
        selectedScore = score;
      }
    }
  }

  if (!selected) return NextResponse.json({ skipped: true, reason: "all eligible autopilot daily targets reached" });

  const ownerId = selected.candidate.id;
  const targetPlatform = selected.targetPlatform;
  const profiles = selected.profiles;

  const profile = profiles[targetPlatform] || FALLBACK_PROFILES[targetPlatform];
  const fallbackProfile = FALLBACK_PROFILES[targetPlatform];
  const configuredDurations = Array.isArray(profile?.durationsSeconds) && profile.durationsSeconds.length
    ? profile.durationsSeconds
    : (Array.isArray(profile?.hours) && profile.hours.length ? profile.hours.map((h: number) => h * 3600) : (fallbackProfile.durationsSeconds || [...AUTOPILOT_DURATION_OPTIONS_SECONDS]));
  const nativeMax = await getPublishDurationLimitSeconds(targetPlatform, ownerId, selected.candidate.fallbackGlobal);
  const allowedDurations = allowedDurationsForPlatform(targetPlatform, configuredDurations).filter((s) => s <= nativeMax);
  if (!allowedDurations.length) {
    return NextResponse.json({ skipped: true, reason: "no configured duration compatible with platform limit", platform: targetPlatform, maxSeconds: nativeMax });
  }
  const targetSeconds = Number(allowedDurations[Math.floor(Math.random() * allowedDurations.length)]);
  const selectedHours = targetSeconds / 3600;
  const clipSec = Math.max(3, Math.floor(settings.video.clipSeconds) || 10);
  const scenes = Math.max(1, Math.ceil(targetSeconds / clipSec));

  const day = new Date().getDay();
  const index = day === 0 ? 6 : day - 1;
  const emotions = Array.isArray(settings.site?.autopilotEmotions) ? settings.site.autopilotEmotions : DAY_EMOTIONS;
  const emotion = emotions[index] || DAY_EMOTIONS[index];
  const choices = THEMES[emotion] || THEMES.neutre;
  const baseTopic = choices[Math.floor(Math.random() * choices.length)];
  const trendTopic = profile?.trendDriven === false ? "" : await getTrendingTopic();
  const topic = trendTopic ? `${baseTopic} — tendance actuelle : ${trendTopic}` : baseTopic;
  const { data: performanceRows } = await admin.from("social_metrics")
    .select("platform,score,format_profile,hook_style,video_seconds")
    .eq("platform", targetPlatform).order("score", { ascending: false }).limit(20);
  const optimizationContext = buildOptimizationContext(performanceRows || [], targetPlatform);

  const names = ["Luna", "Max"];
  const lines = [
    `${names[0]}: Tu sais ce qui vient de se passer ?`,
    `${names[1]}: Non, raconte-moi tout.`,
    `${names[0]}: ${topic}. Je ne m'attendais vraiment pas à ça.`,
    `${names[1]}: Alors faisons face à ça ensemble.`
  ];
  if (optimizationContext) lines.unshift(optimizationContext);

  const globalPromotion = settings.site?.promotion;
  const selectedModeratorProfile = (moderatorProfiles || []).find((p:any) => p.id === candidate.id);
  const selectedModeratorPermissions = Array.isArray(selectedModeratorProfile?.permissions) ? selectedModeratorProfile.permissions : [];
  const moderatorPromotionAllowed = candidate.role !== "moderator" || selectedModeratorPermissions.includes("promotion") || selectedModeratorPermissions.includes("autopilot");
  const moderatorPromotionEnabled = candidate.role !== "moderator" || moderatorSettings[candidate.id]?.promotionEnabled !== false;
  const promotion = moderatorPromotionAllowed && moderatorPromotionEnabled ? globalPromotion : null;
  if (promotion?.enabled && promotion?.spoken && promotion?.cta) lines.push(`${names[0]}: ${String(promotion.cta).slice(0, 240)}`);

  const personsMeta = names.map((name, i) => ({ name, role: i === 0 ? "personnage principal" : "second personnage", voice: voiceIdAt(i), character: characterIdAt(i) }));

  const { data: inserted, error } = await admin.from("generations").insert({
    user_id: ownerId,
    prompt: lines.join("\n"),
    video_language: "auto",
    color_scheme: "gelb",
    voice: "auto",
    character: "banani",
    scene_mode: "dialogue",
    persons: 2,
    persons_meta: personsMeta,
    dialogue_persons: 2,
    dialogue_lines: lines.map(x => x.replace(/^[^:]+:\s*/, "")),
    line_speakers: lines.map(x => x.split(":")[0]),
    image_mode: false,
    auto_publish: true,
    auto_publish_to_community: selected.candidate.role === "moderator"
      ? moderatorSettings[ownerId]?.autoPublishToCommunity === true
      : settings.site?.autoPublishToCommunity === true,
    auto_publish_all_platforms: selected.candidate.role === "moderator"
      ? moderatorSettings[ownerId]?.crossPostAllPlatforms === true
      : settings.site?.autopilotCrossPostAllPlatforms === true,
    autopilot_platform: targetPlatform,
    promotion_cta: promotion?.enabled && promotion?.spoken ? String(promotion.cta || "").slice(0, 240) : null,
    video_type: "long",
    target_seconds: targetSeconds,
    scenes,
    clips: [],
    status: "pending",
    metadata: { autopilotEmotion: emotion, promotionUrl: promotion?.enabled ? (promotion?.url || "") : "", autopilotPlatform: targetPlatform, trendTopic: trendTopic || null, durationHours: selectedHours, durationSeconds: targetSeconds, nativePlatformMaxSeconds: nativeMax }
  }).select("id").single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, jobId: inserted.id, platform: targetPlatform, hours: selectedHours, emotion, trendTopic, topic, scenes });
}
