import { NextResponse } from "next/server";
import { verifyFlutterwaveTransaction, settleFlutterwave, safeEqualText } from "@/lib/payments/flutterwave";

export const dynamic = "force-dynamic";

// Webhook Flutterwave : active l'achat même si le client ferme son navigateur avant le retour sur le site.
// À configurer dans le tableau de bord Flutterwave : URL = https://TON-SITE/api/payments/flutterwave/webhook,
// et « Secret hash » = la valeur de FLUTTERWAVE_SECRET_HASH.
export async function POST(req: Request) {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH || "";
  const received = req.headers.get("verif-hash") || "";
  if (secretHash.length < 16 || !received || !safeEqualText(received, secretHash)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  try {
    const event = await req.json();
    if (event?.event !== "charge.completed" || event?.data?.status !== "successful") return NextResponse.json({ ok: true, ignored: true });
    const transactionId = String(event.data.id || "");
    const txRef = String(event.data.tx_ref || "");
    if (!transactionId || !txRef) return NextResponse.json({ ok: true, ignored: true });
    const tx = await verifyFlutterwaveTransaction(transactionId); // on ne croit jamais le corps du webhook seul
    const done = await settleFlutterwave(txRef, tx);
    // 200 aussi pour une référence inconnue (autre produit du même compte) afin d'éviter les renvois en boucle.
    if (!done.ok && ["PURCHASE_NOT_FOUND", "PLAN_PAYMENT_NOT_FOUND", "PAYMENT_NOT_FOUND", "UNKNOWN_REFERENCE"].includes(String(done.error))) return NextResponse.json({ ok: true, ignored: true });
    if (!done.ok) return NextResponse.json({ error: done.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "WEBHOOK_FAILED" }, { status: 500 });
  }
}
