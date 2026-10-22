# Wesh Star IA — corrections préparées

Cette version part du ZIP fourni et ajoute/corrige notamment :

- Autopilot admin : activation/désactivation, 0–20 vidéos/jour, émotion par jour, génération de dialogues avec personnages, voix et apparences persistantes.
- Autopilot : ne crée pas de jobs si aucune plateforme de publication réellement connectée n'est disponible.
- Statut des plateformes : vérification de la connexion réelle en base, pas des seules variables `.env`.
- TikTok/Facebook : état OAuth protégé par nonce cookie.
- YouTube : ajout du flux OAuth complet avec refresh token conservé côté serveur.
- Publication YouTube : utilise le compte OAuth enregistré en base.
- Settings admin : les cases plateformes et les paramètres Autopilot sont réellement sauvegardés.
- Packs de crédits vidéo : sauvegarde correcte des paliers 1 → 30 minutes, avec prix, activation et 60 crédits par minute.
- Génération : plafond technique admin/modérateur compatible avec les vidéos jusqu'à 60 h (sous réserve du moteur vidéo, du stockage et de ffmpeg).
- Rôles : admin et modérateur peuvent générer sans quota produit ; éditeur/lecteur gardent les limites de leur plan. Les droits admin restent réservés à l'admin.
- Langues vidéo : ajout d'un champ « autre langue » afin de pouvoir saisir une langue supplémentaire au-delà de la liste proposée.
- Deux erreurs JSX et une erreur de syntaxe dans les fichiers légaux/dictionnaire ont été corrigées.

## Ce qui reste volontairement à configurer après déploiement

Les secrets et autorisations externes ne peuvent pas être inventés dans un ZIP :
Supabase, Wesh Star IA Direct, GPU-Worker auto-hébergé, domaine, Google OAuth, Meta OAuth, TikTok Developer/API approval, Snapchat/Snap partnership et `AUTOPILOT_USER_ID`.

Important : la logique de « voix par personnage » reste basée sur les descriptions envoyées au modèle vidéo dans cette version. Pour une identité audio strictement identique entre clips, il faut un vrai service TTS/voice-ID intégré au pipeline.


## Promotion automatique
- Admin: URL officielle, CTA et option de CTA parlé.
- Autopilot: ajoute le CTA à la fin du script lorsque activé.
- Publications: ajoute le CTA et l’URL à la légende/description.
- La modification automatique des bios reste dépendante des permissions/API de chaque plateforme.

## Additions — platform autopilot profiles (2026-09-13)
- Added Instagram as a first-class social publishing platform with Meta OAuth connection and Instagram Reels publishing flow.
- Added per-platform automatic publishing profiles without removing the existing autopilot settings.
- Default automatic frequency: 3 videos/day per connected/activated platform.
- Default automatic duration choices: TikTok 1h; Facebook 2–3h; YouTube 1–3h; Snapchat 1–3h; Instagram 1–2h.
- Added trend-driven topic selection to the platform autopilot using the existing trends integration/fallback.
- Added platform-specific autopilot job routing so an automatic video is published to its intended platform instead of forcing every platform to use the same duration profile.
- Added Instagram token/account handling, admin status, settings UI, environment variables, and Supabase schema migration fields.
- Existing monthly subscription plans, promotion/CTA behavior, roles, moderation, and other existing functions were kept intact. Customer credit packs are now 1–60 minutes.
- Platform API approval and platform-specific media-duration limits still apply at deployment time; the new settings express the requested publishing profiles and the worker records publication failures per platform rather than crashing the whole queue.

## Self-hosted storage (added)

Wesh Star IA utilise exclusivement son stockage natif : les vidéos générées, clips de scènes et images importées sont écrits directement sur le serveur Wesh Star IA dans `/app/storage`. Docker monte le volume persistant `wesh-ia-star-storage`. Aucun stockage objet tiers (Supabase Storage, S3, etc.) n’est utilisé. Configurez `SELF_HOSTED_PUBLIC_BASE_URL` et `WESH_STORAGE_SIGNING_SECRET` pour les URLs signées.


Note : les packs représentent un quota de crédits ; chaque génération vidéo utilisateur reste limitée à 10 minutes maximum.
