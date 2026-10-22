# Wesh Star IA V16 — crédits vidéo, pièces et scène LIVE

## Changements
- Interface de génération renommée en **crédits vidéo** ; 1 crédit vidéo = 10 secondes, donc 6 crédits = 1 minute. Les noms internes de certaines colonnes SQL restent historiques pour préserver les comptes et soldes existants.
- Dans l’administration, les quotas individuels et forfaits sont réglés en minutes ; les utilisateurs voient le nombre de crédits vidéo. Les forfaits mensuels conservent un prix administrable.
- Packs vidéo à l’achat unique : prix calculé à raison de 80 crédits vidéo = 1 €, avec un minimum de 7 minutes pour respecter le minimum de paiement de 0,50 €. Les crédits sont toujours débités en secondes sur le serveur.
- Packs de pièces par défaut : 100 / 0,99 €, 500 / 3,99 €, 1 200 / 7,99 €, 3 000 / 14,99 €, 7 000 / 29,99 €. Une configuration ancienne correspondant exactement aux anciens packs par défaut est migrée logiquement vers ces nouveaux packs ; les configurations personnalisées sont préservées.
- Partage des cadeaux : le portefeuille du créateur reçoit 60 % en pièces gagnées et la plateforme 40 % au moment où le cadeau est envoyé/réclamé. L'achat de pièces ne déclenche pas la répartition créateur/plateforme. Les pièces achetées ne sont pas retirables.
- Seuil provisoire de demande de retrait : 1 000 pièces gagnées. Ce seuil n’équivaut pas encore à un montant garanti en euros : le taux officiel pièces → argent doit être défini avant d’activer des paiements automatiques. Les retraits restent manuels et nécessitent une référence d’exécution.
- Les cadeaux peuvent avoir une URL d’image et une URL GIF/MP4 facultatives. Les propositions IA textuelles restent en attente jusqu’à validation admin ; l’admin peut ajouter les URLs, ajuster le prix, approuver/refuser, ou créer un cadeau personnalisé. Les propositions IA peuvent maintenant lancer une génération PNG en arrière-plan via le worker GPU local ; elles restent en attente d’approbation. Les animations GIF/MP4 restent facultatives et peuvent être ajoutées par l’admin via URL.
- LIVE : choix entre solo sans match et LIVE avec scène d’invités ; jusqu’à 9 invités, demandes à accepter/refuser par l’hôte.

## Limites à ne pas masquer
- Le LIVE n’a toujours pas de transport vidéo/audio en direct. V16 ajoute la configuration de scène et le workflow d’approbation des invités, pas un moteur de streaming/WebRTC.
- La migration SQL doit être appliquée sur la base cible avant le déploiement.
- Les paiements, les webhooks, les remboursements, les images hébergées et les flux GPU réels doivent être testés dans l’environnement de déploiement.
- La règle 80 crédits = 1 € s’applique aux packs vidéo ponctuels. Les prix d’abonnement mensuel restent modifiables par l’administrateur.
