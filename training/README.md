# CoderAI — données d'entraînement

Les évaluations positives enregistrées depuis le site sont stockées dans /data/feedback.json. L'endpoint /api/training/export les exporte au format JSONL conversationnel.

Ce fichier est un jeu de données de départ pour du supervised fine-tuning (SFT). Les exemples positifs sont aussi réinjectés dans le contexte pour améliorer certaines réponses.

Le fine-tuning réel des poids n'est pas lancé sur Railway Free : 0,5 GB de RAM et un CPU limité ne suffisent pas pour entraîner proprement même un petit Transformer. Le JSONL peut être utilisé plus tard avec un environnement disposant de GPU/RAM. N'enregistre pas de tokens, mots de passe, données privées ou code confidentiel.
