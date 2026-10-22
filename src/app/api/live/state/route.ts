import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { withTransaction } from "@/lib/creator-db";
import { settleDueChests, PRESENCE_WINDOW_SECONDS } from "@/lib/live-db";

// État d'un LIVE : présence, coffres ouverts (règle de partage visible), cadeaux reçus.
export async function GET(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const id = String(new URL(req.url).searchParams.get("sessionId") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const uid = access.user.id;
  const out = await withTransaction(async (c) => {
    await settleDueChests(c, id); // rembourse les coffres expirés avant d'afficher
    const s = await c.query("select s.id,s.title,s.status,s.host_id,s.live_mode,s.guest_limit,p.username,p.email from public.live_sessions s join public.profiles p on p.id=s.host_id where s.id=$1", [id]);
    if (!s.rows[0]) return null;
    const v = await c.query("select count(*)::int n from public.live_participants where session_id=$1 and last_seen_at > now() - make_interval(secs => $2)", [id, PRESENCE_WINDOW_SECONDS]);
    const ch = await c.query(
      `select ch.id, ch.depositor_id, dp.email depositor_email, ch.max_claimants, ch.share_tokens, ch.claimed_count, ch.status, ch.expires_at,
              exists(select 1 from public.chest_claims cc where cc.chest_id=ch.id and cc.user_id=$2) claimed_by_me
         from public.chests ch join public.profiles dp on dp.id=ch.depositor_id
        where ch.session_id=$1 and ch.status='open' order by ch.created_at desc limit 10`, [id, uid]);
    const g = await c.query("select coalesce(sum(tokens),0)::int t, count(*)::int n from public.gift_transactions where live_session_id=$1", [id]);
    const mod = await c.query("select 1 from public.live_session_moderators where session_id=$1 and user_id=$2", [id, uid]);
    const canManageGuests = s.rows[0].host_id === uid || Boolean(mod.rows[0]) || access.isAdmin;
    const guests = await c.query(`select lg.user_id, p.username, p.email, lg.status from public.live_guests lg join public.profiles p on p.id=lg.user_id where lg.session_id=$1 and (lg.status='accepted' or ($2=true and lg.status='pending')) order by lg.requested_at`, [id, canManageGuests]);
    const mods = await c.query("select lsm.user_id,p.username,p.email from public.live_session_moderators lsm join public.profiles p on p.id=lsm.user_id where lsm.session_id=$1 order by lsm.created_at", [id]);
    const myGuest = await c.query("select status from public.live_guests where session_id=$1 and user_id=$2", [id, uid]);
    return { s: s.rows[0], viewers: v.rows[0].n, chests: ch.rows, gifts: g.rows[0], guests: guests.rows, myGuestStatus: myGuest.rows[0]?.status || null, canManageGuests, mods: mods.rows };
  });
  if (!out) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({
    session: { id: out.s.id, title: out.s.title, status: out.s.status, hostId: out.s.host_id, host: String(out.s.username || String(out.s.email || "").split("@")[0]), isHost: out.s.host_id === uid, canManageGuests: out.canManageGuests, liveMode: out.s.live_mode || "solo", guestLimit: Number(out.s.guest_limit || 0) },
    guests: out.guests.filter((x: any) => x.status === "accepted").map((x: any) => ({ id: x.user_id, name: String(x.username || String(x.email || "").split("@")[0]) })),
    pendingGuests: out.canManageGuests ? out.guests.filter((x: any) => x.status === "pending").map((x: any) => ({ id: x.user_id, name: String(x.username || String(x.email || "").split("@")[0]) })) : [],
    moderators: (out.s.host_id === uid || access.isAdmin) ? out.mods.map((x: any) => ({ id: x.user_id, username: x.username || String(x.email || "").split("@")[0] })) : [],
    myGuestStatus: out.myGuestStatus,
    viewers: out.viewers, giftsTokens: out.gifts.t, giftsCount: out.gifts.n,
    chests: out.chests.map((x: any) => ({ id: x.id, depositor: String(x.depositor_email || "").split("@")[0], mine: x.depositor_id === uid, maxClaimants: x.max_claimants, shareTokens: x.share_tokens, claimed: x.claimed_count, remaining: x.max_claimants - x.claimed_count, expiresAt: x.expires_at, claimedByMe: x.claimed_by_me })),
  });
}
