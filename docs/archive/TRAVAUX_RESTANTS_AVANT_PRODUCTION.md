# Wesh Star IA — travaux restant à terminer avant production

Cette liste est volontairement honnête : une fonction ne doit pas être déclarée « terminée » uniquement parce qu'un écran ou un endpoint existe.

## Fonctions majeures non livrées comme expérience complète
1. **LIVE audio/vidéo réel** : brancher un serveur de streaming (par exemple LiveKit auto-hébergé), émettre un jeton d'accès signé côté serveur, publier la caméra/micro, recevoir les flux, gérer les permissions hôte/invité et tester les reconnexions. Les salons, la présence, les cadeaux et coffres ne suffisent pas à fournir le flux vidéo.
2. **Montage manuel réel** : timeline avec découpe entrée/sortie, réorganisation, pistes audio, prévisualisation et export serveur. L'interface existante de montage automatique n'est pas une timeline manuelle.
3. **Musique sur clips IA en un parcours** : fournir un parcours qui associe une piste au résultat IA et fait le mixage final FFmpeg, sans demander à l'utilisateur de télécharger puis réimporter manuellement.
4. **Diamants** : si cette deuxième monnaie est souhaitée, concevoir un registre séparé, des règles de conversion/achat, des écritures comptables idempotentes, les écrans et les contrôles admin. Elle ne doit pas être confondue avec les jetons Wesh.
5. **Retrait des gains créateurs** : sélectionner un prestataire autorisé dans les pays ciblés, vérifier l'identité/éligibilité si nécessaire, gérer frais, remboursements, seuils, rapprochement et webhooks. Le solde interne actuel n'est pas un versement bancaire.
6. **Paiements CFA/Mobile Money** : choisir et configurer un prestataire réellement disponible pour chaque pays. Un solde affiché dans l'interface n'est pas une preuve que les fonds ont été encaissés.
7. **Publicités réelles** : compte régie approuvé, domaine et fichiers de validation configurés, identifiants corrects, consentement requis selon les pays, puis vérification des impressions. Les statistiques internes ne remplacent pas le relevé de la régie.
8. **Effets/cadeaux IA animés** : la proposition actuelle de cadeaux est textuelle (nom/emoji/prix). La génération et la modération d'assets animés sont à développer séparément.
9. **Droits musicaux** : processus de retrait et de contestation, règles de licence, modération et éventuellement catalogue de sons licenciés. Une case de confirmation ne prouve pas les droits.

## Tests obligatoires avant ouverture publique
- `npm install`, puis `npm test`, puis `npm run build` dans un environnement propre.
- Appliquer toutes les migrations sur une base PostgreSQL vierge et sur une copie de la base existante.
- Tester les flux d'inscription, mot de passe oublié, rôles, blocage, abonnement, renouvellement, échec et remboursement.
- Tester les doubles clics, requêtes concurrentes et retries sur jetons, cadeaux, coffres et paiements.
- Tester un LIVE avec plusieurs appareils et une charge de 120 participants avant d'annoncer cette capacité.
- Tester caméra, import vidéo/audio, droits navigateur, fichiers volumineux, génération GPU, arrêt/reprise des workers et restauration de sauvegarde.
- Faire une revue de sécurité indépendante avant de traiter des paiements réels.

## Ce qui ne peut pas être activé par un simple changement de code
Les comptes et validations de prestataires, les clés secrètes, le domaine HTTPS, le matériel GPU, les modèles téléchargés, les droits musicaux et les obligations légales doivent être configurés séparément.
