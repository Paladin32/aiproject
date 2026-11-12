"""CoderAI: offline coding helper with deterministic generators.

No paid API, no external model, no pretrained weights. This alpha uses
curated code templates and task detection; the NumPy RNN remains an
educational training experiment and is not misrepresented as an LLM.
"""
import re
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024


def clean_prompt(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()[:2000]


def code_result(title, language, code, explanation, next_steps=None):
    return {
        "title": title,
        "language": language,
        "code": code.strip(),
        "explanation": explanation,
        "next_steps": next_steps or [],
        "engine": "Générateur local CoderAI",
    }


def discord_js():
    return code_result(
        "Bot Discord — discord.js v14", "javascript",
        """const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Affiche la latence du bot"),
  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Fait répéter un message au bot")
    .addStringOption(option =>
      option.setName("message").setDescription("Message à envoyer").setRequired(true)
    ),
].map(command => command.toJSON());

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async readyClient => {
  console.log(`Connecté en tant que ${readyClient.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationCommands(readyClient.user.id),
    { body: commands }
  );
  console.log("Commandes slash enregistrées.");
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    return interaction.reply({ content: `Pong ! ${client.ws.ping} ms`, ephemeral: true });
  }

  if (interaction.commandName === "say") {
    const message = interaction.options.getString("message", true);
    return interaction.reply({ content: message });
  }
});

client.login(process.env.DISCORD_TOKEN);""",
        "Bot Discord fonctionnel avec /ping et /say. Il utilise discord.js v14 et enregistre les commandes slash au démarrage.",
        ["Installe : npm install discord.js dotenv", "Crée un fichier .env avec DISCORD_TOKEN=TON_TOKEN", "Active les commandes slash dans le Developer Portal et lance : node index.js"]
    )


def discord_python():
    return code_result(
        "Bot Discord — discord.py", "python",
        """import os
import discord
from discord import app_commands
from dotenv import load_dotenv

load_dotenv()
intents = discord.Intents.default()
client = discord.Client(intents=intents)
tree = app_commands.CommandTree(client)

@tree.command(name="ping", description="Affiche la latence du bot")
async def ping(interaction: discord.Interaction):
    await interaction.response.send_message(
        f"Pong ! {round(client.latency * 1000)} ms",
        ephemeral=True
    )

@tree.command(name="say", description="Fait répéter un message au bot")
@app_commands.describe(message="Message à envoyer")
async def say(interaction: discord.Interaction, message: str):
    await interaction.response.send_message(message)

@client.event
async def on_ready():
    await tree.sync()
    print(f"Connecté en tant que {client.user}")

client.run(os.environ["DISCORD_TOKEN"])""",
        "Bot Discord Python avec deux commandes slash et synchronisation automatique.",
        ["Installe : pip install -U discord.py python-dotenv", "Ajoute DISCORD_TOKEN=TON_TOKEN dans .env", "Lance : python bot.py"]
    )


def html_page():
    return code_result(
        "Page web responsive", "html",
        """<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mon projet</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: system-ui, sans-serif; color: #f4f6ff;
      background: radial-gradient(circle at top, #263b70, #090d18 65%); }
    main { width: min(680px, 92vw); padding: 42px; border: 1px solid #35466e;
      border-radius: 24px; background: #111a2dcc; text-align: center; }
    h1 { font-size: clamp(2.2rem, 7vw, 4rem); margin: 0 0 14px; }
    p { color: #b9c5df; line-height: 1.7; }
    a { display: inline-block; margin-top: 18px; padding: 13px 20px;
      border-radius: 10px; background: #9bb4ff; color: #10172a;
      font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
  <main>
    <h1>Bienvenue 👋</h1>
    <p>Une page simple, moderne et adaptée aux mobiles. Modifie ce contenu pour ton projet.</p>
    <a href="#suite">Découvrir</a>
  </main>
</body>
</html>""",
        "Page HTML autonome, responsive et sans dépendance externe. Tu peux remplacer le titre, le texte et les couleurs."
    )


def flask_api():
    return code_result(
        "API REST avec Flask", "python",
        """from flask import Flask, jsonify, request

app = Flask(__name__)
tasks = []
next_id = 1

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

@app.get("/api/tasks")
def list_tasks():
    return jsonify(tasks)

@app.post("/api/tasks")
def create_task():
    global next_id
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    if not title:
        return jsonify({"error": "Le champ title est obligatoire"}), 400
    task = {"id": next_id, "title": title, "done": False}
    next_id += 1
    tasks.append(task)
    return jsonify(task), 201

@app.delete("/api/tasks/<int:task_id>")
def delete_task(task_id):
    for index, task in enumerate(tasks):
        if task["id"] == task_id:
            return jsonify(tasks.pop(index))
    return jsonify({"error": "Tâche introuvable"}), 404

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)""",
        "API avec endpoints GET, POST et DELETE, validation des entrées et réponses JSON. Les données sont en mémoire et seront perdues au redémarrage.",
        ["Installe : pip install flask", "Lance : python app.py", "Teste POST /api/tasks avec {"title":"Apprendre Flask"}"]
    )


def python_calculator():
    return code_result(
        "Calculatrice Python", "python",
        """def calculate(a: float, operator: str, b: float) -> float:
    operations = {
        "+": lambda: a + b,
        "-": lambda: a - b,
        "*": lambda: a * b,
        "/": lambda: a / b if b != 0 else None,
        "**": lambda: a ** b,
        "%": lambda: a % b if b != 0 else None,
    }
    if operator not in operations:
        raise ValueError("Opérateur non reconnu")
    result = operations[operator]()
    if result is None:
        raise ZeroDivisionError("Division par zéro impossible")
    return result


if __name__ == "__main__":
    print("Calculatrice (+, -, *, /, **, %)")
    try:
        left = float(input("Premier nombre : "))
        op = input("Opérateur : ").strip()
        right = float(input("Deuxième nombre : "))
        print("Résultat :", calculate(left, op, right))
    except (ValueError, ZeroDivisionError) as error:
        print("Erreur :", error)""",
        "Calculatrice en ligne de commande avec validation de l'opérateur et gestion de la division par zéro."
    )


def python_algorithm(prompt):
    p = prompt.lower()
    if "fibonacci" in p:
        code = """def fibonacci(n: int) -> list[int]:
    if n < 0:
        raise ValueError("n doit être positif ou nul")
    sequence = []
    a, b = 0, 1
    for _ in range(n):
        sequence.append(a)
        a, b = b, a + b
    return sequence


print(fibonacci(10))"""
        return code_result("Suite de Fibonacci", "python", code, "Version itérative en O(n), qui évite les appels récursifs coûteux.")
    if "factorielle" in p or "factorial" in p:
        code = """def factorial(n: int) -> int:
    if n < 0:
        raise ValueError("n doit être positif ou nul")
    result = 1
    for number in range(2, n + 1):
        result *= number
    return result


print(factorial(5))"""
        return code_result("Factorielle", "python", code, "Calcul itératif avec contrôle des valeurs négatives.")
    if "premier" in p or "prime" in p:
        code = """def is_prime(n: int) -> bool:
    if n < 2:
        return False
    if n % 2 == 0:
        return n == 2
    divisor = 3
    while divisor * divisor <= n:
        if n % divisor == 0:
            return False
        divisor += 2
    return True


print(is_prime(29))"""
        return code_result("Test de nombre premier", "python", code, "Teste les diviseurs jusqu'à la racine carrée de n.")
    return None


def debug_error(prompt):
    p = prompt.lower()
    if "modulenotfounderror" in p or "no module named" in p:
        return code_result("Diagnostic : module Python manquant", "text",
            "Python ne trouve pas le paquet importé.\n\n1. Vérifie le nom du paquet.\n2. Installe-le dans le même environnement : python -m pip install NOM_DU_PAQUET\n3. Vérifie l'interpréteur : python --version et python -m pip --version\n4. Sur Railway, ajoute le paquet à requirements.txt puis redéploie.",
            "Le message exact et le fichier requirements.txt permettent de confirmer le correctif.")
    if "syntaxerror" in p or "indentationerror" in p:
        return code_result("Diagnostic : erreur de syntaxe Python", "text",
            "Python n'arrive pas à analyser le fichier. Vérifie la ligne indiquée dans le traceback :\n- parenthèses, crochets et guillemets fermés ;\n- deux-points après if, for, while, def et class ;\n- indentation cohérente (4 espaces recommandés).",
            "Colle le traceback complet et 10 lignes autour de la ligne signalée pour obtenir un correctif précis.")
    if "cannot read properties" in p or "typeerror" in p:
        return code_result("Diagnostic : erreur JavaScript probable", "text",
            "Une valeur utilisée n'a probablement pas le type attendu ou vaut undefined/null. Vérifie la variable sur la ligne signalée, la réponse d'une API et les accès imbriqués. Utilise une validation explicite avant de lire ses propriétés.",
            "Le message complet, le fichier et le code autour de la ligne sont nécessaires pour identifier la cause exacte.")
    return None


def generate_answer(prompt):
    p = prompt.lower()
    debug = debug_error(prompt)
    if debug:
        return debug

    if any(word in p for word in ("discord", "discord.js", "discordjs")):
        if any(word in p for word in ("python", "discord.py")):
            return discord_python()
        return discord_js()

    if any(word in p for word in ("site web", "page web", "html", "landing page", "portfolio")):
        return html_page()

    if any(word in p for word in ("api flask", "api rest", "serveur flask", "endpoint")):
        return flask_api()

    if any(word in p for word in ("calculatrice", "calculator")):
        return python_calculator()

    algorithm = python_algorithm(prompt)
    if algorithm:
        return algorithm

    if "python" in p or "script" in p:
        return code_result(
            "Base de script Python", "python",
            """def main():
    # TODO: décris ici le traitement à effectuer
    print("CoderAI : projet initialisé")


if __name__ == "__main__":
    main()""",
            "Je n'ai pas reconnu assez précisément la tâche pour générer une solution spécialisée. Reformule en précisant les entrées, le résultat attendu et les contraintes."
        )

    return code_result(
        "Précise ta demande", "text",
        "Pour produire du code utile, indique :\n1. Le langage (Python, JavaScript, HTML/CSS…).\n2. Ce que le programme doit faire.\n3. Les fonctionnalités obligatoires.\n4. Les erreurs ou contraintes à respecter.\n\nExemple : « Fais un bot Discord.js v14 avec /ping, /ban et un système de tickets. »",
        "Cette version fonctionne sans service externe. Elle reconnaît certaines tâches et génère des modèles vérifiables ; elle ne comprend pas encore toutes les demandes comme un grand modèle de langage."
    )


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "engine": "local-template-engine", "api": "v2"})


@app.post("/api/generate")
def generate():
    payload = request.get_json(silent=True) or {}
    prompt = clean_prompt(payload.get("prompt"))
    if len(prompt) < 3:
        return jsonify({"error": "Décris un peu plus ce que tu veux créer."}), 400
    result = generate_answer(prompt)
    result["prompt"] = prompt
    return jsonify(result)


if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")))
