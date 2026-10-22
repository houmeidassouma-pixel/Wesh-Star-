# Wesh Star IA V18 — abonnements facultatifs, retraits et modération par nom d’utilisateur

## Changements
- Abonnement de génération vidéo : paiement unique mensuel ou annuel par défaut. Le prélèvement automatique mensuel Stripe est une option séparée, décochée par défaut ; elle n’est créée que si le client la coche explicitement.
- Ajout d’un bouton dans la facturation pour ouvrir le portail Stripe et gérer/annuler un abonnement récurrent volontairement activé.
- Le panneau d’administration conserve la saisie du prix et de la durée des forfaits ; les cartes utilisateur affichent le prix et les crédits vidéo. La commission 40/60 est distincte des crédits vidéo et s’applique à l’économie des pièces/cadeaux.
- Retrait créateur configurable entre 10 € et 15 € via `WESH_CREATOR_PAYOUT_MIN_EUR` (10 € par défaut). Seules les pièces gagnées sont admissibles ; demande de retrait manuelle, paiement réel traité par l’administration.
- Nomination des modérateurs principaux et des modérateurs de LIVE par nom d’utilisateur d’un compte Wesh Star IA existant, sans saisie obligatoire de l’e-mail.
- Ajout d’un compteur de monétisation : seuil de 10 000 abonnés Wesh Star IA, plus pays autorisé et vérification administrative. La liste des pays autorisés se configure avec `WESH_MONETIZATION_COUNTRIES` (codes ISO séparés par des virgules) ; le pays d’un compte se vérifie dans le panneau admin.
- Les profils reçoivent un nom d’utilisateur public et un code pays ; la migration remplit les noms d’utilisateur existants.

## À faire avant la mise en production
- Appliquer `db/migrations/20261020_manual_renewal_and_platform_treasury.sql` et `db/migrations/20261021_v18_username_country.sql` sur une base de test puis la base de production après sauvegarde.
- Configurer `WESH_CREATOR_PAYOUT_MIN_EUR` et la liste de pays `WESH_MONETIZATION_COUNTRIES` après validation des règles et obligations légales.
- Les abonnements Stripe récurrents créés avant V18 ne sont pas annulés automatiquement : vérifier et annuler ceux que le propriétaire ne souhaite pas conserver dans le Dashboard Stripe.
- Tester le portail de facturation, l’activation via webhook, le premier paiement récurrent, un renouvellement, un échec de paiement et une annulation avec Stripe en mode test.
- La comptabilité 40/60 est un registre applicatif et ne transfère pas elle-même de l’argent. Les retraits de créateurs sont manuels. Frais, remboursements, litiges, vérification d’identité, fiscalité et prestataire de paiement sortant doivent être traités avant d’automatiser les paiements.
- Le seuil de 10 000 abonnés est mesuré sur les abonnés Wesh Star IA, pas sur TikTok/YouTube. Le franchissement du seuil ne garantit pas la monétisation ; pays et contrôles applicables restent nécessaires.
- Le streaming audio/vidéo LIVE réel nécessite encore un serveur WebRTC/SFU.
