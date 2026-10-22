import { query, withTransaction } from "@/lib/db/pool";
import { normalizeEconomy, defaultEconomy, TOKEN_SECONDS, type CreatorEconomy } from "@/lib/creator-economy";

const KEY = "creator_economy";

export async function getEconomy(): Promise<CreatorEconomy> {
  try {
    const r = await query("select value from public.site_settings where key=$1", [KEY]);
    return normalizeEconomy(r.rows[0]?.value);
  } catch { return defaultEconomy; }
}

export async function saveEconomy(raw: unknown): Promise<CreatorEconomy> {
  const eco = normalizeEconomy(raw);
  await query(
    `insert into public.site_settings (key, value, updated_at) values ($1,$2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [KEY, JSON.stringify(eco)]
  );
  return eco;
}

export async function tokenBalance(userId: string): Promise<number> {
  const r = await query("select hour_credits_seconds s from public.profiles where id=$1", [userId]);
  return Math.floor(Number(r.rows[0]?.s || 0) / TOKEN_SECONDS);
}

export async function unlockedEffects(userId: string): Promise<string[]> {
  const r = await query("select effect_id from public.effect_unlocks where user_id=$1", [userId]);
  return r.rows.map((x: any) => x.effect_id);
}

// Un son est réutilisable s'il est actif, autorisé à la réutilisation et (propriétaire OU rattaché à une vidéo publique publiée).
export async function getReusableSound(soundId: string, userId: string, isAdmin = false) {
  const r = await query(
    `select s.* from public.sounds s where s.id=$1 and s.status='active'
       and ($3 or s.owner_id=$2 or (s.allow_reuse and exists(select 1 from public.community_posts p where p.sound_id=s.id and p.status='published' and p.visibility='public')))`,
    [soundId, userId, isAdmin]
  );
  return r.rows[0] || null;
}

export { withTransaction };
