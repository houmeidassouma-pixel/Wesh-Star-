# Wesh Star IA — Règles Autopilot du modérateur

- L’Autopilot du modérateur reste facultatif.
- Sans règle ajoutée, le modérateur continue à utiliser le Studio normalement.
- L’administrateur doit accorder la permission `autopilot`.
- Pour utiliser automatiquement l’outro/promotion configurée par l’Admin, l’administrateur doit également accorder la permission `promotion`.
- Le modérateur peut alors activer/désactiver l’utilisation de cette promotion pour son propre Autopilot.
- Le texte, le lien et la configuration globale de la promotion restent contrôlés par l’Admin.
- Ces règles sont stockées dans `profiles.autopilot_settings` et sont utilisées par le worker pour les générations automatiques de ce modérateur.
- L’autorisation reste valable jusqu’à révocation par l’administrateur.
