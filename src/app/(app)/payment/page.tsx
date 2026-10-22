"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PaymentMethodsV5 from "@/components/PaymentMethodsV5";

export default function PaymentPage() {
  const q = useSearchParams(); const [p,setP] = useState<any>(null); const [err,setErr]=useState("");
  useEffect(()=>{ const r=q.get("reference"); if(!r)return; fetch("/api/payment/get?reference="+encodeURIComponent(r)).then(x=>x.json()).then(x=>x.payment?setP(x.payment):setErr(x.error||"Erreur")); },[q]);
  if(err) return <div className="card mx-auto max-w-xl p-8"><h1 className="text-xl font-bold">Paiement Wesh Star IA</h1><p className="mt-4 text-red-400">{err}</p></div>;
  if(!p) return <div className="card mx-auto max-w-xl p-8">Chargement…</div>;
  return <div className="mx-auto max-w-xl space-y-5"><div className="card p-8"><div className="text-sm text-banana font-semibold">WESH IA STAR DIRECT</div><h1 className="mt-2 text-2xl font-extrabold">Finaliser votre paiement</h1><p className="mt-3 text-zinc-400">Référence : <b className="text-white">{p.reference}</b></p><p className="mt-4 text-3xl font-extrabold">{p.amount} {p.currency}</p><p className="mt-2 text-lg font-bold text-banana">{p.tokens ? `${p.tokens} crédits vidéo` : "Crédit vidéo selon le forfait"}</p><div className="mt-6 space-y-2 text-sm"><p><b>Bénéficiaire :</b> {p.accountName}</p>{p.iban&&<p><b>IBAN :</b> {p.iban}</p>}{p.bic&&<p><b>BIC :</b> {p.bic}</p>}<p className="pt-3 text-zinc-400">{p.instructions}</p></div><div className="mt-6 rounded-xl border border-zinc-700 p-4 text-sm"><b>Statut :</b> {p.status === "pending" ? "En attente de confirmation" : p.status}</div></div><PaymentMethodsV5 /></div>;
}
