# Wesh Star IA — Monétisation publicitaire (ajout V2)

Tout se règle dans **Admin → 📣 Publicités & revenus**. Aucun code à modifier.

## Mise en route
1. Clique sur **Ouvrir Google AdSense** (ou Media.net / Ezoic / Adsterra) et crée ton compte.
2. Ajoute ton domaine chez la régie et attends son approbation.
3. Dans l'admin : choisis le réseau, colle ton identifiant `ca-pub-…` et l'identifiant du bloc d'annonce (`data-ad-slot`).
   Pour une autre régie : choisis « Autre régie » et colle son code d'intégration.
4. Coche **Visiteurs non connectés** pour monétiser le trafic public, puis **Publicités ON** et enregistre.
5. `/ads.txt` est généré automatiquement. Pour d'autres régies, colle leurs lignes ads.txt dans le champ prévu.

## Où s'affichent les blocs
Accueil et page Tarifs (un bloc chacun). Les impressions visibles de ces blocs sont comptées par emplacement dans l'admin ; clics et revenus : voir le tableau de bord de la régie.
Les admins/modérateurs ne voient jamais de pub ; les comptes payants non plus, sauf si tu l'actives.

## Désactivation
Décoche **Publicités ON** : le script, les blocs et `/ads.txt` disparaissent immédiatement.

## Fichiers ajoutés / modifiés
Ajoutés : `src/components/NetworkAdBlock.tsx`, `src/components/PublicAd.tsx`, `src/app/ads.txt/route.ts`.
Modifiés : `src/lib/settings.ts`, `src/lib/ads.ts`, `src/components/AdsManager.tsx`,
`src/app/(marketing)/page.tsx`, `src/app/(marketing)/pricing/page.tsx`.
Stripe, studios vidéo, autopilote et base de données : inchangés (pas de migration SQL).

## Rappels
- Google doit approuver le site : sans trafic réel ni contenu suffisant, le compte peut être refusé.
- En Europe, AdSense exige un bandeau de consentement cookies (CMP certifiée Google) avant d'afficher des annonces.
