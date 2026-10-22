# Wesh Star IA — V8 (en cours) : rapport d'audit, bloc paiements / tokens / audit

## Corrigé dans ce lot (vérifié : syntaxe + 7 tests unitaires réussis)
- **Double crédit de minutes** (`src/app/api/admin/payments/route.ts`) : un paiement pouvait être crédité plusieurs fois
  (confirmed → pending → confirmed, ou deux confirmations simultanées) et le crédit était lu-puis-écrit sans verrou.
  Désormais : transaction SQL, verrou de ligne `FOR UPDATE`, incrément atomique, colonne `fulfilled_at`,
  et `confirmed` est un statut terminal (règles dans `src/lib/payment-transitions.ts`).
- **Journal d'audit** : table `audit_log` + `src/lib/audit.ts`, branché sur changements de statut de paiement,
  ajustements/transferts de portefeuille FCFA, virements, validations et conversions XOF→EUR de la trésorerie.
- **Migration à appliquer** : `db/migrations/20261014_audit_log_payment_guard.sql` (idempotente ; `npm run db:migrate` l'applique).

## Constaté OK à la lecture (non testé en exécution)
- Signature des webhooks Stripe : HMAC, tolérance 300 s, comparaison à temps constant.
- Virements sortants : mode `manual` par défaut, honnête (enregistré « en attente », validé à la main). Aucun prestataire
  automatique n'est branché : MTN/Moov/CinetPay/etc. = **à intégrer + clés API + contrat**.
- Soldes FCFA par utilisateur : explicitement non retirables (non adossés à un dépôt).

## Non traité / non vérifié à ce stade
- Aucun `npm install`, `tsc` complet, `next build` : pas de réseau dans l'environnement d'audit. À lancer chez toi.
- Webhook Stripe : pas de table d'événements traités ni de protection contre les événements hors ordre (les mises à jour
  sont des « état = valeur », donc peu dangereuses, mais à renforcer).
- Remboursements : aucun flux dédié n'existe.
- Autopilot / réseaux sociaux, PWA hors ligne, file GPU, modération, communauté, sauvegardes : audit pas encore fait.
- Aucune plateforme sociale n'est déclarée fonctionnelle : aucune n'a été testée.

## Commandes
    npm ci            # ou npm install (pas de package-lock fourni)
    npm test          # 7 tests, Node >= 22
    npm run db:migrate
    npm run build
