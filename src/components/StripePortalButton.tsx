"use client";
import { useState } from "react";
export default function StripePortalButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const openPortal = async () => {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/stripe/portal", { method: "POST", headers: { "Content-Type": "application/json" } });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) { window.location.href = d.url; return; }
      setMessage(d.error === "NO_STRIPE_CUSTOMER" ? "Aucun abonnement Stripe automatique n’est associé à ce compte." : (d.error || "Impossible d’ouvrir la gestion Stripe."));
    } catch { setMessage("Connexion impossible. Réessaie."); }
    finally { setBusy(false); }
  };
  return <div><button className="btn-secondary btn-sm" onClick={openPortal} disabled={busy}>{busy ? "Ouverture…" : "Gérer / annuler mon prélèvement automatique"}</button>{message && <p className="mt-2 text-xs text-zinc-400">{message}</p>}</div>;
}
