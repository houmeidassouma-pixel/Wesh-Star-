# Wesh Star — Retraits créateurs V30

- Le seuil de retrait reste fixé à 10 EUR brut (1 pièce comptable = 0,01 EUR ; 1 000 pièces gagnées = 10 EUR).
- Les pièces achetées ne sont pas retirables : seule la balance `earnings` issue de gains créateurs est admissible.
- À la demande, le créateur choisit un moyen de retrait (virement bancaire, PayPal ou Mobile Money) et saisit ses coordonnées de réception.
- Les pièces sont réservées atomiquement à la création de la demande pour empêcher les doubles demandes/dépenses.
- L'administration voit le moyen et la destination, puis doit approuver ou refuser. En cas de refus, les pièces réservées sont rendues. Après approbation, l'administration effectue le paiement auprès d'un prestataire disponible et saisit sa référence réelle avant de marquer la demande payée.
- La collecte de coordonnées ne signifie pas que ces prestataires sont intégrés. Dans cette version, le versement reste manuel; une API de décaissement et la vérification d'identité/pays sont nécessaires pour automatiser les paiements. Ne jamais marquer un paiement payé avant confirmation effective.
- Appliquer la migration `db/migrations/20261016_creator_payout_destination.sql` avant déploiement.
- Protéger l'accès admin, les sauvegardes et la base : les destinations de paiement sont des données privées.
