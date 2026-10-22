import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  const paypal = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  const flutterwave = Boolean(process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_SECRET_HASH);
  const direct = Boolean(process.env.WESH_PAYMENT_IBAN || process.env.WESH_MOBILE_MONEY_MTN || process.env.WESH_MOBILE_MONEY_MOOV);
  return NextResponse.json({ methods: [
    { id: "stripe", label: "Carte bancaire · Apple Pay · Google Pay · moyens locaux disponibles via Stripe", configured: stripe, recurring: true },
    { id: "paypal", label: "PayPal", configured: paypal, recurring: false },
    { id: "flutterwave", label: "Mobile Money et moyens locaux pris en charge par Flutterwave", configured: flutterwave, recurring: false },
    { id: "direct", label: "Virement bancaire / Mobile Money manuel", configured: direct, recurring: false }
  ] }, { headers: { "Cache-Control": "no-store" } });
}
