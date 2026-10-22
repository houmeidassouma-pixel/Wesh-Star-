import { NextResponse } from "next/server";
import { createClient } from "@/lib/account/server";
import { fulfillPaidPack } from "@/lib/payments/fulfill";
import { appUrl } from "@/lib/stripe";
function apiBase(){return process.env.PAYPAL_ENV==="live"?"https://api-m.paypal.com":"https://api-m.sandbox.paypal.com";}
export async function GET(req:Request){
 const base=appUrl(); try {
  const db=createClient(); const {data:{user}}=await db.auth.getUser(); if(!user)return NextResponse.redirect(`${base}/login`);
  const url=new URL(req.url); const reference=url.searchParams.get("reference"); const orderId=url.searchParams.get("token"); if(!reference||!orderId)return NextResponse.redirect(`${base}/pricing?payment=invalid`);
  const {data:payment}=await (await import("@/lib/account/admin")).createAdminClient().from("payment_requests").select("user_id,reference,amount,currency").eq("reference",reference).single(); if(!payment||payment.user_id!==user.id)return NextResponse.redirect(`${base}/pricing?payment=invalid`);
  const id=process.env.PAYPAL_CLIENT_ID,secret=process.env.PAYPAL_CLIENT_SECRET;if(!id||!secret)throw new Error("PayPal configuration missing");
  const tr=await fetch(`${apiBase()}/v1/oauth2/token`,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials",cache:"no-store"});const td=await tr.json();if(!tr.ok)throw new Error("PayPal auth failed");
  const cr=await fetch(`${apiBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,{method:"POST",headers:{Authorization:`Bearer ${td.access_token}`,"Content-Type":"application/json","PayPal-Request-Id":`capture-${reference}`},body:"{}",cache:"no-store"});const captured=await cr.json();
  if(!cr.ok&&captured.status!=="COMPLETED")throw new Error(captured.message||"PayPal capture failed");
  const unit=captured.purchase_units?.[0];const cap=unit?.payments?.captures?.[0];const paid=Number(cap?.amount?.value);if(captured.status!=="COMPLETED"||unit?.custom_id!==reference||cap?.status!=="COMPLETED"||cap?.amount?.currency_code!==payment.currency||Math.abs(paid-Number(payment.amount))>0.01)throw new Error("PayPal payment verification failed");
  const result=await fulfillPaidPack(reference,String(cap.id||orderId));if(!result.ok)throw new Error(result.error);
  return NextResponse.redirect(`${base}/billing?payment=success`);
 }catch(e:any){return NextResponse.redirect(`${base}/billing?payment=verification_failed`);}
}
