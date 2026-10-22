# Wesh Star IA — Gestion complète des quotas vidéo et crédits

## Règle centrale
- 1 heure = 3 600 secondes.
- Chaque génération réserve sa durée vidéo exacte.
- Le quota mensuel et le quota quotidien sont distincts.
- Une génération échouée est remboursée automatiquement.
- Si le quota inclus est épuisé, les crédits d’heures achetés peuvent prendre le relais.
- Les crédits achetés sont stockés dans `profiles.hour_credits_seconds`.

## Gestion administrateur
- Prix et quotas de chaque forfait modifiables depuis l’administration.
- Limite mensuelle et quotidienne en secondes.
- Limite du nombre de générations par mois/jour.
- Durée maximale d'une vidéo.
- Limite de scènes et de coût estimé par génération.
- Activation/désactivation des forfaits horaires supplémentaires.
- Ajout ou définition manuelle des crédits supplémentaires d'un utilisateur.
- Réinitialisation du compteur mensuel ou quotidien d'un utilisateur.
- Activation/désactivation d'un abonnement et changement de forfait.

## Sécurité
La consommation est atomique côté PostgreSQL : deux requêtes concurrentes ne peuvent pas dépasser le quota. Les échecs, suppressions avant réussite et erreurs de file remboursent la durée réservée une seule fois.

## Indépendance
Le système de quota n'a besoin ni de Stripe, ni de Supabase, ni d'un fournisseur vidéo externe : il utilise PostgreSQL et le serveur Wesh Star IA.
