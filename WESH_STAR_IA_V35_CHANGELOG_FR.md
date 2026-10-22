# Wesh Star IA V35 — Shop international et parcours TikTok

## Ajouts
- Page authentifiée **Wesh Star Shop** accessible depuis le menu.
- Catalogue de produits avec recherche, devise EUR/XOF/USD/GBP, pays d'expédition et image HTTPS.
- Création d'annonces par les utilisateurs.
- Demandes d'achat, réponses vendeur et réservation du stock lors de l'acceptation, avec opérations transactionnelles.
- Migration SQL idempotente pour les produits et demandes de commande.
- Tests statiques pour la base de la boutique et ses contrôles d'accès.
- Les fonctions Data Saver et partage de modèle/TikTok déjà présentes dans V34 sont conservées.

## Limites importantes de cette version
- La boutique est un MVP de catalogue et de demandes entre acheteur et vendeur. **Elle ne prélève pas de paiement**, ne verse pas les fonds au vendeur et ne génère pas d'étiquette de livraison.
- Avant la vente commerciale, intégrer un paiement marketplace autorisé, vérifier l'identité des vendeurs si nécessaire, gérer les remboursements/contestations, taxes, douanes, retours, conformité produit et transporteurs.
- La publication directe TikTok reste dépendante de l'approbation des permissions officielles et de la configuration de l'application développeur.
- La consommation réelle de batterie, de données et du GPU doit être mesurée sur appareils et serveur réels.

## Mise en service
1. Sauvegarder la base PostgreSQL.
2. Exécuter `npm run db:migrate` avec `DATABASE_URL` configurée pour appliquer la migration de boutique.
3. Exécuter `npm test`.
4. Tester les annonces et demandes d'achat avec deux comptes de test avant le lancement public.

## Vérification
Les tests automatiques du dépôt doivent être exécutés dans l'environnement du déploiement. La présence du code ne signifie pas que les clés de paiement, l'application TikTok, le GPU, les emails ou les transporteurs sont configurés.
