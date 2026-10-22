# Wesh Star IA V11 — audit du code et améliorations

Date de l'audit : 15 octobre 2026
Base analysée : archive V10 Multi-Payments (dossier interne V8-WIP).

## Résumé

Cette livraison conserve l'application existante et ajoute des protections ciblées. Elle n'est **pas déclarée prête pour une mise en production commerciale** : certaines vérifications exigent l'installation des dépendances, une base PostgreSQL réelle, les secrets du propriétaire, des comptes marchands approuvés et une machine NVIDIA compatible.

## Changements intégrés dans V11

1. **Tolérance contrôlée aux réponses JSON** : nouveau `src/lib/robust-json.ts`, sans `eval` ni exécution de code; traite JSON standard, blocs Markdown JSON, JSON intégré dans un texte et virgules finales.
2. **Repli entre workers vidéo** : `src/lib/video-provider.ts` essaie les workers configurés l'un après l'autre si la création d'un job échoue. Les identifiants de job restent liés à leur worker pour le polling.
3. **Validation plus stricte des identifiants de job** : format du préfixe et de l'identifiant vérifié avant d'appeler le worker.
4. **Timeouts bornés** : timeout d'appel au worker ramené dans une plage sûre de 1 à 120 secondes.
5. **Contrôle des signatures de fichiers** : les endpoints image et vidéo ne se fient plus seulement au MIME annoncé par le navigateur; ils vérifient les signatures binaires PNG/JPEG/GIF/WebP et MP4/MOV/WebM.
6. **Préréglages créatifs** : styles rapides pour publicité produit, cinématique, UGC, comédie, documentaire, anime, mode, fantastique, cuisine et clip musical; palettes visuelles supplémentaires.
7. **Tests automatisés supplémentaires** : tests de récupération JSON et de validation de signatures de fichiers.

## Tests effectués

- `npm test` : **18 tests réussis, 0 échec**.
- Le test de génération vidéo réel n'a pas été exécuté : aucun worker GPU n'a été lancé dans cet environnement.
- Le build Next.js et le contrôle TypeScript complet n'ont pas pu être validés : les dépendances (`node_modules`) ne sont pas présentes et l'installation réseau n'a pas été réalisée. L'archive de base ne contient pas de lockfile npm; une installation en environnement réseau est nécessaire pour créer et versionner `package-lock.json` avant de pouvoir utiliser `npm ci` de façon reproductible.
- Les webhooks réels de paiement n'ont pas été testés avec des comptes marchands et des secrets actifs.
- Les migrations SQL et les flux de bout en bout n'ont pas été exécutés contre une base de production.

## Points de vigilance importants repérés dans la base

- **Paiements** : Stripe/PayPal/Flutterwave nécessitent leurs identifiants marchands réels, la configuration des webhooks, des essais de paiement et une vérification des remboursements/annulations. Le document multi-paiements indique que certains parcours restent limités aux achats ponctuels; l'abonnement récurrent n'est pas uniformément disponible sur tous les moyens.
- **Indépendance** : l'authentification, le stockage local et PostgreSQL ont des implémentations locales dans le code; l'indépendance opérationnelle dépend néanmoins de la configuration correcte du serveur, des sauvegardes, des clés secrètes et des services de messagerie/paiement externes nécessaires.
- **GPU** : le moteur utilise des modèles locaux et requiert un environnement CUDA compatible. La génération, la qualité, la VRAM et les temps de rendu doivent être mesurés sur le matériel cible.
- **Réseaux sociaux** : l'autopublication dépend des droits OAuth/API, des autorisations de chaque plateforme et de leurs règles. La présence d'un écran ou d'un connecteur ne garantit pas l'accès à une API de publication.
- **Publicité** : AdSense ou un autre réseau doit approuver le site et le compte; le code ne garantit pas de revenus.
- **Légal et confidentialité** : les pages légales doivent être vérifiées et adaptées à l'entreprise, au pays d'exploitation, au traitement des vidéos/personnages et aux règles de protection des données.
- **Limiteur de débit** : le limiteur actuel est en mémoire par processus. Pour plusieurs instances ou un déploiement distribué, un contrôle global au reverse proxy ou via une base partagée est recommandé.
- **Tâches GPU** : les métadonnées de job sont maintenant sauvegardées atomiquement dans `jobs-state.json`. Après redémarrage, les jobs terminés peuvent être retrouvés; les jobs interrompus sans fichier vidéo sont marqués en échec avec un message explicite. Le rendu de diffusion ne reprend pas au milieu d'un job : une véritable file durable avec reprise/replanification contrôlée reste une amélioration prioritaire avant le lancement.

## Fonctions de la liste initiale volontairement non ajoutées

- **Pool de clés API et LiteLLM** : non ajoutés par défaut, car le cœur choisi est le moteur GPU local; ces mécanismes introduiraient des dépendances de fournisseurs externes et ne remplacent pas la disponibilité des GPU locaux.
- **Flux d'actualité, Google News RSS et fact-checking automatique** : non activés automatiquement. Ce serait un produit éditorial séparé, avec des enjeux de droits, de citations, de vérification des sources et de risque de désinformation.
- **Personnages de chatons récurrents et palettes très spécialisées** : seules les palettes de création les plus générales ont été ajoutées; les personnages et univers éditoriaux doivent rester des choix de produit plutôt qu'être imposés à tous les utilisateurs.

## Ordre recommandé avant mise en vente

1. Dans un environnement avec accès au registre npm, lancer `npm install` pour créer le `package-lock.json`, le versionner, puis vérifier `npm ci`, `npm test`, `npx tsc --noEmit` et `npm run build`.
2. Déployer sur une machine cible, appliquer les migrations SQL, configurer les secrets et tester l'inscription, la connexion, la récupération de mot de passe et les permissions de rôles.
3. Tester de bout en bout une génération texte-vers-vidéo, image-vers-vidéo, les échecs, les remboursements de jetons et les redémarrages.
4. Tester chaque moyen de paiement en mode sandbox, les webhooks dupliqués, les paiements échoués, remboursements, annulations et renouvellements.
5. Ajouter une file de jobs persistante, des sauvegardes PostgreSQL/storage testées et une supervision des workers avant d'ouvrir largement le service.
6. Faire une revue de sécurité indépendante et une revue juridique avant de recevoir des paiements réels.

## Addendum V11.1 — communications groundwork (2026-10-15)

- Added private-message tables, authenticated API routes, contact search and `/messages` interface.
- Added call-session and signaling tables/routes as a WebRTC server-side foundation. Call endpoints remain disabled unless `COMMUNICATIONS_ENABLED=true`.
- Added tests for the disabled-by-default configuration and the database separation between communications and video-generation quota.
- Test run after this addendum: 21/21 tests passed.
- Full Next.js/TypeScript build was not run because `node_modules` is not present in this environment. PostgreSQL migrations were not applied to a live database. Audio/video calls are NOT yet complete: browser WebRTC media controls, TURN deployment, access/abuse policy, end-to-end two-network tests and bandwidth measurements remain required.
- Messaging API/UI is implemented in code but still needs a full build, database migration, UI/browser testing and privacy/security review before public launch.
