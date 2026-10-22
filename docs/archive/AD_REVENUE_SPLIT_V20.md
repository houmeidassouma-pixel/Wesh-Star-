# Wesh Star IA V20 — partage des revenus publicitaires vidéo

- Valeur par défaut enregistrée : **10 % pour les créateurs / 90 % pour Wesh Star IA**.
- Le panneau Admin > Publicités & revenus expose le pourcentage créateur et calcule automatiquement la part complémentaire de la plateforme.
- L'administrateur peut modifier la part créateur de 0 à 100 % ; la part plateforme reste `100 - part créateur`.
- Le paramètre est stocké dans `site.ads.creatorSharePercent` et conservé dans les réglages existants.
- Les campagnes de sponsoring direct et l'économie des pièces/cadeaux restent séparées.

## Limite importante

Cette modification enregistre la règle de partage et l'expose dans le panneau d'administration. Elle **n'implémente pas à elle seule** l'attribution de recettes AdSense par vidéo, le calcul des soldes de gains publicitaires des créateurs ou les virements automatiques. AdSense verse normalement au titulaire du compte de régie ; une intégration de rapports/attribution et un processus de paiement distinct restent nécessaires avant de payer automatiquement les créateurs sur ces recettes.
