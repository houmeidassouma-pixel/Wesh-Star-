# 🍌 Wesh Star IA

Plateforme de génération vidéo IA — version finale v3.

**Tarification et durées :**

- **Gratuit : 2 essais de 10 secondes à vie**, puis paiement obligatoire.
- **Abonnements mensuels :** les quotas mensuels sont séparés des crédits vidéo achetés et leurs prix sont modifiables par l'administrateur.
- **Packs de quota vidéo : 1 à 60 minutes cumulées**, avec **6 crédits vidéo = 1 minute** (1 crédit = 10 secondes). Chaque génération individuelle reste limitée à 10 minutes maximum pour les utilisateurs. Chaque pack a son propre prix et peut être ajouté, supprimé, activé/désactivé ou modifié par l'administrateur.
- **Durée d'une vidéo utilisateur : de 10 secondes à 10 minutes maximum, par pas de 10 secondes.**
- **Administrateur/modérateur :** accès génération élevé, soumis uniquement aux plafonds techniques internes.

Après les deux essais gratuits, l'utilisateur doit choisir un quota payant. Les deux essais sont enregistrés sur le compte et ne se réinitialisent pas chaque mois.

Stack : Next.js 14 + PostgreSQL auto-hébergé (Auth/DB maison, voir `src/lib/db`, `src/lib/auth`) + Wesh Star IA Direct + Wesh Star IA GPU Engine + Tailwind. Aucun Supabase.
Langue par défaut : **allemand** (35+ langues via le sélecteur 🌐).

---

## ⚠️ À savoir (honnêteté technique)

1. **Vidéos longues :** aucun modèle public ne génère 1–2 h en un seul passage.
   Le site génère des **clips de ~10 s** avec l'IA puis les **assemble
   automatiquement** (ffmpeg). 1 h ≈ 360 scènes. Durée totale réelle du rendu :
   proportionnelle au nombre de scènes.
2. **Assemblage ffmpeg :** impossible sur Vercel → VPS/Docker avec
   `ENABLE_FFMPEG=true` pour les vidéos **multi-scènes**. Une vidéo d'**une
   seule scène** (ex. 30 s gratuite) fonctionne partout.
3. **Coûts IA :** le moteur vidéo est auto-hébergé. Il n’y a pas de facturation par clip d’un fournisseur vidéo externe ; les coûts sont ceux de vos GPU, stockage et infrastructure.
4. **Stockage sécurisé :** bucket `videos` **privé** — lecture uniquement via
   **URL signées** (`/api/video/[jobId]`, vérification propriétaire/admin).
5. **File d'attente :** verrou atomique Postgres (`FOR UPDATE SKIP LOCKED` +
   `locked_at`) — aucun conflit entre workers/crons simultanés.
6. **Légal (UE) :** abonnements → mentions légales, RGPD, CGV/rétractation, TVA.

---

## Mise en route (résumé — détails dans chaque étape)

```bash
npm install
cp .env.example .env
npm run dev   # http://localhost:3000
```

### 1) Base de données (Wesh Star IA, self-hosted — 2 min)
1. `docker compose -f docker-compose.self-hosted.yml up -d postgres` — démarre
   votre propre PostgreSQL (aucun compte/service externe).
2. `npm run db:migrate` (ou redémarrez simplement le conteneur `wesh-ia-star` :
   il applique `db/schema.sql` automatiquement au démarrage).
3. Dans `.env` : `DATABASE_URL` (déjà pré-rempli pour docker-compose) et
   `SESSION_SECRET` (`openssl rand -hex 32`).
4. Emails (reset mot de passe / invitations modérateur) : renseignez
   `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` — sinon ils sont simplement affichés
   dans les logs en développement.

### 2) Wesh Star IA Direct : 7 € et 10 € / mois (15 min)
1. https://wesh_direct.com → compte (mode Test pour essayer).
2. Créer **2 prix récurrents mensuels** : Basic 7 €, Pro 10 € → copier les
4. **Developers → Webhooks → Add endpoint** :
   `https://VOTRE-DOMAINE/api/wesh_direct/webhook`
   Événements : `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`
   Activation automatique au paiement ; renouvellements, échecs de paiement
   (`past_due`) et annulations gérés.

### 3) Wesh Star IA GPU Engine : génération vidéo réelle

1. Déployer le service `gpu-worker/` sur un serveur NVIDIA avec le NVIDIA Container Toolkit.
2. Définir `WESH_GPU_WORKER_TOKEN` et `WESH_PUBLIC_BASE_URL`.
3. Dans Wesh Star IA, définir `SELF_HOSTED_VIDEO_URL` et `SELF_HOSTED_WORKER_TOKEN`.
4. Le worker télécharge le modèle localement lors du premier démarrage puis effectue l’inférence sur votre GPU.
5. Wesh Star IA assemble les clips avec FFmpeg pour les vidéos longues.

Le projet ne dépend pas d’une API de génération vidéo hébergée.

### 4) Réseaux sociaux et Autopilot
- TikTok et Facebook utilisent OAuth et enregistrent les comptes connectés dans `social_accounts`.
- YouTube dispose maintenant d'un vrai flux OAuth (`/api/auth/youtube/start` → callback) et conserve le refresh token côté serveur.
- Snapchat reste dépendant d'un accès/partenariat Snap et d'un endpoint autorisé.
- L'Autopilot est piloté dans **Admin → Settings** : marche/arrêt, 0–20 vidéos/jour, émotion par jour de la semaine et plateformes activées.
- Le cron Autopilot s'exécute toutes les 30 minutes et crée au maximum une vidéo par passage jusqu'à atteindre la cible quotidienne.
- Les comptes sociaux doivent être réellement connectés : une simple case « activé » ne suffit pas.

### 7) Analyse des performances et boucle d’optimisation sociale
- `social_metrics` conserve les snapshots de vues, likes, commentaires, partages, sauvegardes et temps de visionnage.
- `src/lib/social-intelligence.ts` calcule un score et extrait les caractéristiques des publications performantes (format, hook, durée).
- Le Dashboard Admin affiche une synthèse par plateforme.
- L’Autopilot consulte les meilleures métriques récentes avant de préparer une nouvelle génération et adapte le format/hook/durée sans copier une vidéo existante.
- Les métriques doivent être alimentées par une API officielle approuvée, un import ou une intégration de plateforme : le module ne fabrique pas de statistiques.
- Le tracking prévoit TikTok, Facebook, Instagram, Snapchat, YouTube, X et LinkedIn. Les adaptateurs de publication réellement présents dans cette archive restent ceux documentés dans la section Réseaux sociaux.

### 5) Worker de rendu
- **Vercel** : `vercel.json` inclus → cron chaque minute ; définir la variable
  d'environnement `CRON_SECRET` (même valeur que `.env`).
- **Local/VPS** : cron externe chaque minute :
  ```bash
  curl -H "Authorization: Bearer VOTRE_CRON_SECRET" http://localhost:3000/api/worker/process
  ```

### 6) Votre compte administrateur (gratuit, illimité)
Après inscription sur le site, exécuter **une fois** dans le SQL Editor :
```sql
update public.profiles set role = 'admin' where email = 'vous@exemple.com';
```
Effet : aucun paiement, quota illimité (affiché « ∞ »), durée max illimitée,
accès au panneau admin : utilisateurs & rôles, abonnements (activer/désactiver),
tarifs/limites/crédits (packs vidéo 1–60 min, durées max, quotas mensuels), toutes les
générations (relancer/supprimer/voir), paramètres du site (nom, maintenance,
langue par défaut, durée d'un clip).

---


---

## 🛡️ Sécurité & protections production (v4)

* **Quota atomique** : `consume_generation_quota()` (verrou ligne utilisateur +
  incrément mensuel/journalier dans une transaction) — aucune requête
  simultanée ne peut dépasser la limite. Comptabilisé AVANT le lancement IA.
* **Remboursement** : un job qui échoue définitivement rend son quota
  (`refund_generation_quota`, une seule fois via `quota_refunded`).
* **Coûts GPU auto-hébergés** : plafond de scènes par job (plan + global), **coût
  estimé vérifié AVANT lancement** (`COST_LIMIT`), limite journalière par
  plan, coupe-circuit global journalier (plateforme).
* **Admin protégé** : toujours gratuit/sans quota réel, mais plafonds élevés
  anti-accident (60 h/vidéo, 25 000 scènes, coût technique très élevé, 1 milliard de générations théoriques).
* **Workers** : verrou atomique `FOR UPDATE SKIP LOCKED` (aucun double
  traitement), tentatives de job plafonnées (5), tentatives par scène
  plafonnées (3), timeout de scène (30 min), aucune boucle infinie.
* **Idempotence** : clé côté client + index unique + garde anti-doublon
  (même prompt actif < 90 s) — aucune génération facturée en double.
* **Concurrence** : max 3 jobs actifs par utilisateur.
* **Paiements** : le statut actif n'est jamais accordé par le frontend —
  uniquement par webhook Wesh Star IA Direct vérifié (signature + mapping prix côté
  serveur). Renouvellements, `past_due` et annulations gérés.
* **Rate limiting** : génération (20/min), checkout (10/min), listes (120/min),
  vidéos (240/min), actions (30/min), admin (60/min).
* **Secrets** : GPU worker/Wesh Star IA Direct/base de données uniquement côté
  serveur ; `.env` dans `.gitignore` ; aucune clé dans `NEXT_PUBLIC_*`.
* **Autorisations** : chaque route vérifie propriétaire ou admin (voir
  `src/lib/access.ts`) ; vidéos servies par URL signée après contrôle
  d'appartenance.

Toutes les limites (plan, quota, prix, rôle) sont calculées **côté serveur**
(`src/lib/access.ts`) — le frontend n'est jamais une source de vérité.

## Checklist finale — clés et configurations à fournir

| Élément | Où l'obtenir | Variable `.env` |
|---|---|---|
| Base de données | votre serveur (docker-compose l'inclut) | `DATABASE_URL` |
| Secret de session | à générer (`openssl rand -hex 32`) | `SESSION_SECRET` |
| Email SMTP (reset/invitations) | votre fournisseur SMTP ou serveur mail | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Worker vidéo | votre serveur GPU | `SELF_HOSTED_VIDEO_URL` + `SELF_HOSTED_WORKER_TOKEN` |
| Modèle vidéo | `gpu-worker/` (Wan 2.1 T2V 1.3B) | `WESH_VIDEO_MODEL` |
| Secret cron (libre) | À inventer (long) | `CRON_SECRET` |
| URL du site | Votre domaine | `NEXT_PUBLIC_SITE_URL` |
| ffmpeg (vidéos longues) | VPS/Docker uniquement | `ENABLE_FFMPEG=true` + binaire ffmpeg |

Une fois tout renseigné : `npm install && npm run dev` → le site est prêt à tester
(tableau de bord utilisateur + tableau de bord admin).

## Tests locaux recommandés
```bash
npm run build     # vérifie tout le projet (types, imports, pages)
npm run dev
# puis: inscription → génération 30 s gratuite → (optionnel) wesh_direct listen
# → abonnement test → génération longue → admin SQL → panneau admin
```

### Moderatoren-Rolle (neu)

Dritte Rolle `moderator` — eigener Bereich `/moderator`: Inhalte aller Nutzer
prüfen, Videos entfernen (jede Entfernung landet im Moderations-Protokoll),
Protokoll einsehen. Kein Zugriff auf Tarife, Zahlungen, Rollen oder
Einstellungen (Admin-only). Moderatoren generieren/testen kostenlos.
Ernennen (nach Registrierung des Kontos):
```sql
update public.profiles set role = 'moderator' where email = 'name@email.de';
```

### Globale Sprachauswahl (alle Weltsprachen)

35 Sprachen haben Wörterbücher (davon ~15 vollständig). Für **jede weitere
Sprache der Welt** steht `src/lib/translate.ts` (`autoTranslateUi`) bereit:
über die im Projekt gebündelten UI-Dictionaries; kein externer Übersetzungsdienst ist erforderlich
wird die komplette UI serverseitig maschinell übersetzt — jede vom Browser
gemeldete Sprache wird automatisch bedient, Fallback Englisch. Der Key liegt
ausschließlich auf dem Server.

## Cahier de finalisation / développeur

Voir `FINALISATION_NEXT_DEPLOYMENT.md` pour la procédure de mise en production, les tests d'acceptation et le point Twitch/FFmpeg à terminer.

## Self-hosted storage (added)

Wesh Star IA utilise exclusivement son stockage natif : les vidéos générées, clips de scènes et images importées sont écrits directement sur le serveur Wesh Star IA dans `/app/storage`. Docker monte le volume persistant `wesh-ia-star-storage`. Aucun stockage objet tiers (Supabase Storage, S3, etc.) n’est utilisé. Configurez `SELF_HOSTED_PUBLIC_BASE_URL` et `WESH_STORAGE_SIGNING_SECRET` pour les URLs signées.

## Local independence
The core Wesh Star IA runtime is local-first: PostgreSQL, authentication, filesystem storage, Ollama, FFmpeg and the GPU video worker run on infrastructure controlled by the owner. No hosted AI/video API is required. Automatic publishing to third-party social networks necessarily uses those networks' official APIs/OAuth.

## Wesh Star IA V5
See `V5_FEATURES.md` for the complete V5 product specification. The `/v5` page exposes the V5 feature center and payment-method readiness without pretending that unconfigured payment providers are live.


Note: les packs de crédits peuvent aller jusqu’à 60 minutes, mais une génération Studio utilisateur est limitée à 10 minutes maximum.

## Monthly quota billing cycle
Dynamic monthly plans are measured in minutes per Stripe billing cycle. A successful recurring `invoice.paid` event starts a fresh `quota_cycle_key`; unused minutes from the previous cycle do not roll over. Each normal-user Studio generation is capped at 10 minutes (600 seconds). Admins can create, price, enable, disable, or remove 1–60 minute monthly plans and preview them in the Admin panel.

## Autopilot
Autopilot is multi-platform, not TikTok-only: TikTok, Facebook, YouTube, Snapchat, Instagram, Twitch, X/Twitter and LinkedIn. The central duration list is 1m, 2m, 5m, 10m, 30m, 1h, 2h, 3h, 4h, 5h and 6h; each platform filters it by its own publication ceiling, and TikTok may lower it further from `creator_info/query`.

### Private messaging and calls (V11.1 groundwork)

The `/messages` page and private-message API are included. The call-session/signaling APIs are only the server-side foundation for WebRTC; they do not mean audio/video calling is production-ready. Keep `COMMUNICATIONS_ENABLED=false` until a WebRTC browser client, TURN server, security/abuse protections and real-device tests are completed. See `COMMUNICATIONS_SELF_HOSTED.md`.


### 8) Partage de modèles et mode économie de données
- Après une génération réussie, **Partager le modèle** ouvre le partage natif du téléphone ou copie un lien vers `/use-model`. Le lien transporte le prompt partagé afin que le destinataire puisse le charger dans le Studio après connexion. Le créateur doit éviter d’y inclure des informations privées.
- Le bouton **TikTok** ouvre la page officielle de publication TikTok dans un nouvel onglet. Télécharge d’abord la vidéo depuis Wesh Star IA, puis sélectionne le fichier dans TikTok. La publication directe par API dépend de l’approbation TikTok, des scopes et des autorisations de l’utilisateur ; le bouton ne prétend pas publier sans cette autorisation.
- Dans **Paramètres**, le mode économie de données ralentit l’actualisation de la file de génération et met en pause les vérifications lorsque l’onglet est masqué. Les vidéos, transferts et calculs IA consomment toujours les ressources nécessaires.
- Les liens de modèles ne copient pas la vidéo elle-même : ils partagent le prompt. Les destinataires doivent être connectés pour accéder au Studio.

## Wesh Star Shop (V35 MVP)

La boutique internationale est accessible dans le menu connecté via **Wesh Star Shop**. Elle permet de publier des annonces, de rechercher des produits et d'envoyer/recevoir des demandes d'achat avec pays d'expédition, devises EUR/XOF/USD/GBP et réservation de stock à l'acceptation.

Avant le premier démarrage avec cette version, applique la migration SQL via `npm run db:migrate`. La boutique V35 est actuellement un **MVP de catalogue et de demandes** : elle ne prélève aucun paiement, ne verse pas de fonds aux vendeurs et ne crée pas d'étiquettes de transport. Ne la présente pas comme un checkout international opérationnel avant d'avoir intégré et testé un prestataire de paiement marketplace, les remboursements et la logistique.

Voir `WESH_STAR_IA_V35_CHANGELOG_FR.md` pour les ajouts et limites de lancement.

## Documents V36 (français)
- `WESH_STAR_IA_V36_CHANGELOG_FR.md` : ajouts, limites et mise à niveau.
- `GUIDE_DEBUTANT_DESIGN_ET_LANCEMENT_FR.md` : workflow de design sans expérience, lancement local et contrôles avant production.
