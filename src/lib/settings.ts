import { createAdminClient } from "./account/admin";

export type PlanKey = string;
export type MonthlyQuotaTier = {
  id: string;
  name: string;
  minutes: number;
  price: number;
  dailyMinutes: number;
  enabled?: boolean;
};
export type HourTier = { hours: number; credits?: number; price: number; enabled?: boolean }; // legacy storage only; no customer UI
export type PlanSettings = {
  price: number;          // EUR / month (0 = free)
  maxSeconds: number;     // max total video length
  monthlyJobs: number;    // max generations per month
  dailyJobs: number;      // max generations per day
  monthlySeconds: number; // video time included per month (1 h = 3600 s)
  dailySeconds: number;   // video time included per day (1 h = 3600 s)
  maxScenes: number;      // hard cap of AI scenes per single job
  maxJobCostEur: number;  // max ESTIMATED cost (EUR) allowed per job
};
export type SiteSettings = {
  plans: { monthlyTiers: MonthlyQuotaTier[]; hourTiers: HourTier[]; free: PlanSettings; starter: PlanSettings; basic: PlanSettings; pro: PlanSettings; creator: PlanSettings; studio: PlanSettings; business: PlanSettings; agency: PlanSettings; enterprise: PlanSettings };
  video: {
      clipSeconds: number;        // length of one AI clip
      costPerClipEur: number;     // cost estimate per clip (for pre-flight checks)
      maxScenesPerJob: number;    // global hard cap per job, regardless of plan
      sceneTimeoutMinutes: number;// a scene stuck longer is treated as failed
      maxAttempts: number;        // max worker attempts per job (no infinite loops)
      maxSceneAttempts: number;   // max attempts per individual scene
  };
  site: {
    name: string;
    tagline: string;
    accentColor: string;
    logoUrl: string;
    logoEmoji: string;
    themePreset: string;
    promotionPricing: { pricePer1000Views: number; minViews: number; maxViews: number };
    longVideoCreatorSharePercent: number;
    longVideoAdBreaksEnabled: boolean;
    longVideoAdIntervalMinutes: number;
    maintenance: boolean;
    defaultLocale: string;
    communityEnabled: boolean;
    socialNetworkEnabled: boolean;
    autoPublishToCommunity: boolean;
    autopilotCrossPostAllPlatforms: boolean;
    allowUserAccounts: boolean;
    allowModeratorAccounts: boolean;
    tiktok: { linked: boolean; username: string; autopilot: boolean; perDay: number };
    platforms: { tiktok: boolean; facebook: boolean; youtube: boolean; snapchat: boolean; instagram: boolean; twitch: boolean; x: boolean; linkedin: boolean };
    autopilotEnabled: boolean;
    autopilotPerDay: number;
    autopilotEmotions: string[];
    autopilotDurationOptionsSeconds: number[];
    autopilotProfiles: {
      tiktok: { enabled: boolean; videosPerDay: number; hours: number[]; durationsSeconds?: number[]; trendDriven: boolean };
      facebook: { enabled: boolean; videosPerDay: number; hours: number[]; durationsSeconds?: number[]; trendDriven: boolean };
      youtube: { enabled: boolean; videosPerDay: number; hours: number[]; durationsSeconds?: number[]; trendDriven: boolean };
      snapchat: { enabled: boolean; videosPerDay: number; hours: number[]; durationsSeconds?: number[]; trendDriven: boolean };
      instagram: { enabled: boolean; videosPerDay: number; hours: number[]; durationsSeconds?: number[]; trendDriven: boolean };
      twitch: { enabled: boolean; videosPerDay: number; hours: number[]; durationsSeconds?: number[]; trendDriven: boolean };
      x: { enabled: boolean; videosPerDay: number; hours: number[]; durationsSeconds?: number[]; trendDriven: boolean };
      linkedin: { enabled: boolean; videosPerDay: number; hours: number[]; durationsSeconds?: number[]; trendDriven: boolean };
    };
    promotion: { enabled: boolean; url: string; cta: string; spoken: boolean };
    maxDailyGenerations: number;     // global circuit breaker / day
    maxConcurrentJobsPerUser: number;// active (pending+processing) jobs per user
    adminDailyJobs: number;          // admin = free, but accident/compromise cap
    ads: {
      enabled: boolean;
      creatorSharePercent: number; // share of eligible net video-ad revenue allocated to creators
      personalizedByDefault: boolean;
      allowFreeUsers: boolean;
      showToPaidUsers: boolean;
      showToGuests: boolean;
      excludeUnder18: boolean;
      frequencyCapPerDay: number;
      feedAdEveryPosts: number;
      maxFeedAdsPerVisit: number;
      label: string;
      network: "none" | "adsense" | "custom";
      publisherId: string;
      adsenseSlotId: string;      // AdSense ad unit (slot) id, digits only
      customCode: string;         // embed code from another ad network (rendered in a sandboxed iframe)
      customHeight: number;       // iframe height (px) for the custom code block
      adsTxtExtra: string;        // extra ads.txt lines supplied by other ad networks
      setupUrl: string;
      campaigns: Array<{
        id: string; advertiser: string; title: string; description: string; landingUrl: string; imageUrl: string;
        topics: string[]; active: boolean; billing: "cpm" | "cpc"; rate: number;
      }>;
    };
  };
};

// Pricing: dynamic video-time subscriptions. 1 AI generation token = 10 seconds; 1 minute = 6 AI tokens.
// Legacy credit/seconds storage remains only for backward-compatible database paths; it is not customer-facing.
export const defaultSettings: SiteSettings = {
  plans: {
    // Customer-facing recurring monthly quotas. Admin can add/remove any 1–60 minute tier,
    // set its monthly price, and optionally limit how many minutes may be generated per day.
    monthlyTiers: [
      { id: "pro_15m", name: "Pro — 90 crédits vidéo / mois", minutes: 15, price: 10, dailyMinutes: 15, enabled: true },
      { id: "pro_30m", name: "Pro — 180 crédits vidéo / mois", minutes: 30, price: 15, dailyMinutes: 30, enabled: true }
    ],
    // Legacy pack storage for compatibility. The Admin UI now presents these as Wesh Star IA credit packs.
    // Ordinary-user Studio generations are capped at 10 minutes; legacy property naming is kept for DB compatibility.
    // Legacy storage is retained for compatibility. Customer-facing unit: 1 minute = 6 video credits; one-off packs follow 80 credits = €1, subject to the €0.50 payment minimum.
    hourTiers: Array.from({ length: 24 }, (_, i) => {
      const minutes = i + 7;
      return { hours: minutes, credits: minutes * 6, price: Math.max(0.5, Math.round((minutes * 6 / 80) * 100) / 100), enabled: true };
    }),
    // Free: exactly two lifetime trials, 10 seconds each.
    free:       { price: 0,  maxSeconds: 10,     monthlyJobs: 2,   dailyJobs: 2,   monthlySeconds: 20,     dailySeconds: 20,    maxScenes: 1,    maxJobCostEur: 0.5 },
    // Legacy named plans remain for backward compatibility; customer-facing monthly plans use monthlyTiers above.
    starter:    { price: 5,  maxSeconds: 3600,  monthlyJobs: 60,   dailyJobs: 10,  monthlySeconds: 3600,   dailySeconds: 3600,  maxScenes: 360,  maxJobCostEur: 50 },
    basic:      { price: 7,  maxSeconds: 7200,  monthlyJobs: 120,  dailyJobs: 20,  monthlySeconds: 7200,   dailySeconds: 7200,  maxScenes: 720,  maxJobCostEur: 100 },
    pro:        { price: 10, maxSeconds: 10800, monthlyJobs: 180,  dailyJobs: 30,  monthlySeconds: 10800,  dailySeconds: 10800, maxScenes: 1080, maxJobCostEur: 150 },
    creator:    { price: 15, maxSeconds: 18000, monthlyJobs: 300,  dailyJobs: 50,  monthlySeconds: 18000,  dailySeconds: 18000, maxScenes: 1800, maxJobCostEur: 250 },
    studio:     { price: 25, maxSeconds: 36000, monthlyJobs: 600,  dailyJobs: 100, monthlySeconds: 36000,  dailySeconds: 28800, maxScenes: 3600, maxJobCostEur: 500 },
    business:   { price: 40, maxSeconds: 72000, monthlyJobs: 1200, dailyJobs: 200, monthlySeconds: 72000, dailySeconds: 43200, maxScenes: 7200, maxJobCostEur: 1000 },
    agency:     { price: 60, maxSeconds: 144000,monthlyJobs: 2400, dailyJobs: 300, monthlySeconds: 144000, dailySeconds: 72000, maxScenes: 14400, maxJobCostEur: 2000 },
    enterprise: { price: 80, maxSeconds: 216000,monthlyJobs: 4000, dailyJobs: 400, monthlySeconds: 216000, dailySeconds: 86400, maxScenes: 21600, maxJobCostEur: 3000 }
  },

  video: {
    clipSeconds: 10,
    costPerClipEur: 0.5,
    maxScenesPerJob: 2160,
    sceneTimeoutMinutes: 30,
    maxAttempts: 5,
    maxSceneAttempts: 3
  },
  site: {
    name: "Wesh Star IA",
    tagline: "Créez, partagez et promouvez vos vidéos.",
    accentColor: "#facc15",
    logoUrl: "",
    logoEmoji: "⭐",
    themePreset: "midnight",
    promotionPricing: { pricePer1000Views: 10, minViews: 100, maxViews: 100000 },
    longVideoCreatorSharePercent: 60,
    longVideoAdBreaksEnabled: false,
    longVideoAdIntervalMinutes: 8,
    maintenance: false,
    defaultLocale: "de",
    communityEnabled: false,
    socialNetworkEnabled: false,
    autoPublishToCommunity: false,
    autopilotCrossPostAllPlatforms: false,
    allowUserAccounts: true,
    allowModeratorAccounts: true,
    tiktok: { linked: false, username: "", autopilot: true, perDay: 3 },
    platforms: { tiktok: true, facebook: true, youtube: true, snapchat: true, instagram: true, twitch: false, x: true, linkedin: true },
    autopilotEnabled: true,
    autopilotPerDay: 3,
    autopilotDurationOptionsSeconds: [60, 120, 300, 600, 1800, 3600, 7200, 10800, 14400, 18000, 21600],
    autopilotProfiles: {
      tiktok: { enabled: true, videosPerDay: 3, hours: [], durationsSeconds: [60, 120, 300, 600], trendDriven: true },
      facebook: { enabled: true, videosPerDay: 3, hours: [1, 2, 3, 4], durationsSeconds: [60, 120, 300, 600, 1800, 3600, 7200, 10800, 14400], trendDriven: true },
      youtube: { enabled: true, videosPerDay: 3, hours: [1, 2, 3, 4, 5, 6], durationsSeconds: [60, 120, 300, 600, 1800, 3600, 7200, 10800, 14400, 18000, 21600], trendDriven: true },
      snapchat: { enabled: true, videosPerDay: 3, hours: [], durationsSeconds: [60, 120, 300, 600], trendDriven: true },
      instagram: { enabled: true, videosPerDay: 3, hours: [], durationsSeconds: [60, 120, 300, 600, 900], trendDriven: true },
      twitch: { enabled: false, videosPerDay: 1, hours: [1, 2, 3, 4, 5, 6], durationsSeconds: [3600, 7200, 10800, 14400, 18000, 21600], trendDriven: true },
      x: { enabled: true, videosPerDay: 2, hours: [], durationsSeconds: [60, 120, 300, 600], trendDriven: true },
      linkedin: { enabled: true, videosPerDay: 1, hours: [], durationsSeconds: [60, 120, 300, 600, 1800], trendDriven: true }
    },
    autopilotEmotions: ["romantique", "drôle", "triste", "dramatique", "romantique", "drôle", "neutre"],
    promotion: { enabled: true, url: "", cta: "Veuillez cliquer sur mon profil, puis sur le lien dans ma bio pour accéder à Wesh Star IA et générer vos propres vidéos gratuitement.", spoken: true },
    maxDailyGenerations: 2000,
    maxConcurrentJobsPerUser: 3,
    adminDailyJobs: 100,
    ads: { enabled: false, creatorSharePercent: 10, personalizedByDefault: true, allowFreeUsers: true, showToPaidUsers: true, showToGuests: true, excludeUnder18: true, frequencyCapPerDay: 8, feedAdEveryPosts: 5, maxFeedAdsPerVisit: 3, label: "Sponsorisé", network: "none", publisherId: "", adsenseSlotId: "", customCode: "", customHeight: 250, adsTxtExtra: "", setupUrl: "https://adsense.google.com/start/", campaigns: [] }
  }
};

export function mergeSettings(raw: any): SiteSettings {
  const d = defaultSettings;
  const mk = (p: any, fb: PlanSettings): PlanSettings => ({ ...fb, ...(p || {}) });
  const rawMonthly = Array.isArray(raw?.plans?.monthlyTiers) ? raw.plans.monthlyTiers : d.plans.monthlyTiers;
  const monthlyTiers = rawMonthly
    .map((x: any, i: number) => ({
      id: String(x?.id || `monthly_${i + 1}m`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60),
      name: String(x?.name || `${Math.max(1, Math.min(10080, Math.floor(Number(x?.minutes) || 1)))} minutes / mois`).replace(/jetons?\s*(IA)?/gi, "crédits vidéo").slice(0, 80),
      minutes: Math.max(1, Math.min(10080, Math.floor(Number(x?.minutes) || 1))),
      price: Math.max(0, Number(x?.price) || 0),
      dailyMinutes: Math.max(1, Math.min(10080, Math.floor(Number(x?.dailyMinutes) || Math.floor(Number(x?.minutes) || 1)))),
      enabled: x?.enabled !== false
    }))
    .filter((x: any, i: number, a: any[]) => a.findIndex((y) => y.id === x.id) === i)
    .sort((a: any, b: any) => a.minutes - b.minutes || a.id.localeCompare(b.id));

  return {
    plans: {
      monthlyTiers,
      hourTiers: Array.isArray(raw?.plans?.hourTiers)
        ? raw.plans.hourTiers
          .map((x: any) => ({ hours: Math.max(7, Math.min(10080, Math.floor(Number(x.hours) || 7))), credits: Math.max(42, Math.min(60480, Math.floor(Number(x.hours) || 7) * 6)), price: Math.max(0, Number(x.price ?? Math.round((Math.max(7, Math.floor(Number(x.hours) || 7)) * 6 / 80) * 100) / 100) || 0), enabled: x.enabled !== false }))
          .filter((x: any, i: number, a: any[]) => a.findIndex((y) => y.hours === x.hours) === i)
          .sort((a: any, b: any) => a.hours - b.hours)
        : d.plans.hourTiers,
      free: mk(raw?.plans?.free, d.plans.free),
      starter: mk(raw?.plans?.starter, d.plans.starter),
      basic: mk(raw?.plans?.basic, d.plans.basic),
      pro: mk(raw?.plans?.pro, d.plans.pro),
      creator: mk(raw?.plans?.creator, d.plans.creator),
      studio: mk(raw?.plans?.studio, d.plans.studio),
      business: mk(raw?.plans?.business, d.plans.business),
      agency: mk(raw?.plans?.agency, d.plans.agency),
      enterprise: mk(raw?.plans?.enterprise, d.plans.enterprise)
    },
    video: { ...d.video, ...(raw?.video || {}) },
    site: {
      ...d.site, ...(raw?.site || {}),
      name: String(raw?.site?.name || d.site.name).trim().slice(0, 80),
      tagline: String(raw?.site?.tagline ?? d.site.tagline).trim().slice(0, 180),
      accentColor: /^#[0-9a-fA-F]{6}$/.test(String(raw?.site?.accentColor || "")) ? String(raw.site.accentColor) : d.site.accentColor,
      logoUrl: (() => { const v = String(raw?.site?.logoUrl || "").trim().slice(0, 500); return v.startsWith("/") || /^https:\/\//i.test(v) ? v : ""; })(),
      logoEmoji: String(raw?.site?.logoEmoji || d.site.logoEmoji).slice(0, 8),
      themePreset: ["midnight", "ocean", "violet", "forest"].includes(String(raw?.site?.themePreset)) ? String(raw.site.themePreset) : d.site.themePreset,
      promotionPricing: {
        pricePer1000Views: Math.max(0.1, Math.min(1000, Number(raw?.site?.promotionPricing?.pricePer1000Views ?? d.site.promotionPricing.pricePer1000Views) || d.site.promotionPricing.pricePer1000Views)),
        minViews: Math.max(100, Math.min(100000, Math.floor(Number(raw?.site?.promotionPricing?.minViews ?? d.site.promotionPricing.minViews) || d.site.promotionPricing.minViews))),
        maxViews: Math.max(100, Math.min(1000000, Math.floor(Number(raw?.site?.promotionPricing?.maxViews ?? d.site.promotionPricing.maxViews) || d.site.promotionPricing.maxViews)))
      },
      longVideoCreatorSharePercent: Math.max(0, Math.min(100, Math.floor(Number(raw?.site?.longVideoCreatorSharePercent ?? d.site.longVideoCreatorSharePercent)))),
      longVideoAdBreaksEnabled: raw?.site?.longVideoAdBreaksEnabled === true,
      longVideoAdIntervalMinutes: Math.max(3, Math.min(60, Math.floor(Number(raw?.site?.longVideoAdIntervalMinutes) || d.site.longVideoAdIntervalMinutes))),
      platforms: { ...d.site.platforms, ...(raw?.site?.platforms || {}) },
      autopilotDurationOptionsSeconds: Array.isArray(raw?.site?.autopilotDurationOptionsSeconds) && raw.site.autopilotDurationOptionsSeconds.length
        ? raw.site.autopilotDurationOptionsSeconds.map((x: any) => Math.max(60, Math.min(21600, Math.floor(Number(x) || 60)))).filter((x: number, i: number, a: number[]) => a.indexOf(x) === i).sort((a: number,b: number) => a-b)
        : d.site.autopilotDurationOptionsSeconds,
      autopilotProfiles: Object.fromEntries(Object.entries(d.site.autopilotProfiles).map(([k, v]) => {
        const rawProfile: any = (raw?.site?.autopilotProfiles || {})[k] || {};
        const merged: any = { ...(v as any), ...rawProfile };
        if (Array.isArray(rawProfile.durationsSeconds) && rawProfile.durationsSeconds.length) merged.durationsSeconds = rawProfile.durationsSeconds.map((x: any) => Math.max(60, Math.min(21600, Math.floor(Number(x) || 60)))).filter((x: number, i: number, a: number[]) => a.indexOf(x) === i).sort((a: number,b: number) => a-b);
        return [k, merged];
      })) as SiteSettings["site"]["autopilotProfiles"],
      promotion: { ...d.site.promotion, ...(raw?.site?.promotion || {}) },
      ads: { ...d.site.ads, ...(raw?.site?.ads || {}), creatorSharePercent: Math.max(0, Math.min(100, Math.floor(Number(raw?.site?.ads?.creatorSharePercent ?? d.site.ads.creatorSharePercent)))), network: raw?.site?.ads?.network === "adsense" ? "adsense" : raw?.site?.ads?.network === "custom" ? "custom" : "none", publisherId: String(raw?.site?.ads?.publisherId || "").trim().slice(0,120), adsenseSlotId: String(raw?.site?.ads?.adsenseSlotId || "").replace(/[^0-9]/g,"").slice(0,20), customCode: String(raw?.site?.ads?.customCode || "").slice(0,8000), customHeight: Math.max(50, Math.min(1200, Math.floor(Number(raw?.site?.ads?.customHeight) || 250))), adsTxtExtra: String(raw?.site?.ads?.adsTxtExtra || "").slice(0,4000), showToGuests: raw?.site?.ads?.showToGuests === true, frequencyCapPerDay: Math.max(0, Math.min(100, Math.floor(Number(raw?.site?.ads?.frequencyCapPerDay ?? d.site.ads.frequencyCapPerDay)))), feedAdEveryPosts: Math.max(1, Math.min(30, Math.floor(Number(raw?.site?.ads?.feedAdEveryPosts ?? d.site.ads.feedAdEveryPosts)))), maxFeedAdsPerVisit: Math.max(0, Math.min(20, Math.floor(Number(raw?.site?.ads?.maxFeedAdsPerVisit ?? d.site.ads.maxFeedAdsPerVisit)))), setupUrl: String(raw?.site?.ads?.setupUrl || d.site.ads.setupUrl).slice(0,1000), campaigns: Array.isArray(raw?.site?.ads?.campaigns) ? raw.site.ads.campaigns.map((c:any,i:number)=>({ id:String(c?.id||`ad_${i+1}`).slice(0,80), advertiser:String(c?.advertiser||"Annonceur").slice(0,120), title:String(c?.title||"Publicité").slice(0,160), description:String(c?.description||"").slice(0,500), landingUrl:String(c?.landingUrl||"#").slice(0,1000), imageUrl:String(c?.imageUrl||"").slice(0,1000), topics:Array.isArray(c?.topics)?c.topics.map((x:any)=>String(x).slice(0,60)).slice(0,20):[], active:c?.active!==false, billing:c?.billing === "cpc" ? "cpc" : "cpm", rate:Math.max(0,Number(c?.rate)||0) })) : d.site.ads.campaigns }
    }
  };
}

export async function getSettings(): Promise<SiteSettings> {
  try {
    const { data } = await createAdminClient()
      .from("site_settings")
      .select("value")
      .eq("key", "global")
      .single();
    return mergeSettings(data?.value);
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: SiteSettings) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "global")
    .single();
  const merged = mergeSettings({ ...(existing?.value || {}), ...settings });
  const { error } = await admin
    .from("site_settings")
    .upsert({ key: "global", value: merged, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return merged;
}
