import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { hasPerm } from "@/lib/permissions";

export async function GET() {
  const access = await getAccess();
  if (!access.isModerator || !(hasPerm((access.profile as any)?.permissions, "autopilot") || hasPerm((access.profile as any)?.permissions, "promotion"))) {
    return NextResponse.json({ error: "Autopilot permission required" }, { status: 403 });
  }
  const settings = (access.profile as any)?.autopilot_settings || {};
  const promotionAllowed = hasPerm((access.profile as any)?.permissions, "promotion") || hasPerm((access.profile as any)?.permissions, "autopilot");
  return NextResponse.json({ enabled: !!(access.profile as any)?.autopilot_enabled, settings, promotionAllowed, promotion: promotionAllowed ? (access.settings.site?.promotion || null) : null });
}

export async function POST(req: Request) {
  const access = await getAccess();
  const hasAutopilot = hasPerm((access.profile as any)?.permissions, "autopilot");
  const hasPromotion = hasPerm((access.profile as any)?.permissions, "promotion");
  if (!access.isModerator || !(hasAutopilot || hasPromotion)) {
    return NextResponse.json({ error: "Autopilot permission required" }, { status: 403 });
  }
  if (!hasAutopilot) {
    // Promotion-only moderator: may only toggle their own promotion/outro, never autopilot itself.
    let b: any = {};
    try { b = await req.json(); } catch {}
    const current = (access.profile as any)?.autopilot_settings || {};
    const admin2 = (await import("@/lib/account/admin")).createAdminClient();
    const { error: e2 } = await admin2.from("profiles").update({ autopilot_settings: { ...current, promotionEnabled: b?.settings?.promotionEnabled !== false } }).eq("id", access.user!.id).eq("role", "moderator");
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    return NextResponse.json({ ok: true, enabled: !!(access.profile as any)?.autopilot_enabled });
  }
  let body: any = {};
  try { body = await req.json(); } catch {}
  const enabled = body.enabled === true;
  const incoming = body.settings && typeof body.settings === "object" ? body.settings : undefined;
  const settings = incoming ? {
    platforms: Object.fromEntries(Object.entries(incoming.platforms || {}).map(([k, v]: any) => [k, {
      enabled: v?.enabled !== false,
      videosPerDay: Math.max(0, Math.min(1000, Math.floor(Number(v?.videosPerDay) || 0))),
      durationsSeconds: ((Array.from(new Set((Array.isArray(v?.durationsSeconds) ? v.durationsSeconds : []).map((x:any) => Math.floor(Number(x) || 0)).filter((x:number)=>x>=60).map((x:number)=>Math.min(21600, x)))) as number[]).sort((a:number,b:number)=>a-b)),
      trendDriven: v?.trendDriven !== false
    }])),
    promotionEnabled: (hasPerm((access.profile as any)?.permissions, "promotion") || hasPerm((access.profile as any)?.permissions, "autopilot")) && incoming.promotionEnabled !== false
  } : undefined;
  const admin = (await import("@/lib/account/admin")).createAdminClient();
  const { error } = await admin.from("profiles").update({ autopilot_enabled: enabled, ...(settings ? { autopilot_settings: settings } : {}) }).eq("id", access.user!.id).eq("role", "moderator");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, enabled });
}
