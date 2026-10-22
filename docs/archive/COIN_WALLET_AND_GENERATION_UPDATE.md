# Wesh Star IA — portefeuille de pièces et génération vidéo

## Comptes séparés

- `profiles.hour_credits_seconds` reste réservé aux jetons/quotas de génération vidéo.
- `coin_ledger` est un journal append-only pour les pièces achetées, les gains des créateurs et la part plateforme.
- Les achats de pièces sont crédités uniquement après réception d'un webhook Stripe valide (`checkout.session.completed`, payé, référence/montant/devise/session vérifiés).
- Les cadeaux enregistrent le partage configuré côté serveur. Valeur par défaut : 60 % au créateur en pièces de gains et 40 % au compte plateforme. L'arrondi se fait à la pièce entière inférieure pour le créateur ; le reste va à la plateforme.
- Les pièces achetées sont dépensées avant les gains créateur. Les gains non dépensés peuvent servir à envoyer d'autres cadeaux ou faire l'objet d'une demande de retrait.
- Une demande de retrait réserve les pièces de gains. Si elle est refusée, les pièces sont rendues. Si elle est approuvée, un administrateur doit effectuer le paiement réel et saisir sa référence avant de marquer la demande comme payée. Aucun virement automatique n'est intégré.

## Packs de pièces

Valeurs initiales proposées et modifiables depuis Administration → Économie créateur :

- 100 pièces : 1 €
- 550 pièces : 5 €
- 1 200 pièces : 10 €

Ce sont des prix de départ, pas une recommandation tarifaire définitive. Vérifier les taxes, frais Stripe, remboursements et règles locales avant d'activer les achats.

## Mise en service

1. Configurer `DATABASE_URL`, les clés Stripe et `WESH_APP_URL` dans l'environnement serveur.
2. Appliquer le schéma et les migrations : `npm run db:migrate`.
3. Configurer l'URL webhook Stripe vers `/api/stripe/webhook` et `STRIPE_WEBHOOK_SECRET`.
4. Faire des tests de paiement Stripe en mode test : paiement confirmé, paiement annulé, webhook répété et incohérence montant/devise.
5. Tester cadeaux, dépenses des gains, demandes de retrait, refus/remboursement et historique dans une base de test.
6. N'activer les paiements réels qu'après validation juridique/comptable du modèle de pièces, des cadeaux et des retraits.

## Génération de vidéos et textes

- Le studio propose des durées par pas de 10 secondes jusqu'à 10 minutes, mais la durée réellement disponible reste limitée par les droits/quota du compte et les limites serveur.
- La génération automatique de scénario existe via `/api/ai/script`; l'IA locale doit être configurée et accessible.
- Les propositions de cadeaux par IA et les prix/activations de cadeaux/effets restent soumis à validation de l'administrateur.

## Limites non couvertes par cette mise à jour

- Le flux audio/vidéo LIVE réel et les matchs multi-créateurs ne sont pas rendus opérationnels par cette mise à jour.
- Les retraits sont administratifs/manuels, pas un virement automatique via une API de paiement.
- Le build complet Next.js et les tests navigateur/Stripe réel nécessitent l'installation des dépendances et une configuration d'environnement réelle.
