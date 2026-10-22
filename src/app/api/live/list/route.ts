import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { getEconomy } from "@/lib/creator-db";
import { PRESENCE_WINDOW_SECONDS } from "@/lib/live-db";

export async function GET() {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const eco = await getEconomy();
  if (!eco.live.enabled) return NextResponse.json({ enabled: false, sessions: [] });
  const r = await query(
    `select s.id, s.title, s.started_at, s.host_id, s.live_mode, s.guest_limit, p.email,
            exists(select 1 from public.promotion_campaigns pc where pc.target_type='live' and pc.target_id=s.id and pc.status='active' and pc.ends_at > now()) as promoted,
            (select count(*)::int from public.live_participants lp where lp.session_id=s.id and lp.last_seen_at > now() - make_interval(secs => $1)) viewers
       from public.live_sessions s join public.profiles p on p.id=s.host_id
      where s.status='live' and p.blocked=false order by exists(select 1 from public.promotion_campaigns pc where pc.target_type='live' and pc.target_id=s.id and pc.status='active' and pc.ends_at > now()) desc, s.started_at desc limit 50`, [PRESENCE_WINDOW_SECONDS]);
  return NextResponse.json({ enabled: true, me: access.user.id, sessions: r.rows.map((x: any) => ({ id: x.id, title: x.title, startedAt: x.started_at, hostId: x.host_id, host: String(x.email || "").split("@")[0], viewers: x.viewers, liveMode: x.live_mode || "solo", guestLimit: Number(x.guest_limit || 0), promoted: !!x.promoted })) });
}
