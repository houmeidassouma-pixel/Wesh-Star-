import { createClient } from "./account/server";
import { getSettings, type PlanKey, type PlanSettings } from "./settings";
import { tierFromPaymentTier as tierFromProfile } from "./tiers";

// Admins stay 100% free with no real quota — but carry high circuit
// breakers against accidents or a compromised account.
// Staff roles: editor/moderator can review & remove content; viewer is
// read-only. Only admins touch plans, payments, roles and settings.
// The owner account (admin) is NEVER restricted: no fees, no quotas,
// no length limit for the generator — very long videos (3-5 h and beyond)
// must simply work. Only technical ceilings remain (schema/DB safety).
const ADMIN_LIMITS = {
  maxSeconds: 216_000,               // 60 h technical safety ceiling
  monthlyJobs: 1_000_000_000,
  monthlySeconds: 1_000_000_000_000,
  dailySeconds: 1_000_000_000_000,
  dailyJobs: 1_000_000_000,
  maxScenes: 25_000,                 // enough for 60 h at ~10 s/scene
  maxJobCostEur: 1_000_000_000
};

export async function getAccess() {
  const settings = await getSettings();
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    return {
      user: null, role: null, isAdmin: false, isModerator: false, isStaff: false, settings,
      planKey: "free" as PlanKey, plan: settings.plans.free,
      maxSeconds: 0, monthlyJobs: 0, limits: { ...settings.plans.free, maxJobCostEur: 0, dailyJobs: 0, maxScenes: 0 }
    };
  }

  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "user";
  const isAdmin = role === "admin";
  // A blocked account is fully deactivated at the access boundary. Admins are protected.
  if (profile?.blocked && !isAdmin) {
    return {
      user: null, role: null, isAdmin: false, isModerator: false, isStaff: false, settings,
      planKey: "free" as PlanKey, plan: settings.plans.free, maxSeconds: 0, monthlyJobs: 0,
      limits: { ...settings.plans.free, maxJobCostEur: 0, dailyJobs: 0, maxScenes: 0 },
      blocked: true
    } as any;
  }
  const isModerator = role === "moderator";
  const isEditor = role === "editor";
  const isViewer = role === "viewer";           // read-only staff
  const isStaff = isAdmin || isModerator || isEditor || isViewer;
  const canModerate = isAdmin || isModerator || isEditor;
  // Granular permissions (admins implicitly have everything)
  const rawPerms: string[] = Array.isArray(profile?.permissions) ? (profile.permissions as string[]) : [];
  const modPerms: Record<string, boolean> = {};
  for (const k of ["review", "remove", "warn", "block", "viewLogs", "autopilot", "promotion"]) {
    modPerms[k] = isAdmin || rawPerms.includes(k) || (k === "promotion" && rawPerms.includes("autopilot"));
  }
  const active = profile?.subscription_status === "active" && (!profile?.current_period_end || new Date(profile.current_period_end).getTime() > Date.now());
  const profileTier = String(profile?.subscription_tier || "");
  const legacyTier = tierFromProfile(profileTier);
  const dynamicTier = active ? settings.plans.monthlyTiers.find((x) => x.id === profileTier && x.enabled !== false) : undefined;
  const planKey: PlanKey = active && (dynamicTier || legacyTier) ? profileTier : "free";
  const dynamicPlan: PlanSettings | null = dynamicTier ? {
    price: dynamicTier.price,
    maxSeconds: Math.min(10 * 60, dynamicTier.minutes * 60),
    monthlyJobs: Math.max(1, dynamicTier.minutes),
    dailyJobs: Math.max(1, dynamicTier.dailyMinutes),
    monthlySeconds: dynamicTier.minutes * 60,
    dailySeconds: Math.min(dynamicTier.minutes, dynamicTier.dailyMinutes) * 60,
    maxScenes: Math.max(6, dynamicTier.minutes * 6),
    maxJobCostEur: 500
  } : null;
  const plan = dynamicPlan || (legacyTier ? settings.plans[legacyTier as keyof typeof settings.plans] : settings.plans.free);

  // Admin and moderator accounts receive the elevated generation limits.
  // Moderators do NOT receive admin controls (pricing, roles, settings), but
  // their moderation role is intentionally unlimited for generation/testing.
  // Editors/viewers keep their normal subscription limits.
  const limits = (isAdmin || isModerator)
    ? {
        maxSeconds: ADMIN_LIMITS.maxSeconds,
        monthlyJobs: ADMIN_LIMITS.monthlyJobs,
        dailyJobs: ADMIN_LIMITS.dailyJobs,
        monthlySeconds: ADMIN_LIMITS.monthlySeconds,
        dailySeconds: ADMIN_LIMITS.dailySeconds,
        maxScenes: ADMIN_LIMITS.maxScenes,
        maxJobCostEur: ADMIN_LIMITS.maxJobCostEur
      }
    : {
        maxSeconds: plan.maxSeconds,
        monthlyJobs: plan.monthlyJobs,
        dailyJobs: plan.dailyJobs,
        monthlySeconds: plan.monthlySeconds,
        dailySeconds: plan.dailySeconds,
        maxScenes: plan.maxScenes,
        maxJobCostEur: plan.maxJobCostEur
      };

  return {
    user, profile, role, isAdmin, isModerator, isEditor, isViewer, isStaff, canModerate, modPerms, active, tier: profileTier || null, settings, planKey, plan, limits,
    maxSeconds: limits.maxSeconds,
    monthlyJobs: limits.monthlyJobs,
    dailyJobs: limits.dailyJobs,
    canLong: isAdmin || isModerator || planKey !== "free"
  };
}
