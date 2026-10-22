# Wesh Store, seuil de retrait et LIVE multi-invités

## Comptabilité recommandée
1. Achat de pièces : l’acheteur reçoit les pièces après confirmation du paiement ; aucun partage 60/40 n’est calculé à ce stade.
2. Envoi d’un cadeau ou réclamation d’une part de coffre : le serveur enregistre une transaction, crédite 60 % au portefeuille de gains du créateur (Wesh Store) et 40 % au solde de la plateforme. Les arrondis sont conservés dans le grand livre afin qu’aucune pièce ne soit créée ou perdue.
3. Retrait : seules les pièces gagnées sont éligibles. V16 bloque les demandes inférieures à 1 000 pièces gagnées et réserve le solde demandé. Une demande refusée rend les pièces au portefeuille de gains.

## Conseil pour les seuils
- Seuil technique provisoire : 1 000 pièces gagnées par demande.
- Seuil monétaire conseillé pour le futur : environ 20 € minimum par virement, mais ne pas l’annoncer comme actif avant de fixer et tester un taux stable de conversion des pièces en euros/XOF. Le prix d’achat des packs est dégressif, donc le prix payé par pièce n’est pas constant.
- Pour l’accès à la monétisation créateur, une règle de lancement raisonnable à tester serait : compte âgé d’au moins 30 jours, 5 vidéos originales publiques et 500 abonnés/abonnements communautaires ou un niveau équivalent d’activité vérifiée. Ajouter un seuil de vues valides et un contrôle anti-fraude avant d’activer la règle ; cette éligibilité n’est pas automatisée dans V16.

## LIVE sans match
L’hôte peut démarrer en solo ou activer une scène d’invités de 1 à 9 personnes. Les spectateurs demandent à monter sur scène et l’hôte accepte/refuse. Les métadonnées et les demandes sont stockées en base. Il faut encore un serveur de streaming/WebRTC pour transporter réellement l’audio et la vidéo des invités.
