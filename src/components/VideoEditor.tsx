"use client";
import { useEffect, useState } from "react";

export default function VideoEditor(){
  const [video,setVideo]=useState<File|null>(null);
  const [asset,setAsset]=useState<File|null>(null);
  const [mode,setMode]=useState<"upload"|"generate">("generate");
  const [instruction,setInstruction]=useState("Ajoute une voiture noire réaliste derrière moi");
  const [x,setX]=useState(0.58),[y,setY]=useState(0.42),[scale,setScale]=useState(0.28);
  const [job,setJob]=useState<any>(null),[assetJob,setAssetJob]=useState<any>(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");

  const startEdit=async(assetUrl:string, assetPath="")=>{
    if(!video) throw new Error("Choisis une vidéo.");
    const upload=async(file:File,endpoint:string)=>{const f=new FormData();f.append("file",file);const r=await fetch(endpoint,{method:"POST",body:f});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Upload failed");return d.path;};
    const videoPath=await upload(video,"/api/upload-video");
    if(!assetUrl && !assetPath && asset) assetPath=await upload(asset,"/api/upload-image");
    const r=await fetch("/api/video-edit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({videoPath,assetPath,assetUrl,instruction,x,y,scale})});
    const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Impossible de lancer l’édition");
    setJob({id:d.jobId,status:"processing",progress:0});
  };

  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!video)return setMsg("Choisis d’abord ta vidéo.");setBusy(true);setMsg("");setJob(null);try{
    if(mode==="upload"){
      if(!asset)return setMsg("Choisis l’image de la voiture, de la personne ou de l’objet.");
      await startEdit("","");
    } else {
      const r=await fetch("/api/video-edit/generate-asset",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:instruction})});
      const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Impossible de générer l’objet localement");
      setAssetJob({id:d.jobId,status:d.status});
    }
  }catch(e:any){setMsg(e.message||"Erreur");}finally{setBusy(false)}};

  useEffect(()=>{if(!assetJob?.id)return;const timer=setInterval(async()=>{try{
    const r=await fetch("/api/video-edit/generate-asset/status?jobId="+encodeURIComponent(assetJob.id),{cache:"no-store"});
    const d=await r.json();setAssetJob((j:any)=>({...j,...d}));
    if(d.status==="succeeded"){
      clearInterval(timer);setBusy(true);setMsg("");
      try{await startEdit(d.image_url,"" );}catch(e:any){setMsg(e.message||"Édition impossible");}finally{setBusy(false)}
    } else if(d.status==="failed"){clearInterval(timer);setMsg(d.error||"La génération de l’objet a échoué.")}
  }catch(e:any){clearInterval(timer);setMsg(e.message||"Erreur de génération")}},2500);return()=>clearInterval(timer)},[assetJob?.id]);

  useEffect(()=>{if(!job?.id)return;const timer=setInterval(async()=>{const r=await fetch("/api/video-edit/status?jobId="+encodeURIComponent(job.id),{cache:"no-store"});const d=await r.json();setJob((j:any)=>({...j,...d}));if(d.status==="done"||d.status==="failed")clearInterval(timer)},2500);return()=>clearInterval(timer)},[job?.id]);

  return <div className="card p-6 space-y-5">
    <div><h2 className="text-xl font-bold">🎬 Modifier une vidéo avec l’IA</h2><p className="mt-1 text-sm text-zinc-500">Écris ce que tu veux ajouter : Wesh Star IA peut générer l’objet localement puis le placer derrière le sujet de ta vidéo.</p></div>
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm"><span className="lab">📹 Ta vidéo existante</span><input type="file" accept="video/*" onChange={e=>setVideo(e.target.files?.[0]||null)} className="input" /></label>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={()=>setMode("generate")} className={`rounded-lg border p-3 text-left ${mode==="generate"?"border-violet-400 bg-violet-500/10":"border-zinc-700"}`}><b>✨ Générer l’objet avec l’IA</b><span className="mt-1 block text-xs text-zinc-500">Ex : « une Ferrari noire réaliste » — image générée et détourée localement.</span></button>
        <button type="button" onClick={()=>setMode("upload")} className={`rounded-lg border p-3 text-left ${mode==="upload"?"border-violet-400 bg-violet-500/10":"border-zinc-700"}`}><b>🖼️ Utiliser ma propre image</b><span className="mt-1 block text-xs text-zinc-500">PNG/JPG d’une voiture, personne ou objet.</span></button>
      </div>
      {mode==="upload"&&<label className="block text-sm"><span className="lab">🖼️ Image de l’objet</span><input type="file" accept="image/*" onChange={e=>setAsset(e.target.files?.[0]||null)} className="input" /></label>}
      <label className="block text-sm"><span className="lab">✍️ Décris ce que tu veux ajouter</span><textarea value={instruction} onChange={e=>setInstruction(e.target.value)} className="input min-h-24" placeholder="Ex : Ajoute une voiture noire réaliste derrière moi, légèrement à droite…" /></label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm"><span className="lab">↔️ Position horizontale</span><input type="range" min="-0.2" max="1" step="0.01" value={x} onChange={e=>setX(Number(e.target.value))} className="w-full"/><span className="text-xs text-zinc-500">{x.toFixed(2)}</span></label>
        <label className="text-sm"><span className="lab">↕️ Position verticale</span><input type="range" min="-0.2" max="1" step="0.01" value={y} onChange={e=>setY(Number(e.target.value))} className="w-full"/><span className="text-xs text-zinc-500">{y.toFixed(2)}</span></label>
        <label className="text-sm"><span className="lab">🔎 Taille</span><input type="range" min="0.05" max="1" step="0.01" value={scale} onChange={e=>setScale(Number(e.target.value))} className="w-full"/><span className="text-xs text-zinc-500">{Math.round(scale*100)}%</span></label>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-500"><b className="text-zinc-300">100 % local :</b> en mode IA, l’image est générée sur le GPU Wesh Star IA avec un modèle local, puis détourée localement avant le montage. Aucun fournisseur d’IA externe n’est appelé.</div>
      {assetJob?.status&&assetJob.status!=="succeeded"&&<p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-300">✨ Génération de l’objet : {assetJob.status}…</p>}
      {msg&&<p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{msg}</p>}
      <button disabled={busy||!!(job&&job.status==="processing")||!!(assetJob&&["starting","generating"].includes(assetJob.status))} className="btn-primary btn-lg w-full">{busy?"Préparation…":assetJob?.status==="generating"?"Génération de l’objet…":job?.status==="processing"?`Traitement ${job.progress||0}%…`:mode==="generate"?"✨ Générer et ajouter l’objet": "✨ Ajouter mon image à la vidéo"}</button>
    </form>
    {assetJob?.status==="succeeded"&&<div className="rounded-lg border border-zinc-800 p-3"><p className="text-xs text-zinc-500 mb-2">Objet généré :</p><img src={`/api/video-edit/generate-asset/image?jobId=${encodeURIComponent(assetJob.id)}`} alt="Objet généré par Wesh Star IA" className="max-h-52 rounded-lg bg-zinc-900 object-contain" /></div>}
    {job?.status==="done"&&<div className="space-y-3"><video controls className="w-full rounded-xl border border-zinc-800" src={job.url}/><a className="btn-primary btn-sm inline-block" href={job.url+"?download=1"}>⬇ Télécharger la vidéo modifiée</a></div>}
    {job?.status==="failed"&&<p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{job.error||"L’édition a échoué."}</p>}
  </div>;
}
