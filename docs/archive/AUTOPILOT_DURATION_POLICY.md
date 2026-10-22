# Autopilot — durée centralisée et limites de publication

- Configuration centrale dans `site_settings.global.site.autopilotDurationOptionsSeconds`.
- Options UI : 1 min, 2 min, 5 min, 10 min, 30 min, 1 h, 2 h, 3 h, 4 h, 5 h, 6 h.
- Chaque plateforme conserve sa propre sélection.
- Le worker filtre les durées par la limite de publication de la plateforme.
- TikTok interroge `creator_info/query` pour récupérer `max_video_post_duration_sec` et applique la plus petite limite.
- Les durées longues restent disponibles pour les plateformes qui les acceptent, sans prétendre qu'une plateforme courte accepte 6 h.
