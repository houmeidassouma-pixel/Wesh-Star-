import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function GET() {
  const access = await getAccess();
  if (!access.isAdmin || !access.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await query(`select a.id,a.user_id,a.status,a.submitted_at,a.reviewed_at,a.review_note,p.username,p.email,p.country_code,p.creator_age_verified,p.blocked,(select count(*)::int from community_follows f where f.following_id=p.id) followers,(select count(*)::int from creator_video_views v where v.creator_id=p.id and v.qualified_at>=now()-interval '30 days') qualified_views_30d from creator_monetization_applications a join profiles p on p.id=a.user_id order by case when a.status='pending' then 0 else 1 end,a.submitted_at desc limit 200`);
  return NextResponse.json({ applications: result.rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.isAdmin || !access.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("admin-creator-country:" + clientKey(req, access.user.id), 60, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ error: "INVALID_USER" }, { status: 400 });
  const action = String(body.action || "country");
  if (action === "review") {
    const status = String(body.status || "");
    const note = String(body.note || "").trim().slice(0, 500);
    if (!["approved", "rejected", "suspended"].includes(status)) return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
    const app = await query("select id from creator_monetization_applications where user_id=$1", [userId]);
    if (!app.rows[0]) return NextResponse.json({ error: "APPLICATION_NOT_FOUND" }, { status: 404 });
    if (status === "approved") {
      const [p, f, v, qv] = await Promise.all([
        query("select country_code,creator_age_verified,blocked from profiles where id=$1", [userId]),
        query("select count(*)::int n from community_follows where following_id=$1", [userId]),
        query("select count(*)::int n from creator_video_views v join community_posts p on p.id=v.post_id join generations g on g.id=p.generation_id where v.creator_id=$1 and v.qualified_at>=now()-interval '30 days' and p.status='published' and p.visibility='public' and g.target_seconds>=61", [userId]),
        query("select count(*)::int n from (select p.id from community_posts p join generations g on g.id=p.generation_id left join creator_video_views v on v.post_id=p.id and v.creator_id=$1 and v.qualified_at is not null where p.user_id=$1 and p.status='published' and p.visibility='public' and g.target_seconds>=61 group by p.id having count(v.id)>=1000) q", [userId]),
      ]);
      const profile = p.rows[0] || {};
      const allowed = String(process.env.WESH_MONETIZATION_COUNTRIES || "").split(",").map(x => x.trim().toUpperCase()).filter(Boolean);
      const checksPass = Boolean(profile.creator_age_verified) && !profile.blocked && allowed.includes(String(profile.country_code || "").toUpperCase()) && Number(f.rows[0]?.n || 0) >= 10000 && Number(v.rows[0]?.n || 0) >= 100000 && Number(qv.rows[0]?.n || 0) >= 1;
      if (!checksPass) return NextResponse.json({ error: "ELIGIBILITY_CHECK_FAILED", message: "Le compte ne remplit pas tous les critères actuels; vérifie l’âge, le pays, les abonnés, les vues des 30 derniers jours et les vidéos qualifiantes." }, { status: 400 });
    }
    await query("update creator_monetization_applications set status=$1,reviewed_at=now(),reviewed_by=$2,review_note=$3 where user_id=$4", [status, access.user.id, note, userId]);
    await query("update profiles set creator_monetization_status=$1 where id=$2", [status, userId]);
    return NextResponse.json({ ok: true, status });
  }
  const countryCode = String(body.countryCode || "").trim().toUpperCase();
  const ageVerified = body.ageVerified === true;
  if ((countryCode && !/^[A-Z]{2}$/.test(countryCode))) return NextResponse.json({ error: "INVALID_COUNTRY" }, { status: 400 });
  await query("update profiles set country_code=$1, creator_age_verified=$2 where id=$3", [countryCode || null, ageVerified, userId]);
  return NextResponse.json({ ok: true, countryCode: countryCode || null, ageVerified });
}
