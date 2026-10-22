import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { auditLog } from "@/lib/audit";
import { adminAdjust, adminTransfer, listWallets, listWalletEntries } from "@/lib/wallet";

export async function GET() {
  const access = await getAccess();
  if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json({ wallets: await listWallets(), entries: await listWalletEntries(100) }); }
  catch (e: any) { return NextResponse.json({ error: e?.message || "ERROR" }, { status: 500 }); }
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("admin-wallets:" + clientKey(req, access.user!.id), 30, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const adminId = access.user!.id;
  try {
    if (b.action === "adjust") {
      if (!["credit", "debit"].includes(b.direction)) return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
      const r = await adminAdjust({ email: b.email, amount: b.amount, direction: b.direction, reason: b.reason, adminId });
      await auditLog({ actorId: adminId, actorRole: "admin", action: "wallet.adjust", targetType: "user_email", targetId: String(b.email), details: { direction: b.direction, amount: Number(b.amount), reason: String(b.reason || "").slice(0, 300) } });
      return NextResponse.json({ ok: true, ...r });
    }
    if (b.action === "transfer") {
      const r = await adminTransfer({ fromEmail: b.fromEmail, toEmail: b.toEmail, amount: b.amount, reason: b.reason, adminId });
      await auditLog({ actorId: adminId, actorRole: "admin", action: "wallet.transfer", targetType: "user_email", targetId: String(b.fromEmail), details: { to: String(b.toEmail), amount: Number(b.amount), reason: String(b.reason || "").slice(0, 300) } });
      return NextResponse.json({ ok: true, ...r });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "ERROR" }, { status: 400 }); }
}
