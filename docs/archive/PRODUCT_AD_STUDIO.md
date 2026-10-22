# Wesh Star IA — Publicité produit

Le Studio Publicité Produit permet à un client de :

1. importer une photo de son produit ;
2. choisir **Présenter le produit** ou **Faire porter/utiliser le produit** ;
3. décrire le mannequin ;
4. écrire un brief publicitaire ;
5. générer un clip publicitaire avec le GPU local Wesh Star IA.

Le mode présentation est générique pour les produits physiques. Le mode porter/utiliser fonctionne comme une génération vidéo guidée par image : la fidélité exacte d'un vêtement, d'une chaussure ou d'un accessoire dépend du modèle vidéo local. Une fidélité parfaite de type virtual try-on nécessite un modèle local spécialisé supplémentaire.

Le pipeline ne fait pas appel à une API vidéo hébergée : il utilise le worker GPU local `/v1/jobs` et le modèle I2V configuré dans `docker-compose.self-hosted.yml`.
