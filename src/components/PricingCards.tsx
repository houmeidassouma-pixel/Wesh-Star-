"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/settings";

export default function PricingCards({ t, settings }: { t: Record<string, string>; settings: SiteSettings }) {
  const [paymentProvider,setPaymentProvider] = useState("stripe");
  const [paymentCurrency,setPaymentCurrency] = useState("EUR");
  const [planPeriod, setPlanPeriod] = useState<"month" | "year">("month");
  const [autoRenew, setAutoRenew] = useState(false);
  const [availableProviders,setAvailableProviders] = useState<Record<string,boolean>>({stripe:false,paypal:false,flutterwave:false,direct:false});
  useEffect(()=>{fetch("/api/payments/methods",{cache:"no-store"}).then(r=>r.json()).then(d=>{const next:Record<string,boolean>={};for(const m of d.methods||[])next[m.id]=Boolean(m.configured);setAvailableProviders(next)}).catch(()=>{});},[]);
  const buyPack = async (minutes: number) => {
    if (!availableProviders[paymentProvider]) { alert("Ce moyen de paiement n’est pas encore configuré sur le serveur."); return; }
    if (paymentProvider === "stripe" || paymentProvider === "paypal" || paymentProvider === "flutterwave") {
      const endpoint = paymentProvider === "stripe" ? "/api/stripe/pack" : paymentProvider === "paypal" ? "/api/payments/paypal/create" : "/api/payments/flutterwave/create";
      const res = await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"minutes",minutes,currency:paymentCurrency})});
      const data=await res.json(); if(data.checkoutUrl){window.location.href=data.checkoutUrl;return;}
      alert(data.error === "Authentication required" ? "Connecte-toi pour acheter ce pack." : (data.error||"Impossible d’ouvrir le paiement sécurisé.")); return;
    }
    const res = await fetch("/api/payment/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "minutes", minutes })
    });
    const data = await res.json();
    if (data.payment?.reference) {
      const p = data.payment;
      const mm = p.mobileMoney || {};
      const lines = [
        `Demande de paiement créée. Référence : ${p.reference}`,
        `Montant : ${Number(p.amount).toFixed(2)} €` + (mm.xofPerEur ? ` (environ ${Math.round(Number(p.amount) * mm.xofPerEur).toLocaleString("fr-FR")} FCFA)` : ""),
      ];
      if (mm.mtn || mm.moov) {
        lines.push("", `Mobile Money au nom de : ${mm.name}`);
        if (mm.mtn) lines.push(`MTN MoMo : ${mm.mtn}`);
        if (mm.moov) lines.push(`Moov Money : ${mm.moov}`);
        lines.push(`Indique la référence ${p.reference} dans le motif ou envoie-la au support avec la capture du paiement.`);
      }
      if (p.iban) lines.push("", `Virement : ${p.iban}${p.bic ? " / " + p.bic : ""}`);
      lines.push("", `Après confirmation par Wesh Star IA, ${Number(p.tokens || 0)} crédits vidéo seront crédités (1 min = 6 crédits vidéo).`);
      alert(lines.join("\n"));
    } else {
      alert(data.error === "Authentication required" ? "Connecte-toi pour acheter ce pack." : (data.error || "Impossible de créer le paiement."));
    }
  };

  const subscribe = async (tier: string, tokens: number, monthlyPrice: number) => {
    const recurring = autoRenew && planPeriod === "month";
    const price = planPeriod === "year" ? Math.round(monthlyPrice * 10 * 100) / 100 : monthlyPrice;
    const ok = window.confirm(`${recurring ? "Abonnement mensuel avec prélèvement automatique" : `Paiement unique ${planPeriod === "year" ? "annuel" : "mensuel"}`} de ${Number(price).toFixed(2)} €. Le forfait inclut ${tokens} crédits vidéo par mois. ${recurring ? "Le paiement sera renouvelé chaque mois jusqu’à annulation." : "Aucun prélèvement automatique : tu devras renouveler manuellement à l’échéance."} Continuer ?`);
    if (!ok) return;
    // Paiement en FCFA (Mobile Money via Flutterwave) : paiement unique, sans prélèvement automatique.
    const inXof = paymentProvider === "flutterwave" && paymentCurrency === "XOF";
    const res = await fetch(inXof ? "/api/payments/flutterwave/create" : "/api/stripe/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inXof ? { kind: "plan", tier, period: planPeriod } : { tier, period: planPeriod, autoRenew: recurring })
    });
    const data = await res.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      alert(data.error === "SUBSCRIPTION_ALREADY_ACTIVE" ? "Le forfait n’a pas pu être acheté. Vérifie ton statut et réessaie." : (data.error || "Impossible d’ouvrir le paiement sécurisé."));
    }
  };





  return (
    <div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-xl font-bold">🎁 Essai gratuit</h2>
        <p className="mt-2 text-sm text-zinc-300">
          2 essais gratuits par compte, de <b>10 secondes</b> chacun. Après les 2 essais, un quota payant est nécessaire.
        </p>
        <p className="mt-1 text-xs text-zinc-500">Les 2 essais sont à vie et ne se renouvellent pas chaque mois.</p>
        <Link href="/login" className="btn-secondary btn-md mt-5 inline-flex">
          {t.free_cta || "Commencer gratuitement"}
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-bold">📅 Abonnements de génération vidéo</h2>
          <p className="mt-1 text-sm text-zinc-400">Choisis un paiement unique ou, si tu le coches, le renouvellement automatique mensuel via Stripe.</p></div>
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">{(settings.plans.monthlyTiers || []).filter(x => x.enabled !== false).length} forfaits</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><button className={"btn-sm " + (planPeriod === "month" ? "btn-primary" : "btn-secondary")} onClick={() => setPlanPeriod("month")}>1 mois</button><button className={"btn-sm " + (planPeriod === "year" ? "btn-primary" : "btn-secondary")} onClick={() => { setPlanPeriod("year"); setAutoRenew(false); }}>1 an · prix de 10 mois</button></div>
        <label className="mt-4 flex items-start gap-2 rounded-lg border border-zinc-800 p-3 text-sm"><input type="checkbox" className="mt-1" checked={autoRenew && planPeriod === "month"} onChange={e => setAutoRenew(e.target.checked)} disabled={planPeriod !== "month"} /><span><b>Option facultative : prélèvement automatique mensuel via Stripe</b><span className="mt-1 block text-xs text-zinc-400">Désactivée par défaut. Si tu ne coches pas, le paiement est unique et aucun renouvellement automatique n’est créé. Tu peux annuler l’abonnement automatique depuis la gestion de facturation.</span></span></label>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(settings.plans.monthlyTiers || []).filter(x => x.enabled !== false).sort((a,b) => a.minutes-b.minutes).map(plan => (
            <button key={plan.id} onClick={() => subscribe(plan.id, plan.minutes * 6, plan.price)}
              className="rounded-xl border border-zinc-700 bg-zinc-950/40 p-4 text-left transition hover:border-banana/60 hover:bg-zinc-900">
              <div className="font-bold">{plan.name}</div>
              <div className="mt-1 text-2xl font-extrabold">{(planPeriod === "year" ? plan.price * 10 : plan.price).toFixed(2)} €<span className="text-xs font-normal text-zinc-500"> / {planPeriod === "year" ? "an" : "mois"}</span></div>
              <div className="mt-2 text-xs text-zinc-500">{plan.minutes * 6} crédits vidéo inclus chaque mois</div>
              <div className="mt-3 text-xs text-banana">{autoRenew && planPeriod === "month" ? "Choisir l’abonnement →" : "Payer une fois →"}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-bold">🪙 Packs vidéo</h2>
          <p className="mt-1 text-sm text-zinc-400">Achète des crédits vidéo supplémentaires avec un paiement unique. Le prix et le nombre de crédits vidéo sont affichés.</p></div>
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">{(settings.plans.hourTiers || []).filter(x => x.enabled !== false).length} packs</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-zinc-300">Moyen de paiement
            <select value={paymentProvider} onChange={e=>{setPaymentProvider(e.target.value);setPaymentCurrency(e.target.value==="flutterwave"?"XOF":"EUR");}} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white">
              <option value="stripe" disabled={!availableProviders.stripe}>Carte bancaire / wallets (Stripe){availableProviders.stripe?"":" — à configurer"}</option>
              <option value="paypal" disabled={!availableProviders.paypal}>PayPal{availableProviders.paypal?"":" — à configurer"}</option>
              <option value="flutterwave" disabled={!availableProviders.flutterwave}>Mobile Money / paiements locaux (Flutterwave){availableProviders.flutterwave?"":" — à configurer"}</option>
              <option value="direct" disabled={!availableProviders.direct}>Virement / Mobile Money manuel{availableProviders.direct?"":" — à configurer"}</option>
            </select>
          </label>
          {paymentProvider === "flutterwave" && <label className="text-sm text-zinc-300">Devise
            <select value={paymentCurrency} onChange={e=>setPaymentCurrency(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white"><option value="XOF">Franc CFA (XOF)</option><option value="EUR">Euro (EUR)</option></select>
          </label>}
        </div>
        <p className="mt-2 text-xs text-zinc-500">Les moyens non configurés sont désactivés. Les options disponibles dépendent du pays, du compte marchand et de la devise.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(settings.plans.hourTiers || []).filter(x => x.enabled !== false).sort((a,b) => a.hours-b.hours).map(pack => {
            const minutes = Number(pack.hours);
            return <button key={minutes} onClick={() => buyPack(minutes)}
              className="rounded-xl border border-zinc-700 bg-zinc-950/40 p-4 text-left transition hover:border-banana/60 hover:bg-zinc-900">
              <div className="mt-1 text-2xl font-extrabold">{Number(pack.price).toFixed(2)} €</div>
              <div className="mt-2 text-xs text-zinc-500">{Math.floor(minutes * 6)} crédits vidéo inclus</div>
              <div className="mt-3 text-xs text-banana">Acheter ce pack →</div>
            </button>;
          })}
        </div>
      </div>

    </div>
  );
}
