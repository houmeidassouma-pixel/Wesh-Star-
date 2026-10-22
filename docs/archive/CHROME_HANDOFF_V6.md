# Message à transmettre à Chrome / l'agent de développement

Voici le ZIP corrigé de Wesh Star IA V6. Merci de faire la validation finale complète et de me renvoyer une archive de production uniquement si tous les tests passent.

Objectif : aucune erreur bloquante avant mise en ligne.

À vérifier obligatoirement :
- `npm install` puis `npm run build` sans erreur TypeScript/Next.js ;
- `docker compose -f docker-compose.self-hosted.yml config` ;
- démarrage complet des services ;
- authentification/session ;
- `/api/tts/preview` inaccessible sans session ;
- workers GPU/TTS non exposés publiquement ;
- token `WESH_GPU_WORKER_TOKEN` obligatoire côté GPU et TTS ;
- génération TTS réelle ;
- génération vidéo réelle sur NVIDIA CUDA ;
- génération de clips et assemblage FFmpeg ;
- quotas/abonnements ;
- Stripe si activé ;
- stockage local et URLs signées ;
- admin/modérateur ;
- autopilot et retries ;
- TikTok, YouTube, Facebook, Instagram, Snapchat, Twitch, X et LinkedIn selon les intégrations activées ;
- vérification qu'aucun secret réel n'est présent dans le dépôt ;
- vérification des dépendances et vulnérabilités ;
- test final avec un compte utilisateur réel et un compte administrateur.

Ne supprime aucune fonctionnalité existante sauf si elle est dangereuse ou incompatible avec la sécurité. Si une fonctionnalité doit être modifiée, documente précisément la modification.

Important : ne déclare pas la V6 « prête » uniquement parce que le code compile. Elle doit également réussir les tests d'exécution avec PostgreSQL, le worker TTS et un GPU NVIDIA compatible.
