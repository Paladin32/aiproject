import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const statusEl = document.getElementById("status");

let engine = null;
let history = [];

function addMessage(role, content) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = content;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function init() {
  try {
    statusEl.textContent = "Téléchargement du modèle…";

    // Modèle léger adapté à l'iPad
    const selectedModel = "SmolLM2-1.7B-Instruct-q4f16_1-MLC";

    engine = await CreateMLCEngine(selectedModel, {
      initProgressCallback: (report) => {
        statusEl.textContent = report.text;
      },
    });

    statusEl.textContent = "Prêt";
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();

    addMessage("system", "Modèle chargé. Tout tourne en local dans ton navigateur.");
  } catch (err) {
    statusEl.textContent = "Erreur WebGPU";
    addMessage("system", "WebGPU non disponible ou modèle trop lourd pour cet appareil.\nEssaie Chrome/Edge récent ou un modèle plus petit.");
    console.error(err);
  }
}

async function send() {
  const text = inputEl.value.trim();
  if (!text || !engine) return;

  inputEl.value = "";
  addMessage("user", text);
  history.push({ role: "user", content: text });

  sendBtn.disabled = true;
  statusEl.textContent = "Réflexion…";

  try {
    const reply = await engine.chat.completions.create({
      messages: history,
      stream: false,
    });

    const content = reply.choices[0].message.content;
    addMessage("assistant", content);
    history.push({ role: "assistant", content });
  } catch (err) {
    addMessage("system", "Erreur lors de la génération.");
    console.error(err);
  }

  sendBtn.disabled = false;
  statusEl.textContent = "Prêt";
  inputEl.focus();
}

sendBtn.addEventListener("click", send);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

init();
