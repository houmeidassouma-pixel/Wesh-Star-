import { NextResponse } from "next/server";
import { createClient } from "@/lib/account/server";
import { createAdminClient } from "@/lib/account/admin";
import { getSettings } from "@/lib/settings";
import { appUrl } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/ratelimit";
function apiBase() { return process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"; }
async function accessToken() {
  const id=process.env.PAYPAL_CLIENT_ID, secret=process.env.PAYPAL_CLIENT_SECRET;
  if(!id || !secret) throw new Error("PayPal n'est pas configuré.");
  const r=await fetch(`${apiBase()}/v1/oauth2/token`,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials",cache:"no-store"});
  const d=await r.json(); if(!r.ok) throw new Error(d.error_description||"Échec d'authentification PayPal"); return d.access_token as string;
}
function ref(){return "WS-PP-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,8).toUpperCase();}
export async function POST(req:Request){
 try {
  const db=createClient(); const {data:{user}}=await db.auth.getUser(); if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
  if(!rateLimit("paypal-create:"+clientKey(req,user.id),5,60000))return NextResponse.json({error:"RATE_LIMIT"},{status:429});
  const body=await req.json(); if(body.kind==="subscription")return NextResponse.json({error:"Les abonnements récurrents utilisent Stripe. PayPal abonnement nécessite une configuration de plans distincte."},{status:400});
  const mins=Math.max(1,Math.min(10080,Math.floor(Number(body.minutes)))); const settings=await getSettings(); const pack=(settings.plans.hourTiers||[]).find((x:any)=>x.hours===mins&&x.enabled!==false); if(!pack)return NextResponse.json({error:"Forfait indisponible"},{status:400});
  const base=appUrl(); if(!base)return NextResponse.json({error:"WESH_APP_URL is not configured"},{status:500});
  const reference=ref(); const amount=Number(pack.price); const admin=createAdminClient();
  const ins=await admin.from("payment_requests").insert({user_id:user.id,reference,kind:"minutes",tier:null,hours:mins/60,amount,currency:"EUR",status:"pending"}); if(ins.error)throw new Error(ins.error.message);
  const token=await accessToken(); const r=await fetch(`${apiBase()}/v2/checkout/orders`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json","PayPal-Request-Id":reference},body:JSON.stringify({intent:"CAPTURE",purchase_units:[{reference_id:reference,custom_id:reference,description:`Wesh Star IA — ${mins*6} crédits vidéo`,amount:{currency_code:"EUR",value:amount.toFixed(2)}}],application_context:{brand_name:"Wesh Star IA",user_action:"PAY_NOW",return_url:`${base}/api/payments/paypal/capture?reference=${encodeURIComponent(reference)}`,cancel_url:`${base}/pricing?payment=cancelled`}}),cache:"no-store"});
  const data=await r.json(); if(!r.ok)throw new Error(data.message||"Création du paiement PayPal impossible"); const approve=data.links?.find((x:any)=>x.rel==="approve")?.href; if(!approve)throw new Error("Lien d'approbation PayPal absent");
  return NextResponse.json({checkoutUrl:approve,reference,tokens:mins*6});
 }catch(e:any){return NextResponse.json({error:e.message||"PayPal error"},{status:500});}
}
