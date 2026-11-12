# CoderAI

CoderAI est un assistant de programmation expérimental, hébergé sur Railway et sans API d'IA externe.

## Fonctionnement honnête

La version web utilise un moteur local déterministe : détection de tâches et générateurs de code testables (bot Discord.js/discord.py, page HTML, API Flask, calculatrice et algorithmes Python, premiers diagnostics d'erreurs). Il ne s'agit pas d'un grand modèle de langage et il ne sait pas encore traiter toutes les demandes libres.

Le dépôt contient aussi un petit RNN caractère-par-caractère écrit en NumPy, initialisé aléatoirement et entraînable depuis zéro avec `python train.py`. Ce RNN est un projet pédagogique séparé : il n'est pas utilisé pour prétendre produire des réponses de qualité LLM.

## Déploiement

Railway détecte le Dockerfile et lance Gunicorn. Aucun entraînement coûteux n'est exécuté pendant le build. La variable `PORT` est fournie par Railway.

## API

- `GET /` : interface.
- `GET /health` : état de l'application.
- `POST /api/generate` : génération locale, JSON `{"prompt":"Crée un bot Discord.js" }`.

## Développement local

```bash
pip install -r requirements.txt
python app.py
```

## Limites

Les générateurs sont des modèles de départ, pas une garantie de code complet ou sécurisé. Vérifie et teste toujours le code avant de l'utiliser. Aucun secret (token Discord, clé API, mot de passe) ne doit être collé dans le prompt.
