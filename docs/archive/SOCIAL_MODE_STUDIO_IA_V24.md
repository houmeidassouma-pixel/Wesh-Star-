# Wesh Star IA V24 — mode réseau social + Studio IA

## Nouveau réglage administrateur
- `site.socialNetworkEnabled` active ou désactive le mode réseau social.
- Par défaut, le mode est désactivé pour préserver le parcours Studio IA.

## Comportement attendu
- Mode réseau social activé : après connexion, la page d'accueil redirige vers le fil Wesh Star Feed. Sur mobile, une barre fixe à six entrées affiche Accueil, Découvrir, Créer (+), Studio IA, Messages et Profil. Studio IA ouvre `/generate`.
- Mode réseau social désactivé : après connexion, la page d'accueil redirige vers `/generate`, sans la barre de navigation sociale mobile.
- Les fonctions de génération, abonnements, crédits, administration et outils existants sont conservés.
- Les endpoints communautaires acceptent le mode social activé comme autorisation d'accès au feed.

## Vérification
- `npm test`: 51 tests existants réussis.
- Le build Next.js/TypeScript complet et les tests dans un environnement connecté à la base de données n'ont pas été exécutés ici.
- Les fonctions de streaming LIVE et les connexions API des réseaux sociaux restent soumises à leur propre intégration/configuration.
