import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { hasPerm } from "@/lib/permissions";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/account/admin";

// Warn or block/unblock a user. Admin always; moderators need the matching
// granular permission ('warn' / 'block'). Every action is logged.
export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!rateLimit("useract:" + clientKey(req, access.user!.id), 30, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  const { userId, action } = await req.json();
  if (!userId || !["warn", "block", "unblock", "verify", "unverify"].includes(action)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Blue badge: only the Admin (owner) decides, never moderators.
  if ((action === "verify" || action === "unverify") && !access.isAdmin) {
    return NextResponse.json({ error: "Forbidden — only the Admin can grant the blue badge" }, { status: 403 });
  }

  const ok = access.isAdmin
    || (action === "warn" && access.modPerms.warn)
    || ((action === "block" || action === "unblock") && access.modPerms.block);
  if (!ok) return NextResponse.json({ error: "Forbidden — missing permission" }, { status: 403 });

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role,email,warnings").eq("id", userId).single();
  const isBadge = action === "verify" || action === "unverify";
  if (!target || (target.role === "admin" && !isBadge)) return NextResponse.json({ error: "admin accounts are protected" }, { status: 400 });

  if (isBadge) {
    await admin.from("profiles").update({ verified_badge: action === "verify" }).eq("id", userId);
    await admin.from("moderation_log").insert({ user_id: access.user!.id, email: access.user!.email, prompt: "— " + (action === "verify" ? "blue badge granted to " : "blue badge removed from ") + target.email + " —", reason: "badge " + action });
    return NextResponse.json({ ok: true });
  }

  if (action === "warn") {
    await admin.from("profiles").update({ warnings: (target.warnings || 0) + 1 }).eq("id", userId);
    await admin.from("moderation_log").insert({ user_id: access.user!.id, email: access.user!.email, prompt: "— warning for " + target.email + " —", reason: "warning #" + ((target.warnings || 0) + 1) });
  } else {
    await admin.from("profiles").update({ blocked: action === "block" }).eq("id", userId);
    await admin.from("moderation_log").insert({ user_id: access.user!.id, email: access.user!.email, prompt: "— " + (action === "block" ? "blocked" : "unblocked") + " " + target.email + " —", reason: "account " + action });
  }
  return NextResponse.json({ ok: true });
}
