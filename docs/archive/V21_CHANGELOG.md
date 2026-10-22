# Wesh Star IA V21 — durée vidéo, partage et contrôles

Cette version est basée sur le ZIP V20 et conserve les fonctions existantes.

## Modifications

- La durée maximale proposée aux utilisateurs passe de 10 à **10 minutes maximum par vidéo**, dans l’interface, la génération du script IA et la validation serveur.
- Les quotas journaliers/mensuels, crédits achetés, contrôle du coût estimé, file d’attente et limites de sécurité restent actifs. La durée maximale par vidéo n’est pas une promesse de génération illimitée : elle dépend toujours du quota, du plan, des crédits et des réglages administrateur.
- Ajout d’un bouton **Partager** dans le fil de la communauté, avec partage natif ou copie du lien.
- Les liens partagés ciblent une publication précise et respectent les contrôles de visibilité du contenu côté serveur.
- Depuis le studio, un lien permet d’ouvrir la communauté pendant que les générations continuent dans la file d’attente serveur.
- Messages d’erreur plus clairs pour les crédits insuffisants, les essais gratuits terminés et les comptes bloqués.
- Conservation du partage publicitaire **90 % Wesh Star IA / 10 % créateurs** comme valeur par défaut, modifiable dans les paramètres d’administration.

## Fonctions conservées

Fil « Pour toi », tendances et suivis, likes, commentaires, abonnements aux créateurs, cadeaux/pièces, tableau de revenus, éligibilité de monétisation, promotions directes, contrôles de modération, LIVE, gestion des quotas, paiements Stripe, paramètres publicitaires, studio IA et outils de montage.

## Vérifications

- Tests automatisés du dépôt : **50 réussis, 0 échoué**.
- Vérifications TypeScript ciblées : aucune erreur de syntaxe TS/TSX signalée par le compilateur lors de l’analyse des fichiers modifiés.
- La compilation Next.js complète, l’application des migrations sur une base de test, les paiements réels, l’intégration GPU physique et les tests LIVE de bout en bout restent à exécuter dans l’environnement de déploiement, car les dépendances de l’application et les services externes ne sont pas configurés dans cet environnement d’audit.
