# X / Twitter + LinkedIn — Autopilot

Cette version ajoute X/Twitter et LinkedIn comme plateformes réelles de l'Autopilot, sans retirer les plateformes existantes.

## Plateformes Autopilot
- TikTok
- Facebook
- YouTube
- Instagram
- Snapchat
- Twitch
- X / Twitter
- LinkedIn

## X / Twitter
- Compte stocké côté serveur.
- OAuth 1.0a user-context : consumer key/secret + access token/secret.
- Upload vidéo segmenté (INIT / APPEND / FINALIZE), puis publication via X API v2.
- Limite Autopilot configurée à 140 secondes par défaut.

## LinkedIn
- Compte stocké côté serveur.
- Access token + owner URN (`urn:li:person:...` ou `urn:li:organization:...`).
- Upload via LinkedIn Videos API (initializeUpload, upload des parties, finalizeUpload).
- Publication via LinkedIn Posts API avec le video URN.
- Limite Autopilot configurée à 1 heure par défaut.

Les comptes et permissions API doivent être approuvés/configurés auprès de chaque plateforme. L'intégration Wesh Star IA ne contourne pas les restrictions des APIs.
