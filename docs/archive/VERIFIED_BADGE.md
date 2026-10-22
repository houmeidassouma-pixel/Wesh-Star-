# Badge bleu certifié (V6 Community)

- Seul l'Admin attribue ou retire le badge : Admin > Utilisateurs > bouton « ☑️ Certifier » / « 🔵 Retirer ».
- Les modérateurs ne peuvent pas (API refuse avec 403). Chaque action est écrite dans le journal de modération.
- Le badge s'affiche à côté du nom dans le Feed (vidéos et commentaires) et dans la liste admin.
- Base de données : colonne `profiles.verified_badge` (défaut `false`), via `db/schema.sql` et `db/migrations/20261008_verified_badge.sql`. Lancer `npm run db:migrate`.

## Corrections de l'audit
- L'e-mail complet des créateurs n'est plus envoyé au navigateur (seul le pseudo est exposé).
- Les vidéos des comptes désactivés disparaissent du Feed.
- Les commentaires sont maintenant lisibles (clic sur 💬).
- Like : respecte la visibilité (abonnés / privé).
- Suivre / Signaler : 404 propre si la cible n'existe pas (avant : erreur 500).
- user-action : 401 propre si non connecté (avant : plantage).

## Pub dans le Feed
Un bloc « Sponsorisé » (même réglages et mêmes règles que la barre latérale : Admin > Publicités) apparaît après la 5e, 10e et 15e vidéo du Feed. Il ne bloque jamais la lecture. Pas de pub si « Publicités ON » est désactivé, ni pour l'Admin/modérateurs.

## Mobile Money manuel (Bénin)
Dans `.env` : `WESH_MOBILE_MONEY_NAME`, `WESH_MOBILE_MONEY_MTN`, `WESH_MOBILE_MONEY_MOOV`. Au clic sur un pack de jetons, le client voit ta référence, le montant en € et en FCFA, et tes numéros MTN/Moov. Il paie, puis tu confirmes dans Admin > Paiements et les jetons sont crédités.
Les abonnements mensuels restent sur Stripe (carte). Correction au passage : avant, le client ne voyait ni IBAN ni instructions après sa demande.
