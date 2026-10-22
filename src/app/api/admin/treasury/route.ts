import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { rateLimit, clientKey } from "@/lib/ratelimit";
import { auditLog } from "@/lib/audit";
import { getBalances, listEntries, createPayout, settlePayout, convertXofToEur, xofPerEur, listBeneficiaries, addBeneficiary, removeBeneficiary, getIncomeBySource, OPERATORS } from "@/lib/treasury";

export async function GET() {
  const access = await getAccess();
  if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json({
      balances: await getBalances(), entries: await listEntries(100), beneficiaries: await listBeneficiaries(), income: await getIncomeBySource(), rate: xofPerEur(),
      provider: process.env.WESH_PAYOUT_PROVIDER || "manual"
    });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "ERROR" }, { status: 500 }); }
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (access.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("admin-treasury:" + clientKey(req, access.user!.id), 20, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const adminId = access.user!.id;
  try {
    if (body.action === "add_beneficiary") {
      const op = OPERATORS.includes(body.operator) ? body.operator : "autre";
      const r = await addBeneficiary({ label: body.label, name: body.name, phone: body.phone, account: body.account, operator: op, adminId });
      await auditLog({ actorId: adminId, actorRole: "admin", action: "treasury.beneficiary_add", targetType: "treasury_beneficiary", targetId: r.id, details: { operator: op } });
      return NextResponse.json({ ok: true, id: r.id, message: "✅ Bénéficiaire enregistré" });
    }
    if (body.action === "remove_beneficiary") {
      await removeBeneficiary(String(body.id));
      await auditLog({ actorId: adminId, actorRole: "admin", action: "treasury.beneficiary_remove", targetType: "treasury_beneficiary", targetId: String(body.id) });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "payout") {
      const op = OPERATORS.includes(body.operator) ? body.operator : "autre";
      const r = await createPayout({ amount: body.amount, phone: body.phone, account: body.account, operator: op, name: body.name, beneficiaryId: body.beneficiaryId ? String(body.beneficiaryId) : undefined, adminId });
      await auditLog({ actorId: adminId, actorRole: "admin", action: "treasury.payout", targetType: "treasury_ledger", targetId: String((r as any).id || ""), details: { amount: Number(body.amount), operator: op, status: (r as any).status } });
      return NextResponse.json({ ok: true, ...r });
    }
    if (body.action === "settle") {
      if (!["completed", "failed"].includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      await settlePayout(String(body.id), body.status);
      await auditLog({ actorId: adminId, actorRole: "admin", action: "treasury.settle", targetType: "treasury_ledger", targetId: String(body.id), details: { status: body.status } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "convert") {
      const r = await convertXofToEur({ amountXof: body.amount, all: body.all === true, adminId });
      await auditLog({ actorId: adminId, actorRole: "admin", action: "treasury.convert_xof_eur", details: { ...r } });
      return NextResponse.json({ ok: true, ...r });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "ERROR" }, { status: 400 }); }
}
