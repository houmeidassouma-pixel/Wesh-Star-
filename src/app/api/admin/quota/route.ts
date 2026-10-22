import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const access = await getAccess();
  if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("adminquota:" + clientKey(req, access.user!.id), 60, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const action = String(body.action || "");
  const minutes = Math.max(0, Math.min(10080, Math.floor(Number(body.minutes) || 0)));
  if (!userId || !["add", "set", "reset-month", "reset-day"].includes(action)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("id,email,role,hour_credits_seconds").eq("id", userId).maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "admin" && userId !== access.user!.id) {
    return NextResponse.json({ error: "Admin account protected" }, { status: 400 });
  }

  const seconds = minutes * 60;
  if (action === "add") {
    const { error } = await admin.rpc("add_hour_credits", { p_user_id: userId, p_seconds: seconds });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: `${minutes} minute(s) ajoutée(s) à ${target.email || "l'utilisateur"} (${minutes * 6} crédits vidéo).` });
  }
  if (action === "set") {
    const { error } = await admin.from("profiles").update({ hour_credits_seconds: seconds }).eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: `Durée définie à ${minutes} minute(s) pour ${target.email || "l'utilisateur"} (${minutes * 6} crédits vidéo).` });
  }

  const now = new Date();
  const period = action === "reset-month" ? now.toISOString().slice(0, 7) : now.toISOString().slice(0, 10);
  const { error } = await admin.from("usage_counters").delete().eq("user_id", userId).eq("period", period);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: `${action === "reset-month" ? "Quota mensuel" : "Quota quotidien"} réinitialisé.` });
}
