export const tierKeys = ["starter", "basic", "pro", "creator", "studio", "business", "agency", "enterprise"] as const;
export type TierKey = (typeof tierKeys)[number];
export function tierFromPaymentTier(tier: string | undefined): TierKey | undefined {
  return (tierKeys as readonly string[]).includes(tier || "") ? tier as TierKey : undefined;
}
