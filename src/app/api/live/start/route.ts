import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { getEconomy } from "@/lib/creator-db";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("live-start:" + clientKey(req, access.user.id), 5, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  if (!(await getEconomy()).live.enabled) return NextResponse.json({ error: "LIVE_DISABLED" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "LIVE").trim().slice(0, 80) || "LIVE";
  const liveMode = body.liveMode === "guests" ? "guests" : "solo";
  const guestLimit = liveMode === "guests" ? Math.max(1, Math.min(9, Math.floor(Number(body.guestLimit) || 1))) : 0;
  try {
    // L'index unique partiel uq_live_one_active_per_host garantit un seul LIVE actif par hôte.
    const r = await query("insert into public.live_sessions (host_id,title,live_mode,guest_limit) values ($1,$2,$3,$4) returning id", [access.user.id, title, liveMode, guestLimit]);
    return NextResponse.json({ ok: true, sessionId: r.rows[0].id, liveMode, guestLimit });
  } catch (e: any) {
    if (e?.code === "23505") return NextResponse.json({ error: "ALREADY_LIVE" }, { status: 409 });
    console.error("[live-start]", e?.message || e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
