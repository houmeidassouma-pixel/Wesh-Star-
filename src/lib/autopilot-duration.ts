// Central duration policy for Autopilot. The UI may expose up to 6 h,
// but publication workers must respect each platform's native/API ceiling.
export const AUTOPILOT_DURATION_OPTIONS_SECONDS = [60, 120, 300, 600, 1800, 3600, 7200, 10800, 14400, 18000, 21600] as const;

// Conservative platform ceilings. Account-specific APIs can return a lower
// value (TikTok does this dynamically); workers always use the lower ceiling.
export const PLATFORM_PUBLISH_MAX_SECONDS: Record<string, number> = {
  tiktok: 600,
  facebook: 14400,
  youtube: 21600,
  snapchat: 600,
  instagram: 900,
  twitch: 21600,
  x: 140,
  linkedin: 3600
};

export function durationLabel(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${Math.round(seconds / 3600)} h`;
}

export function allowedDurationsForPlatform(platform: string, selected: number[] | undefined): number[] {
  const max = PLATFORM_PUBLISH_MAX_SECONDS[platform] ?? 21600;
  const base = Array.isArray(selected) && selected.length ? selected : [...AUTOPILOT_DURATION_OPTIONS_SECONDS];
  return base.filter((s) => Number.isFinite(s) && s >= 60 && s <= max).sort((a, b) => a - b);
}
