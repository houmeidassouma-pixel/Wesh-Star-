import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/account/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const access = await getAccess();
  if (access.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit("admin:" + clientKey(req, access.user!.id), 60, 60_000)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }
  const { userId, role } = await req.json();
  if (!userId || !["user", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  // Safety: an admin cannot change their own role (prevents locking everyone out).
  if (userId === access.user!.id) {
    return NextResponse.json({ error: "cannot change own role" }, { status: 400 });
  }
  const patch: Record<string, unknown> = { role };
  // Demoting to a plain user also clears staff permissions and autopilot.
  if (role === "user") { patch.permissions = []; patch.autopilot_enabled = false; }
  await createAdminClient().from("profiles").update(patch).eq("id", userId);
  return NextResponse.json({ ok: true });
}
