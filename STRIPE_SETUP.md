# Stripe — abonnements mensuels Wesh Star IA

Wesh Star IA reste maître des comptes, vidéos, jetons, quotas et stockage. Stripe sert uniquement au paiement récurrent des abonnements mensuels. Les prix et les durées restent pilotés depuis le panneau administrateur Wesh Star IA : le checkout crée dynamiquement le prix récurrent à partir du forfait choisi.

## Variables d'environnement

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
WESH_APP_URL=https://votre-domaine.example
```

Ne mets jamais ces clés dans le code ou dans Git.

## Webhook

Configurer Stripe pour appeler :

`POST https://votre-domaine.example/api/stripe/webhook`

Événements à activer au minimum :
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Le webhook vérifie la signature Stripe et met à jour le profil local :
- `subscription_status`
- `subscription_tier`
- `current_period_end`
- `quota_cycle_key`
- `stripe_customer_id`
- `stripe_subscription_id`

À chaque `invoice.paid`, Wesh Star IA considère le nouveau cycle comme payé et applique son propre quota mensuel. Le calcul reste **1 minute = 6 crédits vidéo**.

## Gestion de l'abonnement

Le bouton **Gérer mon abonnement Stripe** ouvre le portail Stripe via `/api/stripe/portal`, afin que le client puisse notamment annuler son abonnement.

## Important

Wesh Star IA ne stocke jamais les numéros de carte. Stripe traite les données de paiement.
