# Wesh Star IA — Tarifs mensuels dynamiques + essai gratuit

- Gratuit : exactement 2 générations à vie par compte.
- Chaque essai gratuit : 10 secondes maximum.
- Après les 2 essais gratuits : un abonnement payant est requis.
- Abonnements mensuels : l’administrateur peut créer, modifier, activer/désactiver ou supprimer un forfait de 1 à 60 minutes par mois.
- Chaque forfait possède son propre prix mensuel.
- Chaque forfait peut aussi avoir son propre plafond de minutes par jour.
- Exemple : 30 min/mois à 15 € avec 5 min/jour, ou 5 min/mois à 4 € avec 5 min/jour.
- Dans le Studio, un client ne peut choisir qu’une durée qu’il peut réellement consommer : quota mensuel restant, quota quotidien restant et maximum technique de 30 min par vidéo.
- Exemple : un forfait de 30 min/mois et 5 min/jour propose 1, 2, 3, 4 ou 5 min selon le quota restant.
- Un forfait de 2 min/mois et 2 min/jour permet une génération de 1 ou 2 min, tant que le quota reste disponible.
- Les quotas sont consommés en secondes en interne ; l’interface admin et client les présente en minutes.
- Les changements de prix des forfaits dynamiques s’appliquent aux nouveaux abonnements Stripe ; les abonnements déjà actifs conservent leur prix Stripe existant jusqu’à modification/renouvellement selon la configuration Stripe.
- Le plafond Studio de 30 min par vidéo reste indépendant des fonctions Autopilot, qui conservent leurs durées propres aux plateformes.

## Administration

Le panneau Admin contient une section « Forfaits mensuels — minutes + prix » avec :
- minutes/mois (1–60),
- prix/mois,
- minutes maximum/jour,
- activation/désactivation,
- ajout,
- suppression,
- bouton pour compléter automatiquement les minutes manquantes de 1 à 60.
