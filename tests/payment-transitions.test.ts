import { test } from "node:test";
import assert from "node:assert/strict";
import { planTransition, isPaymentStatus } from "../src/lib/payment-transitions.ts";

test("pending -> confirmed crédite une seule fois", () => {
  assert.deepEqual(planTransition("pending", "confirmed", false), { ok: true, noop: false, credit: true });
});
test("confirmed est terminal : pas de retour en attente ni de rejet", () => {
  assert.equal(planTransition("confirmed", "pending", true).ok, false);
  assert.equal(planTransition("confirmed", "rejected", true).ok, false);
});
test("re-confirmer un paiement déjà confirmé ne crédite pas (noop)", () => {
  assert.deepEqual(planTransition("confirmed", "confirmed", true), { ok: true, noop: true, credit: false });
});
test("rejected -> confirmed est interdit directement (il faut repasser par pending)", () => {
  assert.equal(planTransition("rejected", "confirmed", false).ok, false);
});
test("rejected -> pending -> confirmed crédite une fois", () => {
  assert.equal(planTransition("rejected", "pending", false).ok, true);
  assert.equal(planTransition("pending", "confirmed", false).credit, true);
});
test("un paiement déjà crédité (fulfilled) ne recrédite jamais", () => {
  const r = planTransition("pending", "confirmed", true);
  assert.deepEqual(r, { ok: true, noop: false, credit: false });
});
test("isPaymentStatus rejette les valeurs inconnues", () => {
  assert.equal(isPaymentStatus("refunded"), false);
  assert.equal(isPaymentStatus(undefined), false);
  assert.equal(isPaymentStatus("pending"), true);
});
