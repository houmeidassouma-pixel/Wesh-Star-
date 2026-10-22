import { NextResponse } from "next/server";
import { createClient } from "@/lib/account/server";
import { createAdminClient } from "@/lib/account/admin";
import { appUrl, stripeRequest } from "@/lib/stripe";

export async function POST() {
  try {
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { data: profile } = await createAdminClient().from("profiles").select("stripe_customer_id").eq("id", user.id).single();
    if (!profile?.stripe_customer_id) return NextResponse.json({ error: "NO_STRIPE_CUSTOMER" }, { status: 400 });
    const base = appUrl();
    if (!base) return NextResponse.json({ error: "WESH_APP_URL is not configured" }, { status: 500 });
    const params = new URLSearchParams({ customer: profile.stripe_customer_id, return_url: `${base}/billing` });
    const portal = await stripeRequest<any>("/billing_portal/sessions", params);
    return NextResponse.json({ url: portal.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Stripe portal failed" }, { status: 500 });
  }
}
