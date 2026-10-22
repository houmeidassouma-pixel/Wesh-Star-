// Adaptateur de virement sortant. Le prestataire est choisi par WESH_PAYOUT_PROVIDER.
//  - "manual" (défaut) : le virement est enregistré "en attente" ; l'admin le
//    effectue dans l'appli de l'opérateur puis le valide dans Wesh Star.
//  - Pour un envoi 100 % automatique depuis le site, il faut brancher l'API
//    "décaissement / payout" d'un prestataire (MTN MoMo Disbursement, Moov Money,
//    CinetPay, FedaPay, PayDunya, Flutterwave...). Ajouter un cas dans le switch.
export type PayoutInput = { amount: number; destination: { phone?: string; account?: string; operator: string; name?: string }; ledgerId: string };
export type PayoutResult = { status: "pending" | "completed"; providerRef?: string; message: string };

export async function payoutViaProvider(input: PayoutInput): Promise<PayoutResult> {
  const provider = (process.env.WESH_PAYOUT_PROVIDER || "manual").toLowerCase();
  switch (provider) {
    case "manual":
      return { status: "pending", message: `Virement de ${input.amount} FCFA enregistré vers ${input.destination.phone || input.destination.account}. Effectuez-le chez l'opérateur puis validez-le ici.` };
    default:
      throw new Error(`Prestataire de virement "${provider}" non branché dans le code`);
  }
}
