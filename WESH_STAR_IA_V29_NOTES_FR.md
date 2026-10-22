# Wesh Star IA V29 — corrections et trésorerie FCFA

## Ajouts
- Achat de pièces et d'abonnements en FCFA (Flutterwave), crédités automatiquement dans Admin > Trésorerie.
- Webhook Flutterwave (il n'existait pas : un client qui fermait son navigateur après paiement n'était pas activé).
- Bénéficiaires bancaires (IBAN / RIB) en plus du Mobile Money.
- Vue « Entrées par origine » dans la Trésorerie.

## Corrections
- `.env.example` complété (toutes les variables lues par le code).
- Le jeton du worker GPU fonctionne avec `SELF_HOSTED_WORKER_TOKEN` ou `WESH_GPU_WORKER_TOKEN`.
- Sélecteur de paiement : choisir Flutterwave positionne bien la devise FCFA.
- Fichier de build `tsconfig.tsbuildinfo` retiré ; anciennes notes déplacées dans `docs/archive/`.

## À faire avant la mise en ligne
`npm install`, `npm run db:migrate`, `npm test`, `npm run build`, puis un vrai paiement de test Flutterwave (mode test).
Les annonces internes restent réservées aux utilisateurs connectés.

## Fusion avec la V30 (ZIP « CREATOR-PAYOUT-APPROVAL »)
Ajouté depuis la V30, sans rien retirer de la V29 :
- **LIVE audio/vidéo auto-hébergé (LiveKit)** : service Docker, route `/api/live/token`, scène caméra/micro dans le LIVE.
- **Logo, emoji et 4 thèmes** modifiables dans le panneau Admin > Paramètres du site.
- **Retraits créateurs avec choix du moyen** (virement, PayPal, Mobile Money) et validation par l'admin ; migration `20261016_creator_payout_destination.sql`.
- Documents : `LIVE_STREAMING_SELF_HOSTED.md`, `CREATOR_PAYOUT_APPROVAL_V30.md`.

Corrigé pendant la fusion (problèmes présents dans la V30) :
- Le jeton LiveKit donnait le droit d'émettre caméra/micro à **tous** les spectateurs. Maintenant seuls l'hôte et les invités acceptés émettent ; les autres sont spectateurs (bouton « Actualiser » après acceptation).
- `docker-compose.yml` exigeait les clés LiveKit : le site entier refusait de démarrer sans elles. LiveKit est maintenant un profil séparé : `docker compose --profile live up -d`.
- Le bouton FCFA des pièces de la V29 a été réappliqué sur le panneau des pièces de la V30.

Reste à faire pour le LIVE : domaine + HTTPS, ports ouverts, test sur deux appareils, serveur TURN pour les réseaux restrictifs.

## Partage des cadeaux (60 % créateur / 40 % plateforme)
- Déjà en place : quand quelqu'un offre un cadeau de 100 pièces, le créateur reçoit 60 pièces de « gains » et la plateforme 40. Les pourcentages se règlent dans Admin > Économie créateur (la somme fait toujours 100 %, valeur par défaut 60/40).
- Corrigé : la comptabilité en euros (achats de pièces Stripe et FCFA, cadeaux réofferts) utilisait 40 % écrit en dur. Elle suit maintenant le pourcentage réglé dans l'admin. Le texte du portefeuille de pièces aussi.
- Seules les pièces « gains » sont retirables ; les pièces achetées ne le sont pas.

## V33 — Trésorerie des pièces (euros) et retraits
- Admin > Économie créateur > « Trésorerie des pièces (euros) » : part plateforme, réserve créateurs, dû aux créateurs (gains + retraits non payés), surplus retirable.
- Retrait de la réserve par l'admin : possible jusqu'au surplus ; au-delà, il faut écrire FORCER (la réserve ne couvrirait plus tous les gains). Chaque retrait est enregistré avec référence et journal d'audit. Migration `20261027_creator_reserve_withdrawal.sql`.
- Retraits automatiques des créateurs (désactivé par défaut) : le créateur demande son retrait ; si les règles sont réunies (minimum atteint, gains suffisants, compte non bloqué, ancienneté, aucune autre demande en cours, réserve suffisante, montant ≤ plafond), la demande est **approuvée automatiquement**.
- Limite : le **versement réel** n'est pas automatique (aucun prestataire de virement n'est connecté) ; il faut l'exécuter puis cliquer « Payé » avec la référence.
- Ce sont des écritures comptables : l'argent réel est dans Stripe / Flutterwave. Garder la réserve de côté.

## V34 — Valeur en euros, conversion en crédits vidéo, retraits activables
- Portefeuille de pièces : affichage « ≈ X € · Y FCFA (valeur indicative, 100 pièces = 1 €) », avec la part de gains reçus en cadeau.
- **Retraits en argent désactivés par défaut** : tant que tu ne coches pas « Retraits en argent ACTIVÉS » (Admin > Économie créateur), le créateur voit « bientôt disponible » et l'API refuse (PAYOUTS_DISABLED).
- **Conversion des gains en crédits vidéo IA** (désactivée par défaut) : le créateur demande, les pièces gagnées sont réservées, tu valides (crédits ajoutés) ou refuses (pièces rendues). Réglages : crédits pour 100 pièces (80 par défaut = prix boutique) et minimum. Une seule demande en attente par créateur. Migration `20261028_credit_conversion.sql`.
- Si la conversion est désactivée, le créateur doit acheter un forfait pour générer des vidéos.
- Comptabilité : la valeur des pièces converties reste dans la réserve créateurs (elle augmente le « surplus retirable »).
