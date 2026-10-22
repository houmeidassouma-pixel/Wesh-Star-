# Wesh Star IA V17 — paiement manuel, crédits et économie des pièces

- À partir de V18, les forfaits sont payés en paiement unique par défaut : 1 mois ou 1 an (prix annuel = 10 mensualités, crédits renouvelés par mois pendant la période). Le client peut choisir séparément un prélèvement automatique mensuel Stripe.
- Le webhook vérifie la référence, le montant, la devise et la session avant d'activer un forfait.
- Les achats de pièces consignent une répartition comptable de 40 % plateforme et 60 % réserve créateurs en centimes d'euro. Les pièces achetées sont tarifées à 1 centime chacune par défaut. Le ré-offrande de gains créateur déplace aussi 40 % de la valeur comptable vers la plateforme. Cela ne transfère pas automatiquement l'argent vers un compte bancaire.
- Prix des packs par défaut rapprochés d'une valeur faciale d'environ 0,01 € par pièce pour ne pas promettre des gains supérieurs à la valeur vendue.
- Génération utilisateur limitée à 10 minutes par vidéo (pas de limite de 10 minutes pour les outils d'administration/modération).
- Le nom du site réglé dans les paramètres d'administration est maintenant repris dans les en-têtes et les métadonnées ; les sons importés et le catalogue des sons sont pris en charge dans le montage automatique. Le studio IA principal n'ajoute pas encore une piste audio arbitraire au rendu IA généré.
- Le badge de compte vérifié existe déjà et reste attribué par l'administration.
- Les salons LIVE, les demandes d'invitation et la limite de 9 invités existent, mais le transport audio/vidéo en direct n'est pas intégré. L'hôte peut nommer un modérateur de LIVE par nom d’utilisateur d’un compte existant; ce modérateur peut accepter/refuser les demandes d'invitation et bloquer des utilisateurs pour ce LIVE. Le transport audio/vidéo en direct n'est pas intégré.

## Migration
Appliquer `db/migrations/20261020_manual_renewal_and_platform_treasury.sql` avant le déploiement. Les abonnements Stripe récurrents créés avant V17 peuvent encore prélever automatiquement : ils doivent être annulés dans le Dashboard Stripe avant la mise en ligne si le propriétaire veut arrêter les prélèvements.

## Validation
Cette archive ne doit pas être considérée prête pour production tant que l'installation des dépendances, le build Next.js, la migration en staging, les webhooks Stripe, les renouvellements mensuels/annuels et les tests de paiement n'ont pas été exécutés en environnement réel de test.


## Points à savoir avant la mise en ligne
- Depuis V18, Stripe sert aux paiements uniques et peut aussi créer un abonnement mensuel récurrent uniquement si le client coche explicitement cette option. Voir `V18_CHANGELOG.md`.
- Les abonnements récurrents créés dans Stripe avant V17 ne sont pas annulés par le code de l'application. Ils doivent être annulés dans le Dashboard Stripe, ou par une action d'annulation explicitement confirmée, pour empêcher leurs prochains prélèvements.
- Le solde en euros affiché dans l'administration est une comptabilité calculée à partir des paiements confirmés. Il ne représente pas le solde disponible du compte bancaire ni le solde Stripe en temps réel. Le bouton d'enregistrement de retrait n'effectue pas le virement bancaire.
- Le partage à l'achat et les mouvements de gains ré-offerts sont suivis dans le ledger comptable. La valeur de référence est 100 pièces = 1 € brut; les frais de paiement, remboursements, litiges, fiscalité et contrôles KYC restent à traiter avant de proposer des retraits automatiques.
- L'audio importé et les sons favoris sont pris en charge dans Montage automatique. Le générateur IA principal n'applique pas encore une piste audio importée directement pendant la génération du modèle.
- Les propositions de cadeaux en arrière-plan requièrent une tâche cron et un worker local configuré. Le streaming LIVE réel nécessite encore un serveur WebRTC/SFU.


Pour les changements les plus récents, voir `V18_CHANGELOG.md` : renouvellement Stripe facultatif, bouton d’annulation, retraits configurables 10–15 €, modération par nom d’utilisateur et seuil de monétisation de 10 000 abonnés avec vérification du pays.
