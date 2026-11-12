import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const statusEl = document.getElementById("status");
const modelSelect = document.getElementById("modelSelect");
const reloadBtn = document.getElementById("reloadBtn");
const clearBtn = document.getElementById("clearBtn");
const progressBar = document.getElementById("progressBar");

let engine = null;
let history = [];
let isGenerating = false;

// Restore previous conversation
try {
  const saved = localStorage.getItem("myai-history");
  if (saved) history = JSON.parse(saved);
} catch {}

function saveHistory() {
  try {
    localStorage.setItem("myai-history", JSON.stringify(history));
  } catch {}
}

function addMessage(role, content, streamTarget = null) {
  if (streamTarget) {
    streamTarget.textContent = content;
    chatEl.scrollTop = chatEl.scrollHeight;
    return streamTarget;
  }

  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = content;

  if (role === "assistant") {
    const actions = document.createElement("div");
    actions.className = "msg-actions";
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(content).then(() => {
        copyBtn.textContent = "Copied";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
      });
    };
    actions.appendChild(copyBtn);
    div.appendChild(actions);
  }

  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return div;
}

function setUIReady(ready) {
  inputEl.disabled = !ready;
  sendBtn.disabled = !ready;
  modelSelect.disabled = !ready;
  reloadBtn.disabled = !ready;
  if (ready) inputEl.focus();
}

async function loadModel(modelId) {
  if (!navigator.gpu) {
    statusEl.textContent = "WebGPU missing";
    addMessage("system", "Your browser does not support WebGPU.\n\nOn iPad:\n• Try Chrome\n• Update to iPadOS 18+\n• Or open from a computer");
    return;
  }

  setUIReady(false);
  progressBar.style.width = "0%";
  statusEl.textContent = "Loading model…";

  try {
    if (engine) {
      // unload previous if possible
      try { await engine.unload(); } catch {}
    }

    engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        statusEl.textContent = report.text || "Loading…";
        if (report.progress !== undefined) {
          progressBar.style.width = Math.round(report.progress * 100) + "%";
        }
      },
    });

    progressBar.style.width = "100%";
    statusEl.textContent = "Ready";
    setUIReady(true);

    // Show history if any
    if (history.length && chatEl.children.length === 0) {
      history.forEach((m) => addMessage(m.role, m.content));
    } else if (history.length === 0) {
      addMessage("system", `Model ready (${modelId.split("-")[0]}). Everything runs locally.`);
    }
  } catch (err) {
    statusEl.textContent = "Load failed";
    progressBar.style.width = "0%";
    addMessage("system", "Failed to load the model.\n\nPossible causes:\n• WebGPU limited on this device\n• Not enough memory\n• Model too heavy\n\nTry a smaller model or another browser.");
    console.error(err);
  }
}

async function send() {
  const text = inputEl.value.trim();
  if (!text || !engine || isGenerating) return;

  inputEl.value = "";
  inputEl.style.height = "auto";
  addMessage("user", text);
  history.push({ role: "user", content: text });
  saveHistory();

  isGenerating = true;
  setUIReady(false);
  statusEl.textContent = "Thinking…";

  const assistantDiv = addMessage("assistant", "…");
  let fullReply = "";

  try {
    const chunks = await engine.chat.completions.create({
      messages: history,
      stream: true,
    });

    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content || "";
      fullReply += delta;
      assistantDiv.textContent = fullReply;
      chatEl.scrollTop = chatEl.scrollHeight;
    }

    // Add copy button after streaming finishes
    const actions = document.createElement("div");
    actions.className = "msg-actions";
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(fullReply).then(() => {
        copyBtn.textContent = "Copied";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
      });
    };
    actions.appendChild(copyBtn);
    assistantDiv.appendChild(actions);

    history.push({ role: "assistant", content: fullReply });
    saveHistory();
  } catch (err) {
    assistantDiv.textContent = "Error during generation.";
    console.error(err);
  }

  isGenerating = false;
  setUIReady(true);
  statusEl.textContent = "Ready";
}

// Auto-resize textarea
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
});

sendBtn.addEventListener("click", send);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

clearBtn.addEventListener("click", () => {
  if (!confirm("Clear the entire conversation?")) return;
  history = [];
  saveHistory();
  chatEl.innerHTML = "";
  addMessage("system", "Chat cleared.");
});

reloadBtn.addEventListener("click", () => {
  loadModel(modelSelect.value);
});

modelSelect.addEventListener("change", () => {
  loadModel(modelSelect.value);
});

// Start with the lightest model
loadModel(modelSelect.value);
