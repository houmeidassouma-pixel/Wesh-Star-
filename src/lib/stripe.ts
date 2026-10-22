import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.stripe.com/v1";

function secret() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return key;
}

export async function stripeRequest<T = any>(path: string, params?: URLSearchParams, method = "POST"): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${secret()}`,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body: params,
    cache: "no-store"
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Stripe API error (${res.status})`);
  return data as T;
}

export function appUrl() {
  return String(process.env.WESH_APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

export function verifyStripeSignature(payload: string, header: string | null, toleranceSeconds = 300) {
  const secretValue = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretValue || !header) return false;
  const parts = header.split(",").map(x => x.split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([,v]) => v).filter(Boolean);
  if (!timestamp || !signatures.length) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secretValue).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  return signatures.some(sig => {
    try {
      const a = Buffer.from(expected, "hex");
      const b = Buffer.from(sig, "hex");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch { return false; }
  });
}
