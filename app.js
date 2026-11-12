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
  // WebGPU check
  if (!navigator.gpu) {
    statusEl.textContent = "WebGPU missing";
    addMessage("system", "Your browser does not support WebGPU.\n\nOn iPad:\n• Try Chrome (if available)\n• Or update iPadOS (Safari 18+ / iPadOS 18+)\n• Or open this page from a computer");
    return;
  }

  try {
    statusEl.textContent = "Downloading model…";

    // Smallest model for best iPad compatibility
    const selectedModel = "SmolLM2-360M-Instruct-q4f16_1-MLC";

    engine = await CreateMLCEngine(selectedModel, {
      initProgressCallback: (report) => {
        statusEl.textContent = report.text;
      },
    });

    statusEl.textContent = "Ready";
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();

    addMessage("system", "Model loaded (SmolLM2-360M). Everything runs locally in your browser.");
  } catch (err) {
    statusEl.textContent = "Load failed";
    addMessage("system", "Failed to load the model.\n\nPossible causes:\n• WebGPU too limited on this iPad\n• Not enough memory\n• Browser too old\n\nTry Chrome on iPad or a computer.");
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
  statusEl.textContent = "Thinking…";

  try {
    const reply = await engine.chat.completions.create({
      messages: history,
      stream: false,
    });

    const content = reply.choices[0].message.content;
    addMessage("assistant", content);
    history.push({ role: "assistant", content });
  } catch (err) {
    addMessage("system", "Error during generation.");
    console.error(err);
  }

  sendBtn.disabled = false;
  statusEl.textContent = "Ready";
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
