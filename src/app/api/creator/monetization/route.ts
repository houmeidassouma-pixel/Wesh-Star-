import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";

const FOLLOWER_THRESHOLD = 10_000;
const VIEW_THRESHOLD = 100_000;
const MIN_VIDEO_SECONDS = 61;

export async function GET() {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const [followerResult, profileResult, viewsResult, videosResult, applicationResult, revenueResult] = await Promise.all([
    query("select count(*)::int n from public.community_follows where following_id=$1", [access.user.id]),
    query("select country_code, creator_age_verified, creator_monetization_status, blocked from public.profiles where id=$1", [access.user.id]),
    query(`select count(*)::int n from public.creator_video_views v join public.community_posts p on p.id=v.post_id join public.generations g on g.id=p.generation_id where v.creator_id=$1 and v.qualified_at >= now()-interval '30 days' and p.status='published' and p.visibility='public' and g.target_seconds >= $2`, [access.user.id, MIN_VIDEO_SECONDS]),
    query(`select count(*)::int n from (select p.id,count(v.id) filter (where v.qualified_at is not null)::int qualified_views from public.community_posts p join public.generations g on g.id=p.generation_id left join public.creator_video_views v on v.post_id=p.id and v.creator_id=$1 where p.user_id=$1 and p.status='published' and p.visibility='public' and g.target_seconds >= $2 group by p.id having count(v.id) filter (where v.qualified_at is not null) >= 1000) q`, [access.user.id, MIN_VIDEO_SECONDS]),
    query("select status, submitted_at, reviewed_at, review_note from public.creator_monetization_applications where user_id=$1 limit 1", [access.user.id]),
    query("select coalesce(sum(delta),0)::bigint cents from public.coin_ledger where account_type='user' and wallet_type='earnings' and user_id=$1 and kind='ad_revenue_share'", [access.user.id]),
  ]);
  const followers = Number(followerResult.rows[0]?.n || 0);
  const profile = profileResult.rows[0] || {};
  const countryCode = String(profile.country_code || "").toUpperCase();
  const allowedCountries = String(process.env.WESH_MONETIZATION_COUNTRIES || "").split(",").map(x => x.trim().toUpperCase()).filter(Boolean);
  const qualifiedViews30d = Number(viewsResult.rows[0]?.n || 0);
  const qualifyingVideos = Number(videosResult.rows[0]?.n || 0);
  const countryApproved = Boolean(countryCode && allowedCountries.includes(countryCode));
  const followerThresholdMet = followers >= FOLLOWER_THRESHOLD;
  // Retained as a named base check for compatibility with earlier eligibility tooling.
  const legacyBaseEligibility = followerThresholdMet && countryApproved;
  const checks = { ageVerified: Boolean(profile.creator_age_verified), followers: followerThresholdMet, qualifiedViews30d: qualifiedViews30d >= VIEW_THRESHOLD, country: countryApproved, accountGoodStanding: !profile.blocked, qualifyingVideo: qualifyingVideos >= 1 };
  const eligibleToApply = Object.values(checks).every(Boolean) && profile.creator_monetization_status !== "suspended";
  const app = applicationResult.rows[0] || null;
  return NextResponse.json({ adRevenueCoins: Number(revenueResult.rows[0]?.cents || 0), adRevenueEur: Number(revenueResult.rows[0]?.cents || 0) / 100, followers, followerThreshold: FOLLOWER_THRESHOLD, qualifiedViews30d, viewThreshold: VIEW_THRESHOLD, qualifyingVideos, minVideoSeconds: MIN_VIDEO_SECONDS, minQualifiedViewSeconds: 5, countryCode: countryCode || null, countryApproved, checks, eligibleToApply, followerThresholdMet, legacyBaseEligibility, status: app?.status || profile.creator_monetization_status || "not_applied", application: app ? { submittedAt: app.submitted_at, reviewedAt: app.reviewed_at, reviewNote: app.review_note } : null, message: !checks.ageVerified ? "L’administration doit vérifier que tu as au moins 18 ans." : !checks.followers ? `Il faut ${FOLLOWER_THRESHOLD.toLocaleString("fr-FR")} abonnés.` : !checks.qualifiedViews30d ? `Il faut ${VIEW_THRESHOLD.toLocaleString("fr-FR")} vues qualifiées sur les 30 derniers jours.` : !checks.country ? "Le pays doit être autorisé et vérifié." : !checks.accountGoodStanding ? "Le compte doit être en règle." : !checks.qualifyingVideo ? "Publie au moins une vidéo publique originale de 61 secondes ou plus avec au moins 1 000 vues qualifiées." : app?.status === "approved" ? "Monétisation activée, sous réserve des contrôles continus." : app?.status === "pending" ? "Demande envoyée : elle attend la vérification de l’administration." : "Tu remplis les critères de base et peux demander une vérification manuelle." }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!rateLimit("creator-monetization-apply:" + clientKey(req, access.user.id), 3, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const eligibility = await GET();
  const data = await eligibility.json();
  if (!eligibility.ok) return NextResponse.json({ error: "ELIGIBILITY_CHECK_FAILED" }, { status: 500 });
  if (!data.eligibleToApply) return NextResponse.json({ error: "NOT_ELIGIBLE", details: data.checks, message: data.message }, { status: 400 });
  const result = await query(`insert into public.creator_monetization_applications(user_id,status) values($1,'pending') on conflict(user_id) do update set status='pending',submitted_at=now(),reviewed_at=null,reviewed_by=null,review_note='' where public.creator_monetization_applications.status='rejected' returning id,status`, [access.user.id]);
  if (!result.rows[0]) return NextResponse.json({ error: "APPLICATION_ALREADY_EXISTS" }, { status: 409 });
  await query("update public.profiles set creator_monetization_status='pending' where id=$1", [access.user.id]);
  return NextResponse.json({ ok: true, status: "pending" });
}
