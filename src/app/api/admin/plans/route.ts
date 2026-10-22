import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { saveSettings, getSettings } from "@/lib/settings";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const access = await getAccess();
  if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("admin:" + clientKey(req, access.user!.id), 60, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }
  const body = await req.json();
  const current = await getSettings();
  const { plans = {} } = body || {};
  const { monthlyTiers, hourTiers, free, starter, basic, pro, creator, studio, business, agency, enterprise } = plans;
  const merged = await saveSettings({
    plans: {
      monthlyTiers: Array.isArray(monthlyTiers) ? monthlyTiers.map((x: any, i: number) => ({
        id: String(x?.id || `monthly_${i + 1}m`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60),
        name: String(x?.name || "Forfait mensuel").slice(0, 80),
        minutes: Math.max(1, Math.min(10080, Math.floor(Number(x?.minutes) || 1))),
        price: Math.max(0, Number(x?.price) || 0),
        dailyMinutes: Math.max(1, Math.min(10080, Math.floor(Number(x?.dailyMinutes) || Number(x?.minutes) || 1))),
        enabled: x?.enabled !== false
      })).filter((x: any, i: number, a: any[]) => a.findIndex((y) => y.id === x.id) === i).sort((a: any,b: any) => a.minutes-b.minutes) : current.plans.monthlyTiers,
      hourTiers: Array.isArray(hourTiers) ? hourTiers.map((x: any) => ({ hours: Math.max(1, Math.min(10080, Math.floor(Number(x.hours) || 1))), credits: Math.max(6, Math.min(60480, Math.floor(Number(x.hours) || 1) * 6)), price: Math.max(0, Number(x.price) || 0), enabled: x.enabled !== false })).filter((x: any, i: number, a: any[]) => a.findIndex((y) => y.hours === x.hours) === i).sort((a: any,b: any) => a.hours-b.hours) : current.plans.hourTiers,
      free: { ...current.plans.free, ...(free || {}) },
      starter: { ...current.plans.starter, ...(starter || {}) },
      basic: { ...current.plans.basic, ...(basic || {}) },
      pro: { ...current.plans.pro, ...(pro || {}) },
      creator: { ...current.plans.creator, ...(creator || {}) },
      studio: { ...current.plans.studio, ...(studio || {}) },
      business: { ...current.plans.business, ...(business || {}) },
      agency: { ...current.plans.agency, ...(agency || {}) },
      enterprise: { ...current.plans.enterprise, ...(enterprise || {}) }
    },
    video: current.video,
    site: current.site
  });
  return NextResponse.json({ ok: true, plans: merged.plans });
}
