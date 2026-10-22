# Wesh Star V29 — bilan du correctif (français)

## Changements ajoutés
- Ajout du service LiveKit auto-hébergeable dans Docker Compose.
- Ajout d'une route serveur qui vérifie la session LIVE et les blocages avant de signer un jeton LiveKit de courte durée.
- Ajout d'une scène navigateur audio/vidéo avec caméra, microphone et abonnement aux pistes des autres participants.
- Ajout des variables de configuration LiveKit dans `.env.example` et d'un guide de mise en route.
- Ajout au panneau Admin de l'URL du logo, de l'emoji de secours et de quatre thèmes visuels. Le nom, le slogan et la couleur principale étaient déjà modifiables; le nom et le logo sont maintenant transmis à la navigation de l'application.
- Ajout de tests statiques pour ces nouvelles intégrations.

## Vérifications effectuées
- Docker Compose a été lu avec un parseur YAML : les services sont structurés correctement.
- Les tests Node existants et les tests statiques ajoutés ont été exécutés localement.
- Le contrôle des tests existants a donné 56 tests réussis avant l'ajout des deux nouveaux tests; relancer `npm test` dans l'environnement cible donne le total final.
- `npm install` a dépassé le délai de cet environnement. Par conséquent, **la compilation Next.js/TypeScript n'a pas pu être validée ici** et la connexion réelle à un serveur LiveKit n'a pas été testée depuis deux appareils.

## Limites qui restent avant production
- Le domaine public, TLS/HTTPS, les ports du routeur/pare-feu et `LIVEKIT_PUBLIC_URL` doivent être configurés par l'exploitant.
- TURN/relais pour les réseaux restrictifs n'est pas provisionné automatiquement; il faut le configurer et le tester pour une portée Internet robuste.
- L'autorisation d'invité Wesh Star n'est pas encore traduite en droits de publication LiveKit distincts; il faut terminer ce contrôle avant un LIVE multi-invités public.
- L'authentification existante du projet utilise encore Supabase Auth (`src/lib/access.ts` et `src/lib/account/server`). Ce ZIP ne doit donc pas être présenté comme 100 % indépendant de Supabase tant que cette dépendance n'a pas été remplacée et migrée.
- La présence d'un service média ne remplace pas les tests de charge, de sécurité, de sauvegarde et de restauration.
