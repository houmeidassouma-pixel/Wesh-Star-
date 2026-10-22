# V11 — améliorations après audit

- Durcissement de la validation des images et vidéos importées par les endpoints principaux.
- Parseur JSON de secours sans exécution de code pour les réponses des workers.
- Repli automatique sur les workers vidéo configurés lors de la création d'un job.
- Validation des identifiants de job et bornage des timeouts HTTP.
- Sauvegarde atomique des métadonnées de jobs du worker GPU et état d'échec explicite des jobs interrompus au redémarrage (sans prétendre reprendre un rendu en cours).
- Styles de scénario et palettes visuelles préréglés dans le studio de génération.
- Ajout de tests de sécurité et d'un rapport d'audit détaillant les vérifications non exécutées et les étapes préalables au lancement.

Voir `RAPPORT_AUDIT_COMPLET_V11.md` pour les limites et les étapes restantes.

## V11.1 — Communications self-hosted groundwork (2026-10-15)
- Added private-message database migration, authenticated API routes, contact search and `/messages` page.
- Added call session and WebRTC signaling database/API foundation for audio/video calls.
- Added `COMMUNICATIONS_ENABLED=false` default and self-hosted infrastructure/cost documentation.
- Message traffic does not consume video-generation tokens. Audio/video calls are not production-ready until browser WebRTC client, TURN, abuse controls and two-network testing are completed.
