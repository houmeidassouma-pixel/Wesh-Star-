import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";

// Sons favoris de l'utilisateur (uniquement ceux encore actifs et réutilisables).
export async function GET() {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const r = await query(
    `select s.id, s.title, s.uses_count, pr.email as owner_email
       from public.sound_favorites f join public.sounds s on s.id=f.sound_id join public.profiles pr on pr.id=s.owner_id
      where f.user_id=$1 and s.status='active'
        and (s.owner_id=$1 or (s.allow_reuse and exists(select 1 from public.community_posts p where p.sound_id=s.id and p.status='published' and p.visibility='public')))
      order by f.created_at desc limit 100`, [access.user.id]);
  return NextResponse.json({ sounds: r.rows.map((x: any) => ({ id: x.id, title: x.title, uses: x.uses_count, creator: String(x.owner_email || "").split("@")[0] })) });
}
