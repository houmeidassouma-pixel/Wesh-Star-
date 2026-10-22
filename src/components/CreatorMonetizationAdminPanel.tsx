"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export default function CreatorMonetizationAdminPanel({ profiles }: { profiles: any[] }) {
  const [selected, setSelected] = useState(profiles[0]?.id || "");
  const [country, setCountry] = useState(profiles[0]?.country_code || "");
  const [ageVerified, setAgeVerified] = useState(Boolean(profiles[0]?.creator_age_verified));
  const [applications, setApplications] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const current = profiles.find(p => p.id === selected);
  const refresh = () => fetch("/api/admin/creator-monetization", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(d => setApplications(d?.applications || [])).catch(() => undefined);
  useEffect(() => { refresh(); }, []);
  const save = async () => { setBusy(true); setMessage(""); try { const r = await fetch("/api/admin/creator-monetization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selected, countryCode: country, ageVerified }) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Erreur"); setMessage("Pays et vérification d’âge enregistrés."); router.refresh(); await refresh(); } catch(e:any) { setMessage(e?.message || "Erreur"); } finally { setBusy(false); } };
  const review = async (userId: string, status: string) => { setBusy(true); setMessage(""); try { const r=await fetch("/api/admin/creator-monetization",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"review",userId,status,note:status==="approved"?"Critères contrôlés par l’administration.":status==="rejected"?"Demande refusée après vérification.":"Monétisation suspendue après contrôle."})}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||"Erreur"); setMessage("Décision enregistrée."); await refresh(); } catch(e:any) { setMessage(e?.message||"Erreur"); } finally { setBusy(false); } };
  return <section className="card space-y-5 p-5">
    <div><h2 className="font-bold">🌍 Pays, âge et demandes de monétisation</h2><p className="mt-1 text-sm text-zinc-400">Vérifie manuellement l’âge de 18 ans ou plus et le pays du compte. Les seuils d’audience sont calculés par le serveur; les vues suspectes nécessitent un contrôle avant paiement.</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Compte<select className="input mt-1" value={selected} onChange={e=>{const p=profiles.find(x=>x.id===e.target.value);setSelected(e.target.value);setCountry(p?.country_code||"");setAgeVerified(Boolean(p?.creator_age_verified));}}><option value="">Choisir…</option>{profiles.map(p=><option key={p.id} value={p.id}>@{p.username || p.email?.split("@")[0] || p.id}</option>)}</select></label><label className="text-sm">Pays (code ISO à 2 lettres)<input className="input mt-1" maxLength={2} placeholder="DE, FR, BJ…" value={country} onChange={e=>setCountry(e.target.value.toUpperCase().slice(0,2))}/></label></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ageVerified} onChange={e=>setAgeVerified(e.target.checked)}/> J’ai vérifié que ce compte appartient à une personne âgée d’au moins 18 ans.</label>
    {current && <p className="text-xs text-zinc-500">Pays actuel : {current.country_code || "non vérifié"}</p>}
    <button className="btn-primary btn-sm" disabled={!selected || busy || (country!=="" && !/^[A-Z]{2}$/.test(country))} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer les vérifications"}</button>
    {message && <p role="status" className="text-sm text-zinc-300">{message}</p>}
    <div className="space-y-3"><h3 className="font-semibold">Demandes reçues</h3>{applications.length===0 && <p className="text-sm text-zinc-500">Aucune demande pour le moment.</p>}{applications.map(a=><div key={a.id} className="rounded-lg border border-zinc-800 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium">@{a.username || a.email?.split("@")[0] || a.user_id}</p><p className="text-xs text-zinc-500">{Number(a.followers||0).toLocaleString("fr-FR")} abonnés · {Number(a.qualified_views_30d||0).toLocaleString("fr-FR")} vues qualifiées sur 30 jours · {a.country_code||"pays inconnu"} · âge {a.creator_age_verified?"vérifié":"non vérifié"}</p></div><span className="text-xs text-zinc-400">{a.status}</span></div>{a.status==="pending" && <div className="mt-3 flex flex-wrap gap-2"><button className="btn-primary btn-sm" disabled={busy || !a.creator_age_verified || !a.country_code} onClick={()=>review(a.user_id,"approved")}>Approuver</button><button className="btn-secondary btn-sm" disabled={busy} onClick={()=>review(a.user_id,"rejected")}>Refuser</button></div>}{a.status==="approved" && <button className="btn-secondary btn-sm mt-3" disabled={busy} onClick={()=>review(a.user_id,"suspended")}>Suspendre</button>}</div>)}</div>
  </section>;
}
