import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const access = await getAccess();
  if (!access.isAdmin || !access.user) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  await query(`update public.promotion_campaigns set status='completed',updated_at=now() where status='active' and ends_at is not null and ends_at <= now()`);
  const result = await query(`select c.*,p.email from public.promotion_campaigns c left join public.profiles p on p.id=c.user_id order by (c.status='pending_review') desc,c.created_at desc limit 500`);
  return NextResponse.json({ campaigns: result.rows });
}

export async function PATCH(req: Request) {
  const access = await getAccess();
  if (!access.isAdmin || !access.user) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = String(body.action || "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approve","reject","pause","resume"].includes(action)) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const map: Record<string,string> = { approve: "active", reject: "rejected", pause: "paused", resume: "active" };
  const required = action === "approve" ? "pending_review" : action === "resume" ? "paused" : action === "pause" ? "active" : "pending_review";
  const result = await query(`update public.promotion_campaigns set status=$3,reviewed_by=$4,reviewed_at=now(),starts_at=case when $3='active' and starts_at is null then now() else starts_at end,ends_at=case when $3='active' and (ends_at is null or ends_at < now()) then now() + (duration_hours * interval '1 hour') else ends_at end,updated_at=now() where id=$1 and status=$2 returning id,status`, [id,required,map[action],access.user.id]);
  if (!result.rows.length) return NextResponse.json({ error: "CAMPAIGN_NOT_IN_EXPECTED_STATE" }, { status: 409 });
  await auditLog({ actorId: access.user.id, actorRole: "admin", action: "promotion." + action, targetType: "promotion_campaign", targetId: id });
  return NextResponse.json({ ok: true, campaign: result.rows[0] });
}
