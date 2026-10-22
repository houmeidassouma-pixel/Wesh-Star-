# Admin — Forfaits mensuels en minutes

Les forfaits mensuels client sont configurables indépendamment des anciens packs de crédits.

## Règle client
- 1 à 60 minutes incluses par mois, selon le forfait choisi.
- Prix mensuel configurable par l’admin pour chaque forfait.
- Plafond quotidien configurable par l’admin.
- Une génération vidéo Studio utilisateur est limitée à 10 minutes maximum.
- La durée proposée dans le Studio est automatiquement limitée au quota restant du jour et du mois.

## Exemple
Un forfait « 30 minutes / mois » à 15 € avec « 5 minutes / jour » permet :
- 1 min,
- 2 min,
- 3 min,
- 4 min,
- 5 min
selon le quota restant.

Si 28 minutes du mois ont déjà été consommées et qu’il reste 2 minutes, le Studio ne propose plus que 1 ou 2 minutes.

Les quotas sont stockés et consommés en secondes en interne ; l’interface les affiche en minutes.
