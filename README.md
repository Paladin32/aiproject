# CoderAI

CoderAI est un assistant de programmation basé sur un modèle public open-weight exécuté localement sur Railway.

## Modèle
- SmolLM2-360M-Instruct, format GGUF Q4_K_M.
- Quantification : bartowski/SmolLM2-360M-Instruct-GGUF.
- Poids téléchargés au premier usage dans /data, jamais stockés dans Git.
- Licence annoncée par le dépôt GGUF : Apache-2.0. Conserver les attributions et licences des auteurs.
- Inférence : llama.cpp via llama-cpp-python, CPU uniquement.

Ce modèle est volontairement minuscule. Il est expérimental, moins performant qu'un grand assistant de code et principalement entraîné pour l'anglais. Le prompt lui demande de répondre en français, sans garantie de qualité parfaite.

## Personnalisation
- Personnalité CoderAI modifiable via l'interface.
- Notes de connaissances persistantes injectées selon leur pertinence.
- Retours positifs/négatifs enregistrés.
- Réponses appréciées réutilisées comme exemples de contexte et exportables en JSONL.

Important : les retours et notes ne modifient pas les poids du modèle. Ils personnalisent les réponses et constituent un jeu de données pour un futur fine-tuning. Un véritable fine-tuning LoRA nécessite davantage de mémoire et de calcul que Railway Free ne fournit.

## Railway
1. Connecter Paladin32/aiproject à Railway.
2. Ajouter un volume persistant monté sur /data (le modèle fait environ 271 Mo).
3. Garder un worker et un contexte de 768 tokens pour limiter la RAM.
4. Au premier prompt, CoderAI télécharge le GGUF depuis Hugging Face puis le charge.

Railway Free indique actuellement 0,5 GB RAM par service et 0,5 GB de volume. Le modèle et son runtime peuvent dépasser la RAM disponible : le déploiement doit être testé et peut nécessiter une réduction du contexte. Le budget zéro n'est pas garanti au-delà des crédits gratuits. Voir https://railway.com/pricing.

## API
- GET / interface ; GET /health état du modèle.
- POST /api/generate avec { "prompt": "..." }.
- GET/POST /api/persona ; GET/POST /api/knowledge.
- DELETE /api/knowledge/<id> ; POST /api/feedback.
- GET /api/training/export télécharge les exemples positifs en JSONL.

## Sécurité
Cette alpha n'a pas encore de compte ni d'authentification : ne publie pas de secrets ou de données privées dans les prompts, notes ou retours. Le code généré doit être relu et testé. Aucun code utilisateur n'est exécuté sur le serveur.
