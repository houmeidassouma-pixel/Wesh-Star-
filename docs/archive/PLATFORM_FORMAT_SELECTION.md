# Wesh Star IA — sélection de plateforme et format vidéo

Avant une génération, l'utilisateur choisit la plateforme cible. Wesh Star IA affiche alors le ratio et le format de sortie correspondants et transmet ces dimensions au GPU worker local.

- YouTube: 16:9 — 832×480
- TikTok: 9:16 — 480×832
- Instagram Reels: 9:16 — 480×832
- YouTube Shorts: 9:16 — 480×832
- Instagram Feed: 1:1 — 640×640
- X: 16:9 — 832×480
- LinkedIn: 16:9 — 832×480
- Facebook: 16:9 — 832×480

La plateforme est enregistrée avec la génération et réutilisée par le worker lors des nouvelles tentatives. Les autres fonctions existantes sont conservées.
