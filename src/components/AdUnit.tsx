"use client";
import { useEffect, useState } from "react";

type Ad = { id:string; advertiser:string; title:string; description:string; landingUrl:string; imageUrl:string; label:string };
export default function AdUnit({ context="Wesh Star IA" }: { context?: string }) {
  const [ad,setAd]=useState<Ad|null>(null); const [menu,setMenu]=useState(false); const [prefs,setPrefs]=useState<any>(null);
  useEffect(()=>{ fetch('/api/ads/serve?context='+encodeURIComponent(context)).then(r=>r.json()).then(x=>{if(x.ad){setAd(x.ad); fetch('/api/ads/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId:x.ad.id,event:'impression'})}).catch(()=>{});}}).catch(()=>{}); },[context]);
  if(!ad) return null;
  const updatePrefs=async (patch:any)=>{const next={...(prefs||{}),...patch};setPrefs(next);await fetch('/api/ads/preferences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)}).catch(()=>{});};
  const hide=async()=>{await fetch('/api/ads/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId:ad.id,event:'hide'})}).catch(()=>{});const r=await fetch('/api/ads/preferences').then(x=>x.json()).catch(()=>({preferences:{hiddenCampaignIds:[]}}));const ids=[...(r.preferences?.hiddenCampaignIds||[]),ad.id];await updatePrefs({hiddenCampaignIds:ids.filter((x:string,i:number,a:string[])=>a.indexOf(x)===i)});setAd(null);};
  return <aside className="card relative overflow-hidden border-zinc-700/70 p-4" aria-label="Publicité sponsorisée">
    <div className="flex items-start justify-between gap-3"><div><span className="badge-zinc">{ad.label}</span><div className="mt-2 text-xs text-zinc-500">{ad.advertiser}</div><h3 className="mt-1 font-bold">{ad.title}</h3></div><button className="btn-secondary btn-sm" onClick={()=>setMenu(!menu)} aria-label="Options de publicité">•••</button></div>
    {menu && <div className="absolute right-3 top-12 z-10 w-48 rounded-xl border border-zinc-700 bg-zinc-950 p-2 shadow-xl"><button className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-zinc-800" onClick={()=>fetch('/api/ads/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId:ad.id,event:'about'})})}>Pourquoi cette publicité ?</button><button className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-zinc-800" onClick={hide}>Masquer cette publicité</button><button className="block w-full rounded-lg px-3 py-2 text-left text-xs text-red-400 hover:bg-zinc-800" onClick={()=>fetch('/api/ads/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId:ad.id,event:'report'})})}>Signaler la publicité</button></div>}
    {ad.imageUrl && <img src={ad.imageUrl} alt="" className="mt-3 max-h-40 w-full rounded-lg object-cover" />}
    <p className="mt-2 text-sm text-zinc-400">{ad.description}</p>
    <a href={ad.landingUrl} target="_blank" rel="noreferrer" className="btn-primary btn-sm mt-3 inline-flex" onClick={()=>fetch('/api/ads/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId:ad.id,event:'click'})})}>En savoir plus →</a>
    <p className="mt-2 text-[10px] text-zinc-600">Les annonces sont séparées des réponses de Wesh Star IA et n'influencent pas le contenu généré.</p>
  </aside>;
}
