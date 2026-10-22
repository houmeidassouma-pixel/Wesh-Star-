# Wesh Star IA V15 — crédits séparés

- Jeton IA : 10 secondes de génération; 6 jetons IA = 1 minute. Conversion utilisée par les soldes et l'ajout de quotas administrateur.
- Pièces Wesh Star : distinctes des crédits IA. Les cadeaux utilisent le portefeuille de pièces.
- Coffres LIVE : dépôt, attribution des parts, commission 60/40 et remboursement des parts non réclamées sont comptabilisés dans `coin_ledger`, sans créditer le quota vidéo. Le pourcentage créateur est figé à la création du coffre.
- Prix des cadeaux : les propositions générées restent en attente; seul l'administrateur peut les approuver, ajuster le prix et les publier dans le catalogue partagé.
- Ajout de documentation sur prix indicatif des jetons IA, Google Pay, Google Play Billing et limites des méthodes de paiement par pays.

## Vérifications

- `npm test`: 33 tests réussis.
- `npm run build`: non exécuté avec succès dans l'environnement de préparation car la dépendance `next` n'est pas installée (`next: not found`).
- Pas de test de paiement réel, de migration sur une base de production, ni de génération GPU réelle.
