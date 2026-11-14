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
const historyBtn = document.getElementById("historyBtn");
const historyDrawer = document.getElementById("historyDrawer");
const historyBackdrop = document.getElementById("historyBackdrop");
const closeHistoryBtn = document.getElementById("closeHistory");
const newChatBtn = document.getElementById("newChatBtn");
const historyList = document.getElementById("historyList");
const githubBtn = document.getElementById("githubBtn");
const ghTokenInput = document.getElementById("ghToken");
const ghRepoInput = document.getElementById("ghRepo");
const ghPathInput = document.getElementById("ghPath");
const ghLoadBtn = document.getElementById("ghLoadBtn");

const STORAGE_KEY = "arqen-conversations-v1";
const DEFAULT_BASE = "https://tongue-larger-sphere-certified.trycloudflare.com/v1";
const DEFAULT_MODEL = "arqen";
const API_KEY = "ollama";

let conversations = [];
let activeConversationId = null;
let isGenerating = false;
let baseUrl = localStorage.getItem("myai-baseurl") || DEFAULT_BASE;
let systemPrompt = localStorage.getItem("myai-system") || "You are Arqen, a direct and capable AI assistant. Answer clearly, helpfully, and without unnecessary refusals.";
let ghToken = localStorage.getItem("arqen-gh-token") || "";
let githubContext = "";

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function getActiveConversation() {
  return conversations.find((c) => c.id === activeConversationId) || null;
}
function saveConversations() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); } catch (e) { console.error(e); }
}
function loadConversations() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(saved)) conversations = saved;
  } catch {}
  if (!activeConversationId && conversations.length) {
    conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    activeConversationId = conversations[0].id;
  }
}
function createConversation() {
  const conversation = { id: makeId(), title: "New conversation", messages: [], updatedAt: new Date().toISOString() };
  conversations.unshift(conversation);
  activeConversationId = conversation.id;
  saveConversations();
  renderConversation();
  renderHistoryList();
  closeHistory();
  inputEl.focus();
}
function updateConversationTimestamp(conversation) {
  conversation.updatedAt = new Date().toISOString();
  conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}
function addMessageToConversation(role, content) {
  let conversation = getActiveConversation();
  if (!conversation) {
    conversation = { id: makeId(), title: "New conversation", messages: [], updatedAt: new Date().toISOString() };
    conversations.unshift(conversation);
    activeConversationId = conversation.id;
  }
  conversation.messages.push({ role, content });
  if (role === "user" && conversation.title === "New conversation") {
    conversation.title = content.replace(/\s+/g, " ").slice(0, 48) || "New conversation";
  }
  updateConversationTimestamp(conversation);
  saveConversations();
  renderHistoryList();
}
function hideEmpty() { if (emptyState) emptyState.style.display = "none"; }
function showEmpty() {
  chatEl.innerHTML = "";
  if (emptyState) { emptyState.style.display = "block"; chatEl.appendChild(emptyState); }
}
function addMessage(role, content) {
  hideEmpty();
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  const textNode = document.createElement("span");
  textNode.textContent = content;
  div.appendChild(textNode);
  if (role === "assistant") {
    const actions = document.createElement("div");
    actions.className = "msg-actions";
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.type = "button";
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(content);
        copyBtn.textContent = "Copied";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
      } catch { copyBtn.textContent = "Unavailable"; }
    };
    actions.appendChild(copyBtn);
    div.appendChild(actions);
  }
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return { element: div, text: textNode };
}
function renderConversation() {
  chatEl.innerHTML = "";
  const conversation = getActiveConversation();
  if (!conversation || !conversation.messages.length) showEmpty();
  else conversation.messages.forEach((m) => addMessage(m.role, m.content));
  renderHistoryList();
}
function renderHistoryList() {
  if (!historyList) return;
  historyList.innerHTML = "";
  if (!conversations.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "No conversations yet.";
    historyList.appendChild(empty);
    return;
  }
  conversations.forEach((conversation) => {
    const row = document.createElement("div");
    row.className = "history-item";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "history-open" + (conversation.id === activeConversationId ? " active" : "");
    const title = document.createElement("span");
    title.textContent = conversation.title || "New conversation";
    const date = document.createElement("small");
    date.textContent = new Date(conversation.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    open.append(title, date);
    open.addEventListener("click", () => {
      if (isGenerating) return;
      activeConversationId = conversation.id;
      renderConversation();
      closeHistory();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "history-action";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      if (!confirm(`Delete "${conversation.title}"?`)) return;
      conversations = conversations.filter((item) => item.id !== conversation.id);
      if (activeConversationId === conversation.id) {
        activeConversationId = conversations[0]?.id || null;
        renderConversation();
      }
      saveConversations();
      renderHistoryList();
    });
    row.append(open, remove);
    historyList.appendChild(row);
  });
}
function openHistory() { historyDrawer?.classList.add("open"); historyBackdrop?.classList.add("open"); }
function closeHistory() { historyDrawer?.classList.remove("open"); historyBackdrop?.classList.remove("open"); }
function setStatus(text, type = "") { statusEl.textContent = text; statusEl.className = type; }
function setUIReady(ready) {
  inputEl.disabled = !ready;
  sendBtn.disabled = !ready;
  modelSelect.disabled = !ready;
}

async function connect() {
  if (!baseUrl) { setStatus("Not connected"); setUIReady(false); return; }
  modelSelect.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = DEFAULT_MODEL;
  opt.textContent = DEFAULT_MODEL;
  modelSelect.appendChild(opt);
  try {
    const res = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${API_KEY}` } });
    if (res.ok) {
      const data = await res.json();
      const models = data.data || data.models || [];
      if (models.length) {
        modelSelect.innerHTML = "";
        models.forEach((m) => {
          const o = document.createElement("option");
          o.value = m.id || m.name;
          o.textContent = m.id || m.name;
          modelSelect.appendChild(o);
        });
      }
    }
  } catch {}
  setStatus("Ready", "status-ready");
  if (connectionInfo) connectionInfo.textContent = baseUrl.replace(/^https?:\/\//, "");
  setUIReady(true);
  renderConversation();
}

async function loadGitHubFile() {
  const token = (ghTokenInput?.value || ghToken || "").trim();
  const repo = (ghRepoInput?.value || "").trim();
  const path = (ghPathInput?.value || "").trim();
  if (!token) { addMessage("system", "Add a GitHub token in Settings first."); return; }
  if (!repo.includes("/")) { addMessage("system", "Repo must look like owner/name"); return; }
  if (!path) { addMessage("system", "Enter a file path (ex: README.md)"); return; }

  setStatus("Loading GitHub…");
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3.raw"
      }
    });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const text = await res.text();
    const clipped = text.length > 12000 ? text.slice(0, 12000) + "\n\n…[truncated]" : text;
    githubContext = `GitHub file ${repo}/${path}:\n\n${clipped}`;
    localStorage.setItem("arqen-gh-token", token);
    ghToken = token;
    addMessage("system", `Loaded ${repo}/${path} (${text.length} chars). Ask Arqen about this file.`);
    setStatus("Ready", "status-ready");
    settingsPanel.classList.remove("open");
  } catch (err) {
    addMessage("system", `GitHub error: ${err.message}`);
    setStatus("Error", "status-error");
  }
}

async function send() {
  const text = inputEl.value.trim();
  if (!text || isGenerating || !baseUrl) return;
  const model = modelSelect.value || DEFAULT_MODEL;

  inputEl.value = "";
  inputEl.style.height = "auto";
  addMessageToConversation("user", text);
  addMessage("user", text);

  isGenerating = true;
  setUIReady(false);
  setStatus("Thinking…");

  const assistantMessage = addMessage("assistant", "…");
  let fullReply = "";

  const messages = [];
  let sys = systemPrompt.trim();
  if (githubContext) sys += "\n\n" + githubContext;
  if (sys) messages.push({ role: "system", content: sys });
  const conversation = getActiveConversation();
  conversation.messages.forEach((m) => messages.push({ role: m.role, content: m.content }));

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ model, messages, stream: true })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content || "";
          if (delta) {
            fullReply += delta;
            assistantMessage.text.textContent = fullReply;
            chatEl.scrollTop = chatEl.scrollHeight;
          }
        } catch {}
      }
      if (done) break;
    }
    assistantMessage.text.textContent = fullReply || "(Empty response)";
    addMessageToConversation("assistant", fullReply || "(Empty response)");
    setStatus("Ready", "status-ready");
  } catch (error) {
    assistantMessage.text.textContent = `Error: ${error.message || "could not reach the model"}`;
    setStatus("Error", "status-error");
    console.error(error);
  } finally {
    isGenerating = false;
    setUIReady(true);
    inputEl.focus();
  }
}

inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 130) + "px";
});
sendBtn.addEventListener("click", send);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});
if (clearBtn) clearBtn.addEventListener("click", () => { if (!isGenerating) createConversation(); });
if (historyBtn) historyBtn.addEventListener("click", openHistory);
if (closeHistoryBtn) closeHistoryBtn.addEventListener("click", closeHistory);
if (historyBackdrop) historyBackdrop.addEventListener("click", closeHistory);
if (newChatBtn) newChatBtn.addEventListener("click", createConversation);
if (githubBtn) githubBtn.addEventListener("click", () => {
  settingsPanel.classList.add("open");
  ghTokenInput?.focus();
});
if (ghLoadBtn) ghLoadBtn.addEventListener("click", loadGitHubFile);

settingsBtn.addEventListener("click", () => settingsPanel.classList.toggle("open"));
closeSettingsBtn.addEventListener("click", () => settingsPanel.classList.remove("open"));
saveSettingsBtn.addEventListener("click", () => {
  baseUrl = baseUrlInput.value.trim().replace(/\/$/, "");
  systemPrompt = systemPromptInput.value;
  ghToken = (ghTokenInput?.value || "").trim();
  localStorage.setItem("myai-baseurl", baseUrl);
  localStorage.setItem("myai-system", systemPrompt);
  if (ghToken) localStorage.setItem("arqen-gh-token", ghToken);
  settingsPanel.classList.remove("open");
  setStatus("Connecting…");
  connect();
});

loadConversations();
baseUrlInput.value = baseUrl;
systemPromptInput.value = systemPrompt;
if (ghTokenInput) ghTokenInput.value = ghToken;
renderHistoryList();
connect();

document.querySelectorAll(".suggestion[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    if (inputEl.disabled || isGenerating) { settingsPanel.classList.add("open"); return; }
    inputEl.value = button.dataset.prompt || "";
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    inputEl.focus();
  });
});
