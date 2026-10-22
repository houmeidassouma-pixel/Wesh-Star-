"use client";
import { useEffect, useState } from "react";
export default function AdControls(){
  const [p,setP]=useState({personalized:true,adsFree:false}); const [saved,setSaved]=useState(false);
  useEffect(()=>{fetch('/api/ads/preferences').then(r=>r.json()).then(x=>x.preferences&&setP(x.preferences)).catch(()=>{});},[]);
  async function save(){await fetch('/api/ads/preferences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});setSaved(true);setTimeout(()=>setSaved(false),1500);}
  return <section className="card p-6"><h2 className="font-bold">📣 Contrôle des publicités</h2><p className="mt-1 text-sm text-zinc-400">Contrôle la personnalisation des annonces. Les annonceurs ne reçoivent pas tes conversations, ta mémoire ou tes données personnelles.</p><div className="mt-4 space-y-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={p.personalized} onChange={e=>setP({...p,personalized:e.target.checked})}/> Publicités personnalisées selon le contexte de la page</label><label className="flex items-center gap-2"><input type="checkbox" checked={p.adsFree} onChange={e=>setP({...p,adsFree:e.target.checked})}/> Expérience sans publicité <span className="text-xs text-zinc-500">(peut réduire l'accès gratuit)</span></label></div><button onClick={save} className="btn-primary btn-md mt-4">{saved?'✓ Enregistré':'Enregistrer'}</button></section>;
}
