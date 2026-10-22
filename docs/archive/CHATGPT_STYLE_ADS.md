# Wesh Star IA — Publicités inspirées des contrôles ChatGPT

Cette version ajoute un module publicitaire administrable, sans mélanger les annonces avec les réponses de l'assistant.

## Admin
- Publicités ON/OFF permanent.
- Diffusion par défaut aux utilisateurs gratuits; les comptes payants restent sans publicité sauf activation explicite par l'Admin.
- Personnalisation ON/OFF par défaut.
- Fréquence maximale quotidienne configurable.
- Création de campagnes: annonceur, titre, description, URL, image, thèmes, CPM/CPC, activation.
- Statistiques agrégées: impressions, clics, masquages et signalements.

## Utilisateur
- Contrôle « Publicités personnalisées ».
- Option « Expérience sans publicité ».
- Menu d'une publicité: « Pourquoi cette publicité ? », « Masquer », « Signaler ».
- Les annonces sont marquées « Sponsorisé », placées dans des emplacements non bloquants (colonne latérale sur grand écran, sous le contenu sur petit écran) et séparées du contenu Wesh Star IA.

## Confidentialité
Les événements publicitaires enregistrent uniquement l'identifiant de campagne, l'utilisateur et le type d'événement côté serveur. Les conversations ne sont jamais transmises à l'annonceur par ce module.

## Paiement publicitaire
Le module mesure les impressions/clics et permet de définir un taux CPM/CPC, mais il ne prétend pas à lui seul recevoir de vrais paiements d'annonceurs. Pour monétiser réellement des campagnes externes, un réseau publicitaire ou un système de facturation annonceur doit être connecté.

La migration SQL ajoute `profiles.ad_preferences` et la table `ad_events`.
