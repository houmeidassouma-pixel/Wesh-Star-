import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/account/admin";
import { createClient } from "@/lib/account/server";
import { getSettings } from "@/lib/settings";

export async function GET(req: Request) {
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const reference = new URL(req.url).searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  const { data, error } = await createAdminClient().from("payment_requests").select("*").eq("reference", reference).eq("user_id", user.id).single();
  if (error || !data) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json({ payment: { ...data, method: process.env.WESH_PAYMENT_METHOD_NAME || "Wesh Star IA Direct", accountName: process.env.WESH_PAYMENT_ACCOUNT_NAME || "Wesh Star IA", iban: process.env.WESH_PAYMENT_IBAN || "", bic: process.env.WESH_PAYMENT_BIC || "", instructions: process.env.WESH_PAYMENT_INSTRUCTIONS || "Utilisez la référence comme motif de paiement." }, settings: await getSettings() });
}
