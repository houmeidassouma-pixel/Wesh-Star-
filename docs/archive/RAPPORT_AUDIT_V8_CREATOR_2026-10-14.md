# Wesh Star IA — Rapport d'audit V8 « Creator / LIVE / Coffres »
Date : 14 octobre 2026. Base : `Wesh-Star-IA-V8-CreatorStudio-Audit-Handoff.zip` (le code est identique au Draft, plus un document d'audit). Rien n'a été reconstruit : les fonctions existantes sont conservées, les nouveautés sont ajoutées par-dessus.

## 0. Ce qui a VRAIMENT été vérifié (et ce qui ne l'a pas été)
| Vérification | Résultat |
|---|---|
| Tests unitaires (`npm test`, Node 22) | **15/15 réussis** (7 existants + 8 nouveaux : partage 60/40, coffres, conservation des jetons, config, propositions IA, commande FFmpeg) |
| Montage automatique avec **vrai FFmpeg** | **OK** : 3 clips (dont 1 sans audio, 3 formats différents) → 1 vidéo 720×1280 de 9 s avec audio et musique bouclée ; **les 11 effets** testés un par un ; cas 1 seul clip OK |
| Dépendances | Toutes les librairies importées sont déclarées dans `package.json` (next, react, pg, nodemailer). **Pas de `package-lock.json`** (à générer avec `npm install`). `npm audit` impossible (pas de réseau). |
| Syntaxe TypeScript (`tsc`) | 2 vrais défauts trouvés et corrigés (§6). **Build complet NON exécuté** : pas de réseau, donc pas de `npm install`, pas de `next build`. |
| Base de données | **Aucun PostgreSQL disponible ici** : les 2 nouvelles migrations et toutes les requêtes SQL sont relues mais **jamais exécutées**. |
| Docker Compose | Les 2 fichiers YAML sont valides (8 services). Non lancés. |
| GPU / TTS / génération IA réelle | **Non testé** (matériel NVIDIA requis). |
| Navigateur (caméra, UI) | **Non testé** : les composants React n'ont pas été compilés ni ouverts. |

Légende : ✅ terminé et vérifié · 🟢 terminé dans le code, jamais exécuté · 🟡 partiel · ❌ absent · 🔧 défectueux, corrigé.

## 1. Studio vidéo
| Fonction | État | Détail |
|---|---|---|
| Génération vidéo IA | 🟡 | Code présent (file d'attente, worker GPU Wan). **Jamais exécuté ici.** |
| Import de vidéos personnelles | ✅/🟢 | Avant : simple aperçu. Maintenant : **montage automatique serveur** (FFmpeg testé) = vrai export. |
| Caméra intégrée | 🟢 | Capture navigateur + effets + musique. Non testé sur un vrai navigateur. |
| Ajouter une musique | 🟢 caméra et montage auto · ❌ sur un clip généré par IA | Pour mettre de la musique sur un clip IA : le télécharger puis l'importer dans le montage automatique. |
| Effets gratuits / payants | 🟢 | 11 effets : 4 gratuits (Naturel, N&B, Sépia, Lumineux), 7 payants (1 jeton par défaut, **prix à toi de fixer**). Aperçu et export utilisent le même effet (approximation visuelle). Achat définitif en jetons, débit atomique, pas de double débit. **Limite** : sur l'enregistrement **caméra**, le verrou d'un effet payant n'existe que dans l'interface (contournable dans le navigateur). Le verrou est strict côté serveur seulement pour le montage automatique. |
| Montage automatique | ✅ (moteur) / 🟡 (fonction complète) | Coupe, recadrage 9:16, assemblage, effet, musique. **Absent** : transitions, sous-titres, synchro au rythme, détection des meilleurs passages, formats carré/paysage, aperçu avant export. Traitement en arrière-plan (2 montages en parallèle max, 1 par utilisateur, délai max 10 min). |
| Montage manuel | ❌ | Pas de timeline (couper/déplacer précisément). Seul existe l'éditeur « objet derrière le sujet » (GPU). |
| Export | 🟢 | WebM (caméra), MP4 (montage). |
| Publication | 🟢 | `Enregistrer / publier` (nouveau `/api/creator/publish-clip`) : bibliothèque privée ou Wesh Star Feed. Avant, le texte promettait un import en bibliothèque qui **n'existait pas**. |

## 2. Musiques et sons
| Fonction | État | Détail |
|---|---|---|
| Importer une musique | 🟢 | Contrôle réel du fichier (ffprobe), 25 Mo max, **case de confirmation des droits obligatoire** pour publier. |
| Publier avec un son + « autoriser la réutilisation » | 🟢 | Le créateur choisit : réutilisable ou privé. |
| Son en favori | 🟢 | Persisté en base par utilisateur (pas du localStorage). Bouton ☆/★ sous la vidéo. |
| « Utiliser ce son » | 🟢 | Ouvre le studio avec la piste chargée ; le créateur du son est crédité sous la vidéo ; compteur d'usages. |
| Page « Sons favoris » dédiée | 🟡 | La liste est dans le studio (menu « Mes sons favoris »), pas de page séparée. |
| Modération des sons | 🟢 | Masquer / réactiver depuis l'admin (audité). |
| Détection automatique des droits d'auteur | ❌ | **Risque juridique réel** : rien n'empêche un utilisateur de mentir sur ses droits. Prévoir CGU, procédure de retrait, et idéalement une bibliothèque de musiques sous licence. |

## 3. Publicités
| Fonction | État | Détail |
|---|---|---|
| Interrupteur ON/OFF dans l'admin | ✅ (code relu) | `AdsManager` : « Publicités ON », réseau AdSense/autre, ID éditeur, code personnalisé, ads.txt, plafond par jour, audiences. |
| Affichage | 🟢 | `AdUnit`, `AppAdRail`, `NetworkAdBlock`, 1 pub toutes les 5 vidéos du feed. |
| Suivi | 🟡 | Impressions/clics/masquages comptés en base. **Les revenus réels AdSense ne sont pas visibles dans l'app** (ils sont dans ton compte AdSense). Campagnes internes cpm/cpc : estimation seulement. |
| Revenus effectifs | ❌ dépend d'un tiers | Il faut un compte AdSense **approuvé** sur ton vrai domaine. Pas d'annonces vidéo type TikTok. |

## 4. Jetons Wesh et diamants
| Fonction | État | Détail |
|---|---|---|
| Jetons IA (1 jeton = 10 s, 6 jetons = 1 min) | 🟢 | Solde, packs, crédit admin, débit atomique existants. |
| **Diamants** | ❌ **absents** | Aucun solde, aucun achat, aucun code. Le document de plan les décrit mais ils n'existent pas. Selon ta consigne, **tout le nouveau (cadeaux, effets, coffres) utilise les jetons Wesh**. Si tu veux une 2ᵉ monnaie « diamants », c'est à développer. |
| Tarifs configurables | 🟢 | Cadeaux, effets, coffres (admin). Packs/abonnements : déjà existants. |
| Point d'attention | — | Les cadeaux/effets/coffres dépensent les **jetons achetés** (`hour_credits`), pas les minutes incluses dans l'abonnement mensuel. |

## 5. Cadeaux, coffres, LIVE
| Fonction | État | Détail |
|---|---|---|
| Cadeaux sur les vidéos du feed | 🟢 | Confirmation avant débit, débit atomique (1 requête SQL conditionnelle), pas de cadeau à soi-même, journal immuable. |
| Salons LIVE (créer, rejoindre, présence, fin) | 🟢 | **Désactivé par défaut** (admin → « LIVE activé »). Un seul LIVE actif par hôte (index unique en base). |
| **Flux vidéo/audio en direct** | ❌ **absent** | Aucun serveur de streaming (WebRTC/RTMP). Ce qui existe : salon, présence, cadeaux, coffres. |
| Cadeaux pendant un LIVE (jetons) | 🟢 | Seulement si présent dans le salon ; destinataire = l'hôte ; même partage 60/40. |
| **Coffres** | 🟢 | Le déposant choisit le total et le nombre de personnes (ex. 120). **Règle publique, sans hasard** : parts égales = total ÷ personnes (arrondi bas), premiers arrivés premiers servis, 1 part par personne. Seul « part × personnes » est débité ; les parts non prises sont **rendues au déposant** à la clôture, à la fin du LIVE ou à l'expiration. |
| Anti-abus / double dépense | 🟢 (relu, non exécuté) | Verrou de ligne sur le coffre ; clé primaire (coffre, utilisateur) = impossible de réclamer 2 fois ; débit conditionnel `solde >= montant` ; remboursement idempotent (coffre fermé = rien rendu) ; présence minimale ; ancienneté de compte minimale ; limites de participants/montant/coffres ouverts ; limitation de débit ; contraintes SQL (`réservé = part × personnes`, `pris ≤ max`). Les jetons reçus sont dépensables, **pas retirables**. |
| Risque connu | — | Un utilisateur peut créer plusieurs comptes pour se prendre ses propres parts : sans gain net (ses jetons tournent entre ses comptes), mais l'ancienneté/présence minimales limitent le spam. Pas de vérification d'identité. |
| Coffres à tirage aléatoire | ❌ volontairement | Le plan recommande une revue juridique (jeux d'argent) avant. |

## 6. Cadeaux personnalisés
| Fonction | État | Détail |
|---|---|---|
| Créer mes propres cadeaux (admin) | 🟢 | Nom, emoji, prix en jetons, activation. |
| Propositions IA à valider | 🟢 | Ollama local propose nom/emoji/prix ; **tout arrive en « en attente »**, rien n'est visible tant que tu n'approuves pas (tu peux changer le prix). Sortie du modèle assainie (testé). Cron quotidien ajouté au `scheduler` (actif seulement si « Propositions IA » est coché). |
| Illustrations / animations de cadeaux | ❌ | Un cadeau = nom + emoji + prix. |
| Effets proposés par l'IA | ❌ volontairement | La liste d'effets est fixe dans le code (filtres FFmpeg non injectables). L'admin règle prix/activation. |

## 7. Partage des revenus
| Fonction | État | Détail |
|---|---|---|
| Pourcentages modifiables dans l'admin | 🟢 | Créateur % saisi, Plateforme % = 100 − créateur (toujours 100 %). Défaut **60 / 40**. Refus si la somme n'est pas 100. |
| Calcul fiable côté serveur | ✅ (logique testée) | Jetons entiers, créateur arrondi vers le bas, le reste à la plateforme : `créateur + plateforme = total` vérifié sur 2 500 cas. Le % appliqué est **figé dans chaque transaction**. Changements audités. |
| Limites | 🟡 | Le calcul est sur les jetons **bruts** (pas de net après frais/taxes/remboursements). Les gains créateurs sont un solde séparé **non convertible ni retirable** : aucun prestataire de paiement n'est branché. |

## 8. Administration
| Fonction | État | Détail |
|---|---|---|
| Rôles et permissions | ✅ (relu) | admin / moderator / editor / viewer + permissions granulaires. Toutes les routes inspectées vérifient la session ; routes worker protégées par `CRON_SECRET`. |
| Abonnements Stripe | 🟡 | Signature des webhooks vérifiée. **Pas** de table d'événements traités, **pas** de flux de remboursement. |
| Quotas | 🟢 | Fonctions SQL atomiques existantes (non exécutées ici). |
| Modération | 🟢 | Signalements, masquage, blocage, avertissements, badge bleu ; sons ajoutés. |
| Gestion des utilisateurs | 🟢 | Rôle, blocage, abonnement, crédits, portefeuilles FCFA. |

## 9. Défauts trouvés et corrigés
1. 🔧 `CommunityFeed.tsx` : `await` dans une fonction non asynchrone → **erreur de syntaxe qui aurait fait échouer `next build`**. Corrigé.
2. 🔧 `api/auth/facebook/callback` : variable `site` utilisée avant sa déclaration (erreur au retour Facebook si l'état OAuth est invalide). Corrigé.
3. 🔧 `api/storage` servait tout fichier inconnu en `video/mp4` : `.webm`, `.mov`, `.mp3`… sont maintenant servis avec le bon type.
4. 🔧 Studio : les effets « Premium » n'étaient débités nulle part (simple texte) → maintenant réels. Le message « importe dans ta bibliothèque » n'avait aucune route → créée.
5. À surveiller au premier `next build` : des erreurs de typage sur les en-têtes `Authorization` (`product-ad`, `video-edit/*`) apparaissent avec ma version de `tsc`, sans les vrais paquets de types ; à confirmer ou corriger chez toi.

## 10. Ce qui reste à développer
1. Flux LIVE réel (serveur média WebRTC, ex. LiveKit/Janus/MediaMTX) + chat.
2. Diamants (si tu veux une 2ᵉ monnaie) ; page « Sons favoris » ; montage manuel (timeline) ; transitions/sous-titres ; musique sur clip IA.
3. Retrait d'argent des gains créateurs : prestataire de paiement, KYC, seuils, antifraude, conformité.
4. Webhook Stripe : table d'événements + remboursements.
5. Tests de bout en bout (parcours complet navigateur + vraie base), test de charge des coffres (120+ réclamations simultanées).
6. Bibliothèque de musiques sous licence ; procédure de retrait des contenus (droits d'auteur).
7. Modération des vidéos importées (aujourd'hui seulement par signalement).

## 11. Services externes et coûts (à confirmer chez chaque fournisseur)
- **Serveur avec GPU NVIDIA** (génération vidéo) : le plus gros poste, location mensuelle variable ; sans GPU, la génération IA ne tourne pas. Montage FFmpeg, base et site tournent sur CPU.
- **Nom de domaine + HTTPS** (annuel, faible).
- **SMTP** pour les e-mails (réinitialisation de mot de passe, invitations modérateurs).
- **Stripe** : frais par transaction ; **mobile money / Afrique** : prestataire à choisir (non intégré).
- **Google AdSense** : gratuit, mais approbation obligatoire, partage de revenus avec Google.
- **Juridique** : CGU/mentions, TVA, règles des monnaies virtuelles et cadeaux, droits musicaux, protection des mineurs. Si une appli native est publiée sur les stores : commissions et règles des achats in-app.

## 12. Étapes de mise en ligne
1. Serveur Linux, Docker + Compose, pilote NVIDIA + nvidia-container-toolkit.
2. Domaine + HTTPS (reverse proxy) ; `SELF_HOSTED_PUBLIC_BASE_URL` et `NEXT_PUBLIC_SITE_URL` = ton URL publique.
3. Remplir `.env` (secrets longs : `CRON_SECRET`, `WESH_STORAGE_SIGNING_SECRET`, `SELF_HOSTED_WORKER_TOKEN`, base, SMTP, clés Stripe).
4. `npm install` (génère le lock), `npm test`, `npm run build` : **corriger toute erreur du build**.
5. `docker compose up -d --build` puis `npm run db:migrate` (applique aussi `20261015_…` et `20261016_…`).
6. Créer le compte admin ; dans l'admin : activer la communauté, régler 60/40, prix des cadeaux/effets, « LIVE » seulement quand le flux vidéo existe.
7. Webhook Stripe vers `/api/stripe/webhook`.
8. Sauvegardes automatiques du volume PostgreSQL et du stockage vidéo.
9. Test manuel : inscription → achat de jetons → enregistrer un clip avec musique → publier → autre compte : favori du son, utiliser le son, cadeau → coffre à 2 comptes → montage auto avec 3 vidéos → effet payant.
10. Demander AdSense quand le site est en ligne avec du contenu.

## Annexe : fichiers ajoutés / modifiés
Nouveaux : `db/migrations/20261015_*.sql`, `20261016_*.sql` ; `src/lib/{creator-economy,creator-effects,creator-db,auto-montage,media-probe,live-db,gift-proposals,creator-messages}.ts` ; routes `api/creator/*`, `api/sounds/*`, `api/gifts/send`, `api/effects/unlock`, `api/live/*`, `api/admin/creator-economy`, `api/worker/gift-proposals` ; composants `AutoMontage`, `LiveRoom`, `CreatorEconomyPanel` ; page `/live` ; `tests/creator-economy.test.ts`.
Modifiés : `CreatorStudio.tsx`, `CommunityFeed.tsx`, `AppShell.tsx`, pages `generate` et `admin`, `lib/community.ts`, route `storage`, callback Facebook, `docker-compose*.yml` (cron des propositions).


## 10. Mise à jour de travail dans l'archive de suivi
- Le sélecteur de durée de `GenerateStudio.tsx` propose maintenant des incréments de 10 secondes (jusqu'à la limite du forfait/quota et 30 minutes). Le quota reste exprimé en secondes.
- `DECISION_DUREE_GENERATION_10_SECONDES.md` explique le choix produit et prévient de ne pas modifier silencieusement le tarif de 6 jetons IA/minute.
- `TRAVAUX_RESTANTS_AVANT_PRODUCTION.md` énumère explicitement les blocs encore absents ou dépendants d'un prestataire, et les tests de mise en production requis.
- Cette mise à jour ne prétend pas ajouter un serveur LIVE, une timeline manuelle, des diamants ou un prestataire de retrait : ces éléments nécessitent une implémentation et des tests dédiés.
