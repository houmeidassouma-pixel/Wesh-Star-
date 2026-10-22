# Wesh Star IA — messagerie privée et appels en infrastructure locale

## Ce qui est ajouté dans cette version

- Table `private_messages` et API authentifiées pour lister/envoyer des messages privés.
- Recherche de contacts par préfixe d'adresse e-mail, sans exposer les adresses dans les résultats.
- Interface `/messages` pour rechercher un membre et envoyer des messages.
- Tables `communication_calls` et `call_signals` et routes de démarrage, d'état et de signalisation pour préparer les appels audio/vidéo WebRTC.
- Les messages n'utilisent pas les jetons de génération vidéo. Les routes de démarrage/signalisation d'appel sont désactivées par défaut avec `COMMUNICATIONS_ENABLED=false`.

## Important : limites avant production

Cette livraison ne prétend pas que les appels audio/vidéo sont prêts à l'emploi : le client WebRTC (capture microphone/caméra, interface appel entrant, offre/réponse SDP, ICE et raccrochage) et le serveur TURN doivent encore être intégrés et testés. Les routes de signalisation constituent le socle serveur, pas une fonction d'appel complète. Ne pas mettre `COMMUNICATIONS_ENABLED=true` avant ces étapes et une revue de sécurité.

## Infrastructure et consommation

- L'ordinateur dédié peut héberger Next.js et PostgreSQL, s'il reste allumé et dispose d'une connexion Internet stable.
- Le téléphone de l'administrateur n'a pas besoin de relayer les appels ni d'héberger le site. Sa connexion mobile n'est utilisée que lorsqu'il navigue lui-même sur le site via les données mobiles.
- Les appareils des participants utilisent leurs propres connexions Internet mobiles ou Wi-Fi.
- Le serveur consomme de l'électricité et de la bande passante. Les appels WebRTC peuvent être directs entre participants, mais certains réseaux nécessitent un relais TURN qui peut générer beaucoup de trafic sortant. L'hébergement local ne rend donc pas le service sans coût.
- Les appels et messages ne retirent aucun crédit vidéo dans le code ajouté. Si une offre payante doit autoriser l'accès, implémenter et tester une règle d'abonnement/quota de communication séparée avant la mise en service.

## Mise en place

1. Sauvegarder la base PostgreSQL.
2. Appliquer les migrations avec `npm run db:migrate`.
3. Garder `COMMUNICATIONS_ENABLED=false` jusqu'à la fin de l'intégration WebRTC/TURN.
4. Installer un reverse proxy HTTPS ; microphone et caméra du navigateur exigent un contexte sécurisé (HTTPS, sauf localhost).
5. Ajouter limitation de débit, blocage utilisateur, signalement, consentement aux appels, durée de conservation et suppression des données.
6. Tester les appels depuis deux réseaux différents et mesurer le trafic TURN avant de vendre la fonction.
