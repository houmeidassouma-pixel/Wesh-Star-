# Wesh Star IA — intégration multi-paiement V10

## Ajouts dans cette version
- Endpoint `/api/payments/methods` qui expose uniquement des indicateurs de configuration (aucune clé secrète n'est envoyée au navigateur).
- Stripe reste le parcours d'abonnement récurrent existant. Les méthodes de paiement additionnelles affichées par Stripe dépendent du compte, du pays, de la devise et des réglages Stripe Dashboard.
- PayPal : création d'une commande pour acheter un pack de jetons/minutes, redirection d'approbation, capture serveur et vérification du statut, de la référence, de la devise et du montant avant crédit.
- Flutterwave : initialisation d'un paiement ponctuel et vérification serveur de la transaction, de la référence, de la devise et du montant avant crédit.
- Fonction SQL transactionnelle commune qui verrouille le paiement et crédite un pack une seule fois.
- Interface admin actualisée : elle indique la présence de configuration côté serveur et distingue les paiements récurrents des paiements ponctuels.

## Variables d'environnement
Configurer côté serveur, jamais dans `NEXT_PUBLIC_*` :
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=sandbox` ou `live`
- `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_SECRET_HASH`
- `WESH_APP_URL` avec l'URL HTTPS publique réelle

## Limites importantes avant production
1. Cette intégration PayPal/Flutterwave concerne les packs ponctuels. Les abonnements récurrents restent Stripe. Les abonnements PayPal ou Flutterwave nécessitent la configuration des plans récurrents et des webhooks propres à ces produits, non activés ici.
2. `FLUTTERWAVE_SECRET_HASH` est prévu pour la vérification de webhook, mais le crédit de commande est actuellement effectué via le retour de vérification serveur. Pour un déploiement commercial, ajouter aussi le webhook Flutterwave signé, les contrôles de rejeu et les alertes de rapprochement.
3. L'endpoint PayPal capture la commande au retour d'approbation. Configurez les URLs de retour dans l'application et testez en sandbox avant de passer en live.
4. Les wallets Apple Pay/Google Pay, SEPA, Klarna et les autres méthodes Stripe ne sont pas garanties pour tous les comptes. Activez les méthodes éligibles dans le Dashboard Stripe et vérifiez-les en test. Elles ne doivent pas être présentées comme disponibles dans chaque pays.
5. Les paiements Mobile Money dépendent de la couverture par pays, du contrat marchand, de la devise et de la validation de Flutterwave. Aucun encaissement réel n'est actif sans clés de production et approbation du compte.
6. Tester les montants, devise, annulations, doubles clics, doubles retours, remboursements, taxes/TVA, factures, rapprochement et charge réelle avant commercialisation.

## Scénarios de test obligatoires
- PayPal sandbox : approuvé, annulé, montant modifié, capture répétée, retour sans session connectée.
- Flutterwave : paiement réussi, échoué, transaction d'une autre référence, montant/devise erronés, vérification répétée.
- Stripe : nouvel abonnement, renouvellement payé, paiement échoué, annulation et accès après expiration.
- Confirmer qu'une transaction ne crédite jamais deux fois le même pack.

Cette note décrit le code ajouté, pas une certification de production. Les identifiants marchands, l'approbation, les tests réels et la compilation sur l'environnement cible restent nécessaires.
