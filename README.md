# CoderAI

CoderAI est un prototype éducatif d'IA spécialisée dans le code, construit avec Python, NumPy et Flask. Son petit réseau neuronal récurrent (RNN) est initialisé avec des poids aléatoires puis entraîné sur le corpus du dépôt.

**Aucun modèle pré-entraîné ni API d'IA externe n'est utilisé.**

## Important : ce que ce projet sait faire

Ce dépôt démontre les bases d'un entraînement neuronal depuis zéro : vocabulaire de caractères, propagation avant, rétropropagation dans le temps (BPTT), mise à jour des poids et génération caractère par caractère.

Ce n'est pas un grand modèle de langage. Avec un petit corpus et un RNN minuscule, les résultats seront souvent incohérents et ne doivent pas être considérés comme du code fiable ou sécurisé. Un modèle de programmation de qualité professionnelle nécessiterait énormément plus de données, de calcul et de temps.

## Lancer localement

Python 3.11 ou plus récent recommandé.

```bash
pip install -r requirements.txt
python train.py --steps 900
python app.py
```

Ouvre ensuite http://localhost:8080.

## Déploiement sur Railway

1. Ouvre Railway et crée un nouveau projet depuis ce dépôt GitHub.
2. Choisis le dépôt `Paladin32/aiproject`.
3. Railway détectera le `Dockerfile`.
4. Le build installe les dépendances et entraîne le modèle pendant la construction de l'image.
5. Railway fournit la variable `PORT`; Gunicorn écoute sur cette variable.

Le premier build peut être lent à cause de l'entraînement. Les ressources gratuites Railway sont limitées et dépendent des conditions du compte.

## API

- `GET /` : interface web.
- `GET /health` : état du serveur et du modèle.
- `POST /api/generate` : génération.

Exemple de requête :

```json
{"prompt":"def fibonacci(n):"}
```

## Arborescence

```
.
├── app.py
├── train.py
├── model/
│   └── rnn.py
├── data/
│   └── corpus.txt
├── templates/
│   └── index.html
├── static/
│   ├── app.js
│   └── style.css
├── Dockerfile
└── requirements.txt
```

## Licence

MIT — voir le fichier LICENSE.
