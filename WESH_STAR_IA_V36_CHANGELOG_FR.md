# Wesh Star IA V36 — Rémunération publicitaire créateurs et guide de lancement

## Ajouts dans le code
- Tableau de bord de monétisation créateur : affiche les revenus publicitaires attribués et les critères d'éligibilité déjà présents.
- Nouveau panneau d'administration pour enregistrer les recettes publicitaires **nettes effectivement encaissées**, définir la part des créateurs et répartir cette somme entre les créateurs approuvés au prorata des vues qualifiées pendant la période.
- Écritures dans le portefeuille de gains avec une clé d'idempotence; une période ne peut pas être traitée deux fois.
- Historique des périodes, montant du pool, montant attribué et montant restant non attribué.
- Tests statiques de migration et des garde-fous principaux.
- Le Shop permet maintenant au vendeur de mettre une annonce en pause, la réactiver et modifier son stock. Les contrôles d’ownership empêchent de modifier les annonces d’un autre vendeur.

## Limites à ne pas confondre avec des fonctions terminées
- Le fournisseur publicitaire ne transmet pas automatiquement ses paiements à Wesh Star dans cette version. L'administrateur saisit manuellement un relevé après réception réelle des fonds.
- Le module répartit des revenus déclarés; il ne crée pas de revenus publicitaires et ne vérifie pas indépendamment le relevé fournisseur.
- Le module crédite le portefeuille interne. Le paiement bancaire, PayPal ou mobile money reste une opération distincte, soumise aux contrôles et à l'exécution réelle du virement.
- Les vues qualifiées sont des vues uniques de comptes connectés ayant atteint 5 secondes; ce mécanisme de base ne remplace pas un système professionnel de détection de fraude publicitaire.
- Les critères d'éligibilité actuels sont des paramètres propres à Wesh Star et ne sont pas ceux de YouTube. Ils doivent être validés avant un lancement commercial.
- Wesh Star Shop est toujours un MVP de catalogue et de demandes d'achat. Aucun paiement acheteur-vendeur, remboursement automatisé, étiquette d'expédition ou règlement vendeur n'est intégré dans ce ZIP.
- Les publications directes sur TikTok nécessitent toujours l'approbation et la configuration des permissions officielles.

## Mise à niveau
1. Sauvegarder PostgreSQL.
2. Configurer `DATABASE_URL` et exécuter `npm run db:migrate`.
3. Exécuter `npm test` et `npm run build` dans l'environnement de déploiement.
4. Tester en préproduction avec des comptes fictifs, une période de revenus fictive et un relevé de test. Ne pas créditer de véritables utilisateurs avant validation comptable et juridique.

## Prochaines étapes Shop avant vente réelle
1. Ajouter un prestataire de paiement marketplace qui autorise explicitement le modèle vendeur/acheteur et les pays ciblés.
2. Concevoir le parcours de paiement confirmé côté serveur (webhooks signés, idempotence, annulation et remboursement).
3. Ajouter gestion des adresses et expéditions, suivi de colis, retours et litiges.
4. Définir les frais de plateforme, la fiscalité, les contrôles vendeurs et les règles de conformité pour chaque pays.
5. Tester les commandes de bout en bout avec des comptes sandbox et un petit groupe de vendeurs.
