# Wesh Star IA — Studio créateur et économie de cadeaux (V1)

## Inclus dans cette version de travail
- Ajout du composant `CreatorStudio` à la page de génération.
- Capture vidéo par caméra/microphone dans le navigateur, filtres appliqués à la capture, import local d'un fichier audio, réglage de volume, export WebM et téléchargement.
- Prévisualisation d'une vidéo importée et filtres d'aperçu.
- Les modules existants de génération IA et d'édition vidéo restent séparés et conservés.

## Limites à ne pas confondre avec une fonctionnalité achevée
- L'import d'une vidéo est une prévisualisation : le rendu exporté d'une vidéo importée avec musique, coupes, texte et transitions nécessite un moteur de rendu dédié (par exemple FFmpeg côté serveur/local).
- Le composant caméra ne publie pas automatiquement les vidéos dans la communauté et ne les enregistre pas automatiquement sur le serveur.
- Les prix premium affichés dans le prototype ne débitent pas encore de diamants. Ne pas activer la vente avant d'avoir relié une API serveur de solde et de transactions.
- La création automatique de cadeaux par IA et leur validation nécessitent un service de proposition et une file d'approbation administrateur; aucun cadeau n'est publié automatiquement dans cette V1.

## Parcours produit visé
1. **Créer** : texte/image vers clip IA, avec durée et coût affichés avant lancement.
2. **Ajouter le son** : bibliothèque de sons autorisés ou import audio personnel; contrôle des droits d'utilisation avant publication publique.
3. **Monter** : couper/assembler les séquences, texte, sous-titres, filtres, transitions, réglage des pistes audio et aperçu.
4. **Enregistrer ou publier** : privé par défaut; publication communautaire explicite, suppression et signalement disponibles.
5. **Caméra mobile** : capture directe, filtres, musique et export; demander les autorisations caméra/micro uniquement au moment utile.

## Jetons Wesh et diamants — séparation recommandée
- **Jetons Wesh** : crédit de consommation pour les générations IA, selon les règles de quota et d'abonnement déjà configurées. Le serveur doit calculer le coût et débiter atomiquement selon une politique documentée.
- **Diamants** : monnaie virtuelle achetée pour débloquer des effets premium et acheter des cadeaux virtuels. Ne pas les présenter comme de l'argent réel.
- **Abonnement** : détermine le quota de génération et les avantages inclus; il ne doit pas automatiquement accorder des retraits d'argent.
- **Cadeaux** : achat par un utilisateur puis envoi à un autre créateur. Les cadeaux sont des objets virtuels; les conditions d'achat, de remboursement et d'utilisation doivent être clairement indiquées.

## Partage des revenus des cadeaux
Objectif demandé : 60 % au créateur destinataire, 40 % à Wesh Star IA. Recommandation de calcul : appliquer ce partage au montant net éligible après remboursements, taxes applicables et frais de paiement, en affichant clairement la règle avant l'achat. Le pourcentage doit être configurable par l'administrateur, versionné et appliqué côté serveur. Les revenus créateur doivent rester dans un **solde de gains distinct** des diamants; tout retrait éventuel nécessite vérification d'identité, seuils, contrôle antifraude et conformité juridique/paiement.

## Coffres
- Un coffre affiche son prix en diamants, les récompenses possibles et leurs probabilités avant achat/ouverture.
- Les résultats sont déterminés côté serveur par un générateur aléatoire vérifiable, jamais par le navigateur.
- Prévoir limites d'achat, historique, protection contre les doubles débits, remboursements/chargebacks et restrictions d'âge/pays si nécessaire.
- Éviter les coffres payants à récompenses aléatoires avant une revue juridique des règles de jeux d'argent, de protection des consommateurs et des mineurs dans chaque marché.

## Propositions de cadeaux assistées par IA
1. Un processus en arrière-plan prépare des idées (nom, illustration, animation, rareté, prix suggéré et coût estimé).
2. Les propositions sont privées et arrivent dans une file **À examiner** du panneau admin.
3. L'administrateur peut prévisualiser, modifier le prix, approuver, refuser ou archiver.
4. Seuls les cadeaux approuvés et dont les assets sont prêts deviennent visibles dans la boutique.
5. La publication automatique doit rester désactivée par défaut; les actions d'administration sont auditées.

## Console d'administration à construire
- Catalogue cadeaux : brouillons, propositions IA, validation, prix en diamants, animation, disponibilité et historique.
- Effets vidéo : gratuit/premium, prix en diamants, aperçu, activation/désactivation.
- Économie : émission/vente de diamants, achats, cadeaux envoyés/reçus, commissions, remboursements, gains créateurs et journal de transactions.
- Paramètres de partage : 60/40 par défaut, calcul net/brut explicite, version/date d'effet et test avant publication.
- Modération : signalement de vidéos, musique, cadeaux et commentaires.

## Architecture de sécurité requise avant mise en production
- Les soldes et débits doivent être calculés exclusivement côté serveur dans une transaction de base de données.
- Journal comptable append-only, identifiants idempotents, vérification des paiements par webhook et protection contre les doubles achats.
- Ne jamais faire confiance au prix, au solde, à la part 60/40 ou au résultat d'un coffre fournis par le navigateur.
- Stockage vidéo avec quotas, limites de taille/durée, vérification de type MIME, droits d'accès privés et politique de suppression.
- Obtenir les licences nécessaires pour les musiques fournies dans une bibliothèque commune. Un utilisateur qui importe une musique doit confirmer qu'il dispose des droits requis pour son usage et sa publication.
