# Publicités pour les abonnés — non bloquantes

Configuration validée pour Wesh Star IA :

- Les utilisateurs payants peuvent voir des publicités lorsque `site.ads.enabled=true` et `site.ads.showToPaidUsers=true`.
- Les publicités sont affichées dans des emplacements séparés (rail/Bloc publicitaire), sans interstitiel obligatoire.
- Une publicité ne bloque jamais le Studio, la génération, les boutons, les pages ou les abonnements.
- Une publicité ne consomme aucun jeton et n'interrompt pas une génération vidéo.
- Le plafond d'affichage par utilisateur reste configurable (`frequencyCapPerDay`).
- L'utilisateur peut masquer/signaler une campagne et gérer ses préférences publicitaires.
- Les administrateurs et modérateurs restent exclus des publicités réseau/campagnes dans l'espace de travail.
- Ne pas transformer cette logique en popup, paywall publicitaire ou publicité avant génération.

Réglage par défaut : `showToPaidUsers=true`.
