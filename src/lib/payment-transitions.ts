// Règles pures (sans dépendance) des changements de statut d'un paiement.
// "confirmed" est TERMINAL : un paiement confirmé et crédité ne peut plus être
// remis en attente ni rejeté (sinon une re-confirmation créditerait deux fois).
// Un remboursement doit passer par un flux dédié et tracé, pas par ce changement de statut.
export type PaymentStatus = "pending" | "confirmed" | "rejected";

const ALLOWED: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["confirmed", "rejected"],
  rejected: ["pending"],
  confirmed: []
};

export function isPaymentStatus(v: unknown): v is PaymentStatus {
  return v === "pending" || v === "confirmed" || v === "rejected";
}

export type TransitionResult = { ok: true; noop: boolean; credit: boolean } | { ok: false; reason: string };

export function planTransition(from: PaymentStatus, to: PaymentStatus, alreadyFulfilled: boolean): TransitionResult {
  if (from === to) return { ok: true, noop: true, credit: false };
  if (!ALLOWED[from].includes(to)) return { ok: false, reason: `Transition ${from} → ${to} interdite` };
  return { ok: true, noop: false, credit: to === "confirmed" && !alreadyFulfilled };
}
