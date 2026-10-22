# Trésorerie FCFA (XOF) — Wesh Star

- Admin > "Trésorerie FCFA" : solde XOF central (sans limite) + solde EUR.
- Encaissement : Admin > Paiements > "Confirmer (reçu en FCFA)" (ou "Créditer FCFA" sur un paiement déjà confirmé). Montant crédité = montant EUR × WESH_XOF_PER_EUR. Idempotent : un paiement n'est crédité qu'une fois.
- Virement sortant : formulaire dans la Trésorerie. Le montant est réservé immédiatement ; en mode `manual` il reste « en attente » jusqu'à "Envoyé ✓" ou "Annuler" (annulé = montant restitué).
- Envoi 100 % automatique : brancher l'API payout d'un prestataire dans `src/lib/treasury/payout.ts` et définir WESH_PAYOUT_PROVIDER.
- Conversion XOF → EUR : montant partiel ou total, taux fixe 655,957. Écritures comptables uniquement.
- Les soldes sont COMPTABLES : l'argent réel reste chez l'opérateur/la banque.
- Non testé en exécution (pas de npm install / réseau dans l'environnement de build).

## Portefeuilles FCFA par utilisateur
- Admin > "Portefeuilles" : créditer/retirer un montant (ex : 100 FCFA) sur le portefeuille d'un utilisateur (par e-mail) sans dépôt ni passerelle, puis transférer de l'utilisateur A vers l'utilisateur B.
- Motif obligatoire, historique complet (qui, quand, pourquoi), transferts atomiques, solde jamais négatif.
- Ces soldes sont internes et NON retirables en argent réel : aucun lien avec les virements de la Trésorerie.
- Réservé aux administrateurs. Non testé en exécution (pas de npm install / réseau dans l'environnement de build).

## V29 — Encaissements FCFA automatiques et comptes bancaires
- Paiement Flutterwave en FCFA pour : crédits vidéo, **pièces (cadeaux)** et **abonnements** (paiement unique, mois ou année, sans prélèvement automatique).
- Chaque achat confirmé ajoute automatiquement le montant réellement encaissé au solde FCFA de la Trésorerie (une seule fois par achat). Le panneau affiche le total par origine : abonnements / pièces / crédits vidéo.
- Webhook Flutterwave : `https://TON-SITE/api/payments/flutterwave/webhook`, « Secret hash » = `FLUTTERWAVE_SECRET_HASH`. Il active l'achat même si le client ferme son navigateur.
- Bénéficiaires : numéro Mobile Money (MTN, Moov, autre) **ou compte bancaire** (IBAN / RIB). En mode `manual`, tu envoies l'argent toi-même puis tu cliques « Envoyé ✓ ».
- Le solde reste comptable : l'argent réel est chez Flutterwave / la banque. Les retraits FCFA vers une banque se font depuis ton compte Flutterwave.
- Non testé en conditions réelles (aucun paiement réel possible dans l'environnement de préparation).
