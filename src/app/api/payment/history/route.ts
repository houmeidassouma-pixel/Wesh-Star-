import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/account/admin";
import { createClient } from "@/lib/account/server";

export async function GET() {
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { data, error } = await createAdminClient().from("payment_requests")
    .select("id,reference,kind,tier,hours,amount,currency,status,created_at,reviewed_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ payments: [], error: error.message }, { status: 500 });
  return NextResponse.json({ payments: data || [] });
}
