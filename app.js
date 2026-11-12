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
  // Vérification WebGPU
  if (!navigator.gpu) {
    statusEl.textContent = "WebGPU absent";
    addMessage("system", "Ton navigateur ne supporte pas WebGPU.\n\nSur iPad :\n• Essaie Chrome (si disponible)\n• Ou mets à jour iPadOS (Safari 18+ / iPadOS 18+)\n• Ou ouvre la page depuis un ordinateur");
    return;
  }

  try {
    statusEl.textContent = "Téléchargement du modèle…";

    // Plus petit modèle possible pour maximiser les chances sur iPad
    const selectedModel = "SmolLM2-360M-Instruct-q4f16_1-MLC";

    engine = await CreateMLCEngine(selectedModel, {
      initProgressCallback: (report) => {
        statusEl.textContent = report.text;
      },
    });

    statusEl.textContent = "Prêt";
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();

    addMessage("system", "Modèle chargé (SmolLM2-360M). Tout tourne en local.");
  } catch (err) {
    statusEl.textContent = "Échec chargement";
    addMessage("system", "Impossible de charger le modèle.\n\nCauses possibles :\n• WebGPU trop limité sur cet iPad\n• Pas assez de mémoire\n• Navigateur trop ancien\n\nEssaie Chrome sur iPad ou un ordinateur.");
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
