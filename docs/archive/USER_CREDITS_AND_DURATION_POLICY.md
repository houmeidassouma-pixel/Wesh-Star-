# User credits and duration policy

- Video quotas are stored internally in seconds.
- 1 minute = 60 seconds; 1 hour = 3,600 seconds.
- User-facing AI tokens: 1 token = 10 seconds. Internal quota and credit storage remains measured in seconds for backward compatibility.
- A 1-hour subscription therefore corresponds to 3,600 available video credits.
- The Studio only exposes durations up to the user’s actual plan maximum; the server remains authoritative.
- The Studio duration selector offers 10, 20, 30, 40, 50 seconds, then 1–10 minutes in whole-minute steps. Token-equivalent cost is `ceil(seconds / 10)`; the server still enforces the 600-second maximum for normal users.
- Purchased credits are additive to the remaining monthly plan quota.


## Token IA — règle actuelle (V25)
- 1 token IA = 10 secondes de génération.
- Le solde technique reste stocké en secondes pour compatibilité avec les quotas existants; l'interface convertit en tokens par `secondes / 10`.
- Exemples: 10 s = 1 token; 30 s = 3 tokens; 1 min = 6 tokens; 5 min = 30 tokens; 10 min = 60 tokens.
- Les quotas inclus dans l'abonnement sont consommés en priorité; les crédits achetés en réserve sont débités quand le quota inclus est épuisé. Les échecs doivent déclencher le remboursement du quota utilisé.
- Le sélecteur vidéo propose 10, 20, 30, 40, 50 secondes puis 1 à 10 minutes par pas d'une minute.

## Sons communautaires (V25)
- La bibliothèque liste les sons actifs du compte et les sons publics explicitement autorisés à la réutilisation.
- Le studio peut préécouter et sélectionner un son avant la génération; le worker mélange la musique au rendu final à volume réduit et conserve l'audio original.
- Sur une vidéo publiée par le compte, l'action « Ajouter un son » remixe le fichier vidéo côté serveur et met à jour le fichier lié à la publication. FFmpeg doit être disponible et activé.
