# Guide débutant — modifier le design et lancer Wesh Star IA

## Est-ce possible sans savoir coder ?
Oui pour imaginer le design, choisir les couleurs, créer des maquettes et préparer les textes. Pour modifier le code, brancher la base de données, sécuriser les paiements, déployer le serveur et tester les retraits/lives, il faut suivre des étapes guidées ou se faire aider. Une maquette IA n'est pas automatiquement une fonctionnalité opérationnelle.

## Workflow conseillé pour le design
1. Faire une copie de sauvegarde du ZIP avant chaque série de changements.
2. Utiliser Google Stitch (`https://stitch.withgoogle.com/`) pour proposer les écrans; Figma (`https://www.figma.com/`) pour harmoniser les composants; v0 (`https://v0.dev/`) pour générer du code de composants si besoin.
3. Décrire une seule page à la fois : accueil, studio IA, fil vidéo, live, portefeuille, Shop, puis administration.
4. Garder une identité visuelle constante : palette, typographie, espacement, boutons, cartes, états de chargement, erreurs et affichage mobile.
5. Faire intégrer les changements dans le projet existant plutôt que demander à un outil de reconstruire l'application entière. Vérifier que l'authentification et les API existantes restent reliées.
6. Tester la version mobile et ordinateur, puis tester toutes les actions; ne pas valider seulement une capture d'écran.

## Prompt de départ pour une maquette
« Conçois une interface responsive pour Wesh Star IA, une plateforme francophone de création vidéo par IA, communauté vidéo, lives, cadeaux virtuels et marketplace. Style premium, moderne, accessible, contrastes lisibles, navigation mobile simple. Prévois les écrans Accueil, Studio IA, Communauté, Live, Portefeuille créateur, Shop, Commandes et Administration. Utilise des données fictives et des états vides/chargement/erreur. Il s'agit d'une maquette visuelle; ne prétends pas que les paiements, vidéos ou lives fonctionnent déjà. »

## Ordre de test technique
1. `npm install`
2. Copier `.env.example` vers `.env.local` et remplir les clés nécessaires en privé; ne jamais publier les clés.
3. Démarrer PostgreSQL et configurer `DATABASE_URL`.
4. `npm run db:migrate`
5. `npm test`
6. `npm run build`
7. `npm run dev` pour tester localement.
8. Tester comptes et droits, puis vidéos, puis monétisation, puis Shop en sandbox.
9. Faire sauvegarde et restauration avant toute mise en production.

## Ce qui demande encore une configuration externe ou une validation réelle
- Les clés et paramètres du fournisseur publicitaire.
- Le versement réel des retraits aux créateurs.
- Les paiements marketplace, remboursements et transporteurs du Shop.
- L'application développeur et les autorisations officielles des réseaux sociaux.
- Le GPU local, les modèles IA et la charge réelle des lives.
- Les mentions légales, la fiscalité, la protection des données et les règles de vente des pays ciblés.

## Règle d'or
Ne jamais payer un développeur sur la base d'une capture d'écran. Demander le code source, les instructions de lancement, les tests, une démonstration en préproduction, une sauvegarde restaurable et une liste explicite des limites restantes.
