import { NextResponse } from "next/server";
import { createClient } from "@/lib/account/server";
import { createAdminClient } from "@/lib/account/admin";
import { getSettings } from "@/lib/settings";
import { appUrl, stripeRequest } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/ratelimit";
function ref(){return "WS-ST-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,8).toUpperCase();}
export async function POST(req:Request){try{
 const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required"},{status:401});if(!rateLimit("stripe-pack:"+clientKey(req,user.id),5,60000))return NextResponse.json({error:"RATE_LIMIT"},{status:429});
 const body=await req.json();const minutes=Math.max(1,Math.min(10080,Math.floor(Number(body.minutes))));const settings=await getSettings();const pack=(settings.plans.hourTiers||[]).find((x:any)=>x.hours===minutes&&x.enabled!==false);if(!pack)return NextResponse.json({error:"Forfait indisponible"},{status:400});const amount=Number(pack.price);if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:"Prix invalide"},{status:400});const base=appUrl();if(!base)return NextResponse.json({error:"WESH_APP_URL is not configured"},{status:500});
 const reference=ref();const admin=createAdminClient();const ins=await admin.from("payment_requests").insert({user_id:user.id,reference,kind:"minutes",tier:null,hours:minutes/60,amount,currency:String(process.env.WESH_PAYMENT_CURRENCY||"EUR").toUpperCase(),status:"pending"});if(ins.error)throw new Error(ins.error.message);
 const params=new URLSearchParams();params.set("mode","payment");params.set("success_url",`${base}/billing?stripe=success`);params.set("cancel_url",`${base}/pricing?stripe=cancelled`);params.set("line_items[0][price_data][currency]",String(process.env.WESH_PAYMENT_CURRENCY||"eur").toLowerCase());params.set("line_items[0][price_data][unit_amount]",String(Math.round(amount*100)));params.set("line_items[0][price_data][product_data][name]",`Wesh Star IA — ${minutes*6} crédits vidéo`);params.set("line_items[0][quantity]","1");params.set("client_reference_id",reference);params.set("metadata[payment_reference]",reference);params.set("metadata[user_id]",user.id);params.set("metadata[minutes]",String(minutes));if(user.email)params.set("customer_email",user.email);
 const session=await stripeRequest<any>("/checkout/sessions",params);return NextResponse.json({checkoutUrl:session.url,reference,tokens:minutes*6});
}catch(e:any){return NextResponse.json({error:e.message||"Stripe checkout failed"},{status:500});}}
