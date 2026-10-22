import { query } from "@/lib/db/pool";

// Journal d'audit des opérations sensibles. Ne doit jamais faire échouer l'opération
// métier : en cas d'erreur d'écriture on journalise sur la console et on continue.
// Ne jamais y mettre de secret, de mot de passe ni de numéro de carte.
export async function auditLog(entry: {
  actorId?: string | null; actorRole?: string | null; action: string;
  targetType?: string; targetId?: string; details?: Record<string, unknown>;
}, client?: { query: Function }) {
  try {
    const q = client ? client.query.bind(client) : query;
    await q(
      "insert into public.audit_log (actor_id, actor_role, action, target_type, target_id, details) values ($1,$2,$3,$4,$5,$6)",
      [entry.actorId || null, entry.actorRole || null, entry.action, entry.targetType || null, entry.targetId || null, JSON.stringify(entry.details || {})]
    );
  } catch (e: any) {
    console.error("[audit] écriture impossible:", entry.action, e?.message || e);
  }
}
