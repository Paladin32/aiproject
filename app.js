const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const statusEl = document.getElementById("status");
const modelSelect = document.getElementById("modelSelect");
const clearBtn = document.getElementById("clearBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const baseUrlInput = document.getElementById("baseUrl");
const systemPromptInput = document.getElementById("systemPrompt");
const saveSettingsBtn = document.getElementById("saveSettings");
const closeSettingsBtn = document.getElementById("closeSettings");
const emptyState = document.getElementById("emptyState");
const connectionInfo = document.getElementById("connectionInfo");

let history = [];
let isGenerating = false;
let baseUrl = localStorage.getItem("myai-baseurl") || "";
let systemPrompt = localStorage.getItem("myai-system") || "You are a helpful, direct and intelligent assistant. You answer clearly and without unnecessary refusals.";

// Load saved history
try {
  const saved = localStorage.getItem("myai-history");
  if (saved) history = JSON.parse(saved);
} catch {}

baseUrlInput.value = baseUrl;
systemPromptInput.value = systemPrompt;

function saveHistory() {
  try {
    localStorage.setItem("myai-history", JSON.stringify(history));
  } catch {}
}

function hideEmpty() {
  if (emptyState) emptyState.style.display = "none";
}

function addMessage(role, content) {
  hideEmpty();
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

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = type;
}

function setUIReady(ready) {
  inputEl.disabled = !ready;
  sendBtn.disabled = !ready;
  modelSelect.disabled = !ready;
  if (ready) inputEl.focus();
}

async function fetchModels() {
  if (!baseUrl) return;
  try {
    const res = await fetch(`${baseUrl}/api/tags`);
    if (!res.ok) throw new Error("Cannot reach Ollama");
    const data = await res.json();
    modelSelect.innerHTML = "";
    if (data.models && data.models.length) {
      data.models.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.name;
        opt.textContent = m.name;
        modelSelect.appendChild(opt);
      });
      setStatus("Ready", "status-ready");
      connectionInfo.textContent = baseUrl.replace("http://", "");
      setUIReady(true);

      // Restore history
      if (history.length) {
        chatEl.innerHTML = "";
        history.forEach((m) => addMessage(m.role, m.content));
      }
    } else {
      modelSelect.innerHTML = "<option>No models found</option>";
      setStatus("No models", "status-error");
    }
  } catch (err) {
    setStatus("Connection failed", "status-error");
    connectionInfo.textContent = "Not connected";
    setUIReady(false);
    console.error(err);
  }
}

async function send() {
  const text = inputEl.value.trim();
  if (!text || isGenerating || !baseUrl) return;

  const model = modelSelect.value;
  if (!model) {
    addMessage("system", "No model selected.");
    return;
  }

  inputEl.value = "";
  inputEl.style.height = "auto";
  addMessage("user", text);
  history.push({ role: "user", content: text });
  saveHistory();

  isGenerating = true;
  setUIReady(false);
  setStatus("Thinking…");

  const assistantDiv = addMessage("assistant", "…");
  let fullReply = "";

  // Build messages with system prompt
  const messages = [];
  if (systemPrompt.trim()) {
    messages.push({ role: "system", content: systemPrompt.trim() });
  }
  history.forEach((m) => messages.push({ role: m.role, content: m.content }));

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!res.ok) throw new Error("Request failed");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((l) => l.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message && json.message.content) {
            fullReply += json.message.content;
            assistantDiv.textContent = fullReply;
            chatEl.scrollTop = chatEl.scrollHeight;
          }
        } catch {}
      }
    }

    // Add copy button
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
    setStatus("Ready", "status-ready");
  } catch (err) {
    assistantDiv.textContent = "Error: could not reach the model.";
    setStatus("Error", "status-error");
    console.error(err);
  }

  isGenerating = false;
  setUIReady(true);
}

// Events
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 130) + "px";
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
  if (emptyState) {
    emptyState.style.display = "block";
    chatEl.appendChild(emptyState);
  }
});

settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.toggle("open");
});

closeSettingsBtn.addEventListener("click", () => {
  settingsPanel.classList.remove("open");
});

saveSettingsBtn.addEventListener("click", () => {
  baseUrl = baseUrlInput.value.trim().replace(/\/$/, "");
  systemPrompt = systemPromptInput.value;

  localStorage.setItem("myai-baseurl", baseUrl);
  localStorage.setItem("myai-system", systemPrompt);

  settingsPanel.classList.remove("open");
  setStatus("Connecting…");
  fetchModels();
});

// Auto-connect if URL already saved
if (baseUrl) {
  fetchModels();
}
