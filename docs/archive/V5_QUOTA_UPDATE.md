# Wesh Star IA V5 — Quota & crédits vidéo

Ajouts intégrés sans supprimer les fonctions V5 existantes :

- Nom produit : **Wesh Star IA**.
- Quota mensuel en temps vidéo réel, stocké en secondes.
- Quota quotidien en temps vidéo.
- Règle centrale : **60 crédits = 1 minute** pour les packs de crédits vidéo. Les quotas mensuels restent comptabilisés en secondes en interne.
- Limite de durée par vidéo conservée séparément du quota mensuel.
- Crédits vidéo achetés utilisables lorsque le quota inclus est épuisé.
- Remboursement automatique du quota si une génération échoue.
- Remboursement des crédits achetés si une génération financée par crédits échoue.
- Retry d'une génération échouée : nouvelle réservation du quota.
- Protection atomique PostgreSQL contre les dépassements concurrents.
- Dashboard : temps consommé, temps restant, limite quotidienne et crédits supplémentaires.
- Administration : quotas mensuels/quotidiens modifiables par forfait.

## Valeurs par défaut

| Forfait | Prix | Temps/mois | Temps/jour | Max/vidéo |
|---|---:|---:|---:|---:|
| Gratuit | 0 € | 2 essais à vie | 2 essais max | 10 s |
| Starter | 5 € | 1 h | 1 h | 1 h |
| Basic | 7 € | 2 h | 2 h | 2 h |
| Pro | 10 € | 3 h | 3 h | 3 h |
| Creator | 15 € | 5 h | 5 h | 5 h |
| Studio | 25 € | 10 h | 8 h | 10 h |
| Business | 40 € | 20 h | 12 h | 20 h |
| Agency | 60 € | 40 h | 20 h | 40 h |
| Enterprise | 80 € | 60 h | 24 h | 60 h |

Les valeurs sont des paramètres par défaut et peuvent être modifiées par l'administrateur.


## Essai gratuit V5.1

Chaque compte reçoit exactement deux générations gratuites de 10 secondes. Le compteur est permanent et ne se remet pas à zéro chaque mois. Une génération échouée est remboursée automatiquement.

## Packs de crédits vidéo 1–60 min

Les packs client vont de 1 à 60 minutes. Chaque pack possède son prix et son nombre de crédits (60 crédits par minute) et peut être modifié depuis l'administration. La grille complète est visible dans `preview/PRICING_TRIAL_PREVIEW.html`.


Note : les packs de crédits peuvent représenter un quota total supérieur à 10 minutes, mais chaque génération Studio utilisateur est limitée à 10 minutes maximum.
