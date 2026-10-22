/**
 * Returns the billing-cycle key used for monthly subscription quota counters.
 * Stripe renewals update profile.quota_cycle_key, so unused minutes from the
 * previous billing cycle are never carried into the new cycle.
 */
export function quotaPeriodKey(profile?: { quota_cycle_key?: string | null } | null): string {
  const key = String(profile?.quota_cycle_key || "").trim();
  return key || new Date().toISOString().slice(0, 7);
}
