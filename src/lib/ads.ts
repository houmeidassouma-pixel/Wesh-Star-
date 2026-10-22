import type { SiteSettings } from "./settings";

export type AdPreferences = { personalized: boolean; adsFree: boolean; hiddenCampaignIds: string[] };
export type ServedAd = SiteSettings["site"]["ads"]["campaigns"][number];

export function normalizeAdPreferences(raw: any, defaultPersonalized: boolean): AdPreferences {
  return {
    personalized: raw?.personalized !== false ? defaultPersonalized : false,
    adsFree: raw?.adsFree === true,
    hiddenCampaignIds: Array.isArray(raw?.hiddenCampaignIds) ? raw.hiddenCampaignIds.map(String).slice(0,100) : []
  };
}

export function chooseAd(campaigns: ServedAd[], context: string, personalized: boolean, hidden: string[]) {
  const tokens = context.toLowerCase().split(/[^a-z0-9à-ÿ]+/i).filter(Boolean);
  const eligible = campaigns.filter(c => c.active && !hidden.includes(c.id));
  if (!eligible.length) return null;
  const scored = eligible.map(c => {
    const topics = c.topics.map(x => x.toLowerCase());
    const score = personalized ? topics.reduce((n, t) => n + (tokens.includes(t) ? 3 : tokens.some(x => x.includes(t) || t.includes(x)) ? 1 : 0), 0) : 0;
    return { c, score };
  }).sort((a,b) => b.score-a.score);
  return scored[0].c;
}

// ---------------------------------------------------------------------------
// Network ads (Google AdSense / custom embed code) on public pages.
// Additive helpers: they do not touch the existing direct-campaign logic above.
// ---------------------------------------------------------------------------
export const ADSENSE_PUB_RE = /^ca-pub-[0-9]+$/;

export function networkAdsConfigured(ads: SiteSettings["site"]["ads"]): boolean {
  if (!ads.enabled) return false;
  if (ads.network === "adsense") return ADSENSE_PUB_RE.test(ads.publisherId) && /^[0-9]+$/.test(ads.adsenseSlotId || "");
  if (ads.network === "custom") return (ads.customCode || "").trim().length > 0;
  return false;
}

// Decides whether the current visitor may be shown a network ad block.
export function visitorMaySeeNetworkAds(access: any): boolean {
  const ads = access.settings.site.ads as SiteSettings["site"]["ads"];
  if (!networkAdsConfigured(ads)) return false;
  if (!access.user) return ads.showToGuests;               // anonymous visitors
  if (access.isStaff) return false;                        // never show ads to admins/moderators
  const prefs = normalizeAdPreferences(access.profile?.ad_preferences, ads.personalizedByDefault);
  if (prefs.adsFree) return false;
  if (access.planKey === "free") return ads.allowFreeUsers;
  // Paid subscribers may see ads, but ads are rendered only in non-blocking ad slots.
  // They never gate generation, consume tokens, or interrupt the workspace.
  return ads.showToPaidUsers;
}
