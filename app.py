from pathlib import Path
from flask import Flask, jsonify, render_template, request
from model.rnn import CharRNN

app = Flask(__name__)
WEIGHTS = Path("model/weights.npz")
model = None
chars = []
char_to_ix = {}


def load_model():
    global model, chars, char_to_ix
    if WEIGHTS.exists():
        model, chars = CharRNN.load(WEIGHTS)
        char_to_ix = {ch: i for i, ch in enumerate(chars)}


load_model()


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None})


@app.post("/api/generate")
def generate():
    if model is None:
        return jsonify({"error": "Le modèle n'est pas entraîné. Consulte les logs Railway."}), 503
    payload = request.get_json(silent=True) or {}
    prompt = str(payload.get("prompt", ""))[:500]
    if not prompt.strip():
        return jsonify({"error": "Écris une instruction ou un début de code."}), 400

    known = [char_to_ix[ch] for ch in prompt if ch in char_to_ix]
    seed = known[-1] if known else char_to_ix.get(" ", 0)
    generated_ids = model.generate(seed, length=350, temperature=0.75)
    generated = "".join(chars[i] for i in generated_ids)
    return jsonify({
        "prompt": prompt,
        "generated": generated,
        "notice": "Prototype expérimental : génération caractère par caractère, sans compréhension réelle du code."
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port= int(__import__("os").environ.get("PORT", "8080")))
