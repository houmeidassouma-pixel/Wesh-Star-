# Wesh Star IA — paiements et prix des crédits IA (V15)

## Monnaies séparées

- **Crédits vidéo** : 1 crédit vidéo = 10 secondes de génération. 6 crédits = 1 minute. Ils ne sont ni des pièces cadeaux ni de l'argent retirable.
- **Pièces Wesh Star** : uniquement cadeaux, LIVE et coffres. Les coffres débitent maintenant le portefeuille de pièces, jamais `hour_credits_seconds`.
- **Gains en argent** : les gains créateurs et la commission de la plateforme sont un registre distinct. Les retraits restent soumis à vérification et à un prestataire de versement.

## Exemple de prix à tester, pas tarif final garanti

Règle actuelle des packs vidéo ponctuels : 80 crédits vidéo = 1 €, prix arrondi au centime et packs à partir de 7 minutes pour respecter le minimum de paiement de 0,50 €. Les prix des abonnements mensuels restent réglables par l’admin. Il faut mesurer le coût réel du GPU, l’électricité, l’amortissement, le stockage, les générations échouées et les frais de paiement avant d’ouvrir la vente réelle. Ne pas autoriser la conversion des pièces cadeaux en crédits vidéo.

## Paiements : état réel et limites

- **Stripe Checkout sur le site** : le checkout d'achat de pièces est implémenté. Google Pay et Apple Pay peuvent apparaître lorsque le compte Stripe, le domaine, le navigateur/l'appareil et le pays sont éligibles et que les méthodes sont activées dans le Dashboard Stripe. Leur affichage n'est pas garanti pour tous les pays.
- **Google Pay** est un moyen de paiement web/mobile, pas le système de facturation de Google Play.
- **Google Play Billing** : obligatoire en règle générale pour vendre des biens numériques (pièces virtuelles, crédits IA, abonnements) dans une application Android distribuée par Google Play, sauf exception régionale/politique. Ce projet est actuellement une application web Next.js/PWA et ne contient pas d'intégration Android Play Billing. Il faut un client Android natif ou un wrapper compatible, des produits configurés dans Play Console et une validation des achats côté serveur avant de créditer les soldes. Ne jamais créditer à partir d'une simple confirmation client.
- **PayPal, Flutterwave/Mobile Money et méthodes locales** : des intégrations existent pour certains achats de forfaits, mais elles ne sont pas encore intégrées au parcours d'achat de pièces dans cette version. Elles ne doivent pas être présentées comme activées pour les pièces tant que leurs routes de création, vérification et crédit idempotent ne sont pas implémentées et testées.
- **Tous les pays / tous les moyens** ne peuvent pas être garantis par un seul fournisseur. Les options dépendent du pays d'enregistrement de l'entreprise, du pays du client, de la devise, des risques et de l'éligibilité du compte marchand.

## Cadeaux proposés par l'IA

Les propositions restent `pending`. L'administrateur doit valider le nom, l'emoji et le prix depuis le panneau Économie créateur. Après approbation, le cadeau est ajouté à l'économie active et apparaît aux utilisateurs/créateurs. L'IA ne publie pas un cadeau sans approbation admin.

## Comptabilité des coffres

Les dépôts de coffre sont maintenant pris dans le portefeuille de pièces. Pour chaque part réclamée, le partage configuré (60 % créateur / 40 % plateforme par défaut) est inscrit dans `coin_ledger`. Les parts non réclamées sont remboursées au déposant dans le portefeuille de pièces; aucun crédit IA n'est ajouté. Le minimum est de 2 pièces brutes par participant pour garantir une part créateur non nulle avec l'arrondi actuel.
