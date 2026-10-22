import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/account/admin";
import { MOD_PERMISSIONS } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";

// Main-admin management of moderators: appoint (by username), edit granular
// permissions, or remove the moderator role. Admin-only.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("mods:" + clientKey(req, access.user!.id), 30, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  const settings = await getSettings();
  const { username, userId, permissions, action } = await req.json();
  if (settings.site.allowModeratorAccounts === false && action !== "remove") return NextResponse.json({ error: "Moderator accounts are disabled by the owner" }, { status: 403 });
  const allowed = MOD_PERMISSIONS.map((p) => p.key);
  const perms = (Array.isArray(permissions) ? permissions : []).filter((k: string) => allowed.includes(k as any));

  const admin = createAdminClient();

  if (action === "remove") {
    if (!userId) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    await admin.from("profiles").update({ role: "user", permissions: [], autopilot_enabled: false }).eq("id", userId);
    await admin.from("moderation_log").insert({ user_id: access.user!.id, email: access.user!.email, prompt: "—", reason: "moderator removed by admin" });
    return NextResponse.json({ ok: true });
  }

  // Appoint only an existing Wesh Star IA account, looked up by public username.
  let targetId = userId as string | undefined;
  const normalizedUsername = username ? String(username).trim().replace(/^@/, "").toLowerCase() : "";
  if (!targetId && normalizedUsername) {
    if (!/^[a-z0-9_]{2,32}$/.test(normalizedUsername)) return NextResponse.json({ error: "Nom d’utilisateur invalide." }, { status: 400 });
    const { data: u } = await admin.from("profiles").select("id").ilike("username", normalizedUsername).maybeSingle();
    targetId = u?.id;
  }
  if (!targetId) return NextResponse.json({ error: "Compte introuvable. La personne doit d’abord créer son compte Wesh Star IA." }, { status: 404 });

  // cannot modify other admins
  const { data: target } = await admin.from("profiles").select("role").eq("id", targetId).single();
  if (!target || target.role === "admin") return NextResponse.json({ error: "admin accounts are protected" }, { status: 400 });

  const { error: profileError } = await admin.from("profiles").update({ role: "moderator", permissions: perms, ...(perms.includes("autopilot") ? {} : { autopilot_enabled: false }) }).eq("id", targetId);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  await admin.from("moderation_log").insert({ user_id: access.user!.id, email: access.user!.email, prompt: "—", reason: "moderator " + (action === "edit" ? "permissions updated" : "appointed") + " [" + perms.join(",") + "]" });
  return NextResponse.json({ ok: true, permissions: perms });
}
