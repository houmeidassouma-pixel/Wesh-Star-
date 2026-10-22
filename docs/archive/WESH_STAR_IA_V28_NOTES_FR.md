# Wesh Star IA V28 — nom conservé, réglages publicitaires

## Modifications de cette version
- Le nom par défaut est rétabli à **Wesh Star IA**.
- Le nom reste modifiable dans le panneau administrateur, section Paramètres du site. Après enregistrement, il est utilisé dans les endroits qui lisent la configuration de marque.
- Les tarifs de promotion restent configurables par l'administrateur : prix pour 1 000 vues qualifiées et objectifs minimum/maximum.
- Dans le panneau Publicités & revenus, l'administrateur peut définir : plafond quotidien par utilisateur, insertion d'une annonce toutes les X publications du fil, et nombre maximum d'annonces par visite du fil.
- Le réglage de plafond quotidien à 0 désactive la diffusion des annonces du module interne.
- Les anciennes fonctions et routes n'ont pas été volontairement supprimées.
- Une migration met à jour le nom en base uniquement si l'ancien nom est exactement « Westa IA »; les noms personnalisés existants sont conservés.

## Publicités : ce qui fonctionne et ce qui reste à configurer
- Les campagnes directes sont un modèle séparé des annonces d'une régie externe.
- Le projet propose une configuration Google AdSense ou une autre régie via code d'intégration. Il faut créer/faire approuver le compte externe et fournir les identifiants nécessaires.
- Les annonces du fil communautaire utilisent le placement réglable ici. Les pauses publicitaires sur vidéos longues restent une configuration de politique, pas une insertion mid-roll garantie dans tous les lecteurs.
- Le paramètre « visiteurs non connectés » est conservé dans l'interface mais la route de diffusion actuelle exige un utilisateur connecté; les annonces aux visiteurs anonymes ne sont donc pas considérées comme opérationnelles dans cette version.
- Les revenus et clics AdSense réels doivent être contrôlés dans le tableau de bord du réseau; le site ne peut pas inventer ou garantir ces revenus.

## Indépendance et Stripe
- La base de code utilise une base PostgreSQL, authentification et stockage gérés par le projet, ainsi qu'un worker vidéo auto-hébergé configuré par variables d'environnement. Il faut fournir le serveur, le GPU, PostgreSQL, FFmpeg, les modèles locaux, le stockage persistant, l'e-mail et la sauvegarde.
- Stripe est un prestataire externe de paiement : il n'est pas nécessaire pour faire tourner le moteur vidéo local, mais il est utile pour les paiements par carte et les abonnements récurrents. Le retirer implique de remplacer checkout, webhooks, remboursement et gestion des paiements par une autre solution. Recommandation : conserver Stripe comme option de paiement au lancement plutôt que le supprimer avant qu'un autre moyen soit réellement intégré.
- Les API officielles des réseaux sociaux et les régies publicitaires restent externes si ces fonctions sont activées.

## Validation
Cette archive a fait l'objet de contrôles statiques sur les fichiers modifiés et son intégrité ZIP. Une compilation Next.js complète et un test de bout en bout ne sont pas déclarés réussis : les dépendances n'étaient pas installées dans l'environnement de préparation. Appliquer la migration SQL et exécuter `npm install`, `npm test`, puis `npm run build` dans un environnement de déploiement avant la production.
