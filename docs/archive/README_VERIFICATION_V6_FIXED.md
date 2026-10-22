# Wesh Star IA V6 — correction de sécurité

Cette archive contient les corrections effectuées localement sur la V6 fournie.

## Corrections appliquées

1. `/api/tts/preview` exige maintenant une session utilisateur valide.
2. Les appels serveur vers le worker TTS utilisent `WESH_GPU_WORKER_TOKEN`.
3. Le worker TTS refuse de démarrer si `WESH_GPU_WORKER_TOKEN` est absent.
4. Les endpoints TTS `/v1/voices` et `/v1/synthesize` exigent le bearer token.
5. Les ports `8001` (GPU) et `8002` (TTS) ne sont plus publiés par les deux fichiers Docker Compose ; ils restent accessibles uniquement sur le réseau Docker interne.
6. Le worker GPU refuse maintenant de démarrer sans `WESH_GPU_WORKER_TOKEN`.

## Vérifications effectuées ici

- Syntaxe Python de `gpu-worker/server.py` : OK.
- Syntaxe Python de `local-tts/server.py` : OK.
- Le ZIP contient 251 fichiers avant correction, conservés dans cette version sauf modifications ci-dessus.

## Vérification non effectuée dans cet environnement

- Docker n'est pas installé dans l'environnement d'analyse.
- Les dépendances npm n'étaient pas présentes et `npm install` n'a pas terminé dans le délai disponible ; un `next build` complet n'a donc pas pu être déclaré comme réussi.

Avant mise en production, exécuter :

```bash
npm install
npm run build
docker compose -f docker-compose.self-hosted.yml config
docker compose -f docker-compose.self-hosted.yml up --build
```

Puis tester : connexion utilisateur, génération TTS, génération GPU, génération vidéo longue, quotas, paiement, stockage, autopilot et publication sociale.
