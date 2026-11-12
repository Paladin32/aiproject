"""CoderAI: local GGUF inference with persistent personalization."""
import json, os, shutil, threading, time, urllib.request, uuid
from pathlib import Path
from flask import Flask, Response, jsonify, render_template, request, send_file

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 24 * 1024
DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
MODEL_PATH = DATA_DIR / "smollm2-135m-instruct-q4_k_m.gguf"
OLD_MODEL_PATH = DATA_DIR / "smollm2-360m-instruct-q4_k_m.gguf"
MODEL_URL = "https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF/resolve/c6f2d396a5faa22c9722908d47e8da81a5d8cebc/SmolLM2-135M-Instruct-Q4_K_M.gguf"
MODEL_NAME = "SmolLM2-135M-Instruct (GGUF Q4_K_M)"
SYSTEM_DEFAULT = """Tu es CoderAI, un assistant de programmation indépendant.
Réponds en français sauf demande contraire. Aide à concevoir, écrire, expliquer,
corriger et tester du code. Donne des solutions complètes et cohérentes avec les
versions demandées. Signale les hypothèses, dépendances et limites.
Ne prétends jamais avoir exécuté du code si ce n'est pas le cas.
Si une demande manque d'informations, pose une question précise.
Privilégie Python, JavaScript/TypeScript, HTML/CSS, Node.js et discord.js.
Ne révèle jamais de secrets et rappelle de ne pas coller de tokens ou mots de passe."""
MODEL = None
MODEL_LOCK = threading.Lock()
FILE_LOCK = threading.Lock()

def read_json(path, default):
    try: return json.loads(path.read_text("utf-8"))
    except (OSError, ValueError): return default

def write_json(path, value):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), "utf-8")
    temp.replace(path)

def download_model():
    if MODEL_PATH.exists() and MODEL_PATH.stat().st_size > 80_000_000: return
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    # Free-tier volume is small: remove previous 360M weights before downloading 135M.
    OLD_MODEL_PATH.unlink(missing_ok=True)
    temporary = MODEL_PATH.with_suffix(".download")
    req = urllib.request.Request(MODEL_URL, headers={"User-Agent": "CoderAI/1.0"})
    with urllib.request.urlopen(req, timeout=240) as response:
        with temporary.open("wb") as target:
            shutil.copyfileobj(response, target, length=1024 * 1024)
    if temporary.stat().st_size < 80_000_000:
        temporary.unlink(missing_ok=True)
        raise RuntimeError("Téléchargement du modèle incomplet.")
    temporary.replace(MODEL_PATH)

def get_model():
    global MODEL
    if MODEL is not None: return MODEL
    with MODEL_LOCK:
        if MODEL is not None: return MODEL
        download_model()
        from llama_cpp import Llama
        MODEL = Llama(model_path=str(MODEL_PATH), n_ctx=384, n_threads=1,
                      n_threads_batch=1, n_batch=64, n_ubatch=64,
                      n_gpu_layers=0, use_mmap=True, use_mlock=False, verbose=False)
        return MODEL

def current_persona():
    path = DATA_DIR / "persona.txt"
    return path.read_text("utf-8")[:4000] if path.exists() else SYSTEM_DEFAULT

def relevant_knowledge(prompt):
    notes = read_json(DATA_DIR / "knowledge.json", [])
    words = {w.lower() for w in prompt.split() if len(w) > 3}
    ranked = []
    for note in notes:
        text = note.get("text", "")
        score = sum(1 for word in words if word in text.lower())
        if score: ranked.append((score, text))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [item[1][:1200] for item in ranked[:3]]

def helpful_examples(prompt):
    examples = read_json(DATA_DIR / "feedback.json", [])
    words = {w.lower() for w in prompt.split() if len(w) > 3}
    ranked = []
    for item in examples:
        if not item.get("helpful"): continue
        score = sum(1 for word in words if word in item.get("prompt", "").lower())
        if score: ranked.append((score, item))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [item for _, item in ranked[:2]]

def prepare_messages(messages):
    normalized = []
    client_systems = []
    for item in messages[-10:]:
        role = item.get("role")
        text = str(item.get("content", ""))[:3000]
        if role == "system":
            client_systems.append(text)
        elif role in ("user", "assistant") and text:
            normalized.append({"role": role, "content": text})
    last_prompt = next((m["content"] for m in reversed(normalized) if m["role"] == "user"), "")
    system = current_persona()
    if client_systems:
        system += "\n\nInstructions supplémentaires de Continue :\n" + "\n".join(client_systems)[:3000]
    notes = relevant_knowledge(last_prompt)
    examples = helpful_examples(last_prompt)
    if notes:
        system += "\n\nConnaissances personnelles :\n" + "\n---\n".join(notes)
    if examples:
        system += "\n\nExemples appréciés :"
        for item in examples:
            system += "\nDemande : " + item.get("prompt", "")[:500]
            system += "\nRéponse : " + item.get("answer", "")[:900]
    return [{"role": "system", "content": system}] + normalized


def run_model(messages, stream=False):
    llm = get_model()
    return llm.create_chat_completion(
        messages=prepare_messages(messages),
        temperature=0.25,
        top_p=0.9,
        max_tokens=128,
        repeat_penalty=1.12,
        stream=stream,
    )


def generate_answer(prompt):
    result = run_model([{"role": "user", "content": prompt}])
    return result["choices"][0]["message"].get("content", "").strip()

@app.get("/")
def home(): return render_template("index.html")

@app.get("/v1/models")
def openai_models():
    return jsonify({"object": "list", "data": [
        {"id": "coderai", "object": "model", "created": 0, "owned_by": "local"}
    ]})


@app.post("/v1/chat/completions")
def openai_chat_completions():
    payload = request.get_json(silent=True) or {}
    messages = payload.get("messages")
    if not isinstance(messages, list) or not messages:
        return jsonify({"error": {"message": "messages est obligatoire", "type": "invalid_request_error"}}), 400
    model_name = str(payload.get("model", "coderai"))[:100]
    if payload.get("stream"):
        def events():
            try:
                for chunk in run_model(messages, stream=True):
                    chunk["model"] = model_name
                    yield "data: " + json.dumps(chunk, ensure_ascii=False) + "\n\n"
                yield "data: [DONE]\n\n"
            except Exception:
                app.logger.exception("Erreur de streaming Continue")
                yield "data: [DONE]\n\n"
        return Response(events(), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
    try:
        result = run_model(messages)
        answer = result["choices"][0]["message"].get("content", "")
        return jsonify({
            "id": "chatcmpl-coderai",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model_name,
            "choices": [{"index": 0, "message": {"role": "assistant", "content": answer},
                         "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        })
    except Exception as exc:
        app.logger.exception("Erreur endpoint OpenAI compatible")
        return jsonify({"error": {"message": str(exc)[:300], "type": "server_error"}}), 503


@app.get("/health")
def health():
    return jsonify({"status":"ok","model":MODEL_NAME,"model_downloaded":MODEL_PATH.exists(),
        "model_loaded":MODEL is not None,
        "personal_notes":len(read_json(DATA_DIR/"knowledge.json",[])),
        "feedback_examples":len(read_json(DATA_DIR/"feedback.json",[]))})

@app.post("/api/generate")
def generate():
    payload = request.get_json(silent=True) or {}
    prompt = str(payload.get("prompt","")).strip()[:5000]
    if len(prompt) < 2: return jsonify({"error":"Écris une demande plus précise."}), 400
    try: return jsonify({"answer":generate_answer(prompt),"model":MODEL_NAME,"personalized":True})
    except Exception as exc:
        app.logger.exception("Échec de génération")
        return jsonify({"error":"Le modèle n'a pas pu démarrer. Vérifie les logs Railway.",
                        "detail":str(exc)[:300]}), 503

@app.get("/api/persona")
def get_persona(): return jsonify({"persona":current_persona()})

@app.post("/api/persona")
def set_persona():
    payload = request.get_json(silent=True) or {}
    persona = str(payload.get("persona","")).strip()[:4000]
    if len(persona) < 20: return jsonify({"error":"La personnalité doit contenir au moins 20 caractères."}), 400
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR/"persona.txt").write_text(persona, "utf-8")
    return jsonify({"ok":True})

@app.get("/api/knowledge")
def get_knowledge(): return jsonify({"items":read_json(DATA_DIR/"knowledge.json",[])})

@app.post("/api/knowledge")
def add_knowledge():
    payload = request.get_json(silent=True) or {}
    note = str(payload.get("text","")).strip()[:3000]
    if len(note) < 10: return jsonify({"error":"Ajoute au moins 10 caractères."}), 400
    path = DATA_DIR/"knowledge.json"
    with FILE_LOCK:
        items = read_json(path, [])
        items.append({"id":str(uuid.uuid4()),"text":note})
        write_json(path, items[-100:])
    return jsonify({"ok":True,"count":len(items[-100:])})

@app.delete("/api/knowledge/<note_id>")
def delete_knowledge(note_id):
    path = DATA_DIR/"knowledge.json"
    with FILE_LOCK:
        items = read_json(path, [])
        updated = [item for item in items if item.get("id") != note_id]
        write_json(path, updated)
    return jsonify({"ok":True,"count":len(updated)})

@app.post("/api/feedback")
def feedback():
    payload = request.get_json(silent=True) or {}
    prompt = str(payload.get("prompt","")).strip()[:2000]
    answer = str(payload.get("answer","")).strip()[:4000]
    if not prompt or not answer: return jsonify({"error":"Exemple incomplet."}), 400
    path = DATA_DIR/"feedback.json"
    with FILE_LOCK:
        items = read_json(path, [])
        items.append({"prompt":prompt,"answer":answer,"helpful":bool(payload.get("helpful",False))})
        write_json(path, items[-500:])
    return jsonify({"ok":True,"count":len(items[-500:])})

@app.get("/api/training/export")
def export_training():
    items = read_json(DATA_DIR/"feedback.json", [])
    export_path = DATA_DIR/"coderai-training.jsonl"
    with export_path.open("w",encoding="utf-8") as output:
        for item in items:
            if item.get("helpful"):
                row = {"messages":[{"role":"user","content":item.get("prompt","")},
                                   {"role":"assistant","content":item.get("answer","")}]}
                output.write(json.dumps(row,ensure_ascii=False)+"\n")
    return send_file(export_path,as_attachment=True,download_name="coderai-training.jsonl",
                     mimetype="application/x-ndjson")

if __name__ == "__main__":
    app.run(host="0.0.0.0",port=int(os.environ.get("PORT","8080")))
