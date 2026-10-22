import { NextResponse } from "next/server";
import { createClient } from "@/lib/account/server";
import { appUrl } from "@/lib/stripe";
import { verifyFlutterwaveTransaction, settleFlutterwave, FW_PREFIX } from "@/lib/payments/flutterwave";

// Retour du client après le paiement Flutterwave : on revérifie la transaction côté serveur avant d'activer quoi que ce soit.
export async function GET(req: Request) {
  const base = appUrl();
  try {
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.redirect(`${base}/login`);
    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transaction_id");
    const txRef = url.searchParams.get("tx_ref");
    const status = url.searchParams.get("status");
    if (status !== "successful" || !transactionId || !txRef) return NextResponse.redirect(`${base}/billing?payment=cancelled`);
    const tx = await verifyFlutterwaveTransaction(transactionId);
    const done = await settleFlutterwave(txRef, tx, user.id);
    if (!done.ok) throw new Error(done.error);
    const dest = txRef.startsWith(FW_PREFIX.coins) ? `${base}/coins?purchase=success` : `${base}/billing?payment=success`;
    return NextResponse.redirect(dest);
  } catch {
    return NextResponse.redirect(`${base}/billing?payment=verification_failed`);
  }
}
