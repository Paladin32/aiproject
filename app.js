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

const STORAGE_KEY = "arqen-conversations-v1";
let conversations = [];
let activeConversationId = null;
let isGenerating = false;
let baseUrl = localStorage.getItem("myai-baseurl") || "";
let systemPrompt = localStorage.getItem("myai-system") || "You are Arqen Era 1.1, an advanced general-purpose AI. Match the user's language, tone, and level of expertise. Be clear, useful, natural, and precise. Prioritize accuracy over confidence: never invent facts, sources, or results, and clearly say when you are unsure. Distinguish facts from assumptions. Understand the user's intent and answer directly. Keep answers concise by default, but explain complex topics step by step when useful. For coding, provide complete, maintainable solutions and never claim code was tested unless it was. For calculations, double-check your work. Adapt to the conversation and follow the user's instructions carefully.";

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getActiveConversation() {
  return conversations.find((conversation) => conversation.id === activeConversationId) || null;
}

function saveConversations() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error("Could not save conversations:", error);
    setStatus("Storage full", "status-error");
  }
}

function migrateOldHistory() {
  try {
    const old = JSON.parse(localStorage.getItem("myai-history") || "[]");
    if (Array.isArray(old) && old.length) {
      conversations = [{
        id: makeId(),
        title: old.find((message) => message.role === "user")?.content?.slice(0, 48) || "Previous conversation",
        messages: old,
        updatedAt: new Date().toISOString()
      }];
      activeConversationId = conversations[0].id;
      saveConversations();
    }
  } catch (error) {
    console.warn("Old history could not be migrated:", error);
  }
}

function loadConversations() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(saved)) conversations = saved;
    else migrateOldHistory();
  } catch {
    migrateOldHistory();
  }
  if (!activeConversationId && conversations.length) {
    conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    activeConversationId = conversations[0].id;
  }
}

function createConversation() {
  const conversation = {
    id: makeId(),
    title: "New conversation",
    messages: [],
    updatedAt: new Date().toISOString()
  };
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
    conversation = {
      id: makeId(),
      title: "New conversation",
      messages: [],
      updatedAt: new Date().toISOString()
    };
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

function hideEmpty() {
  if (emptyState) emptyState.style.display = "none";
}

function showEmpty() {
  chatEl.innerHTML = "";
  if (emptyState) {
    emptyState.style.display = "block";
    chatEl.appendChild(emptyState);
  }
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
  if (!conversation || !conversation.messages.length) {
    showEmpty();
  } else {
    conversation.messages.forEach((message) => addMessage(message.role, message.content));
  }
  renderHistoryList();
}

function renderHistoryList() {
  historyList.innerHTML = "";
  if (!conversations.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "No conversations yet. Start a chat and it will be saved here.";
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

    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "history-action";
    rename.textContent = "✎";
    rename.title = "Rename conversation";
    rename.setAttribute("aria-label", "Rename conversation");
    rename.addEventListener("click", () => {
      const next = prompt("Conversation name:", conversation.title || "");
      if (next && next.trim()) {
        conversation.title = next.trim().slice(0, 80);
        saveConversations();
        renderHistoryList();
      }
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "history-action";
    remove.textContent = "×";
    remove.title = "Delete conversation";
    remove.setAttribute("aria-label", "Delete conversation");
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

    row.append(open, rename, remove);
    historyList.appendChild(row);
  });
}

function openHistory() {
  historyDrawer.classList.add("open");
  historyBackdrop.classList.add("open");
  historyDrawer.setAttribute("aria-hidden", "false");
}
function closeHistory() {
  historyDrawer.classList.remove("open");
  historyBackdrop.classList.remove("open");
  historyDrawer.setAttribute("aria-hidden", "true");
}

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = type;
}
function setUIReady(ready) {
  inputEl.disabled = !ready;
  sendBtn.disabled = !ready;
  modelSelect.disabled = !ready;
}

async function fetchModels() {
  if (!baseUrl) return;
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) throw new Error("Cannot reach Ollama");
    const data = await response.json();
    modelSelect.innerHTML = "";
    if (data.models?.length) {
      data.models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.name;
        option.textContent = model.name;
        modelSelect.appendChild(option);
      });
      setStatus("Ready", "status-ready");
      connectionInfo.textContent = baseUrl.replace(/^https?:\/\//, "");
      setUIReady(true);
      renderConversation();
    } else {
      modelSelect.innerHTML = "<option value=\"\">No models found</option>";
      setStatus("No models", "status-error");
      setUIReady(false);
    }
  } catch (error) {
    setStatus("Connection failed", "status-error");
    connectionInfo.textContent = "Not connected";
    setUIReady(false);
    console.error(error);
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
  addMessageToConversation("user", text);
  addMessage("user", text);

  isGenerating = true;
  setUIReady(false);
  setStatus("Thinking…");
  const assistantMessage = addMessage("assistant", "…");
  let fullReply = "";
  const messages = [];
  if (systemPrompt.trim()) messages.push({ role: "system", content: systemPrompt.trim() });
  const conversation = getActiveConversation();
  conversation.messages.forEach((message) => messages.push({ role: message.role, content: message.content }));

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true })
    });
    if (!response.ok) throw new Error(`Model request failed (${response.status})`);
    if (!response.body) throw new Error("Streaming is not supported by this response");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const data = JSON.parse(line);
        if (data.message?.content) {
          fullReply += data.message.content;
          assistantMessage.text.textContent = fullReply;
          chatEl.scrollTop = chatEl.scrollHeight;
        }
      }
      if (done) break;
    }
    if (buffer.trim()) {
      const data = JSON.parse(buffer);
      if (data.message?.content) fullReply += data.message.content;
    }
    assistantMessage.text.textContent = fullReply || "(Empty response)";
    addMessageToConversation("assistant", fullReply || "(Empty response)");
    setStatus("Ready", "status-ready");
  } catch (error) {
    assistantMessage.text.textContent = `Error: ${error.message || "could not reach the model"}.`;
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
inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    send();
  }
});
clearBtn.addEventListener("click", () => {
  if (isGenerating) return;
  createConversation();
});
historyBtn.addEventListener("click", openHistory);
closeHistoryBtn.addEventListener("click", closeHistory);
historyBackdrop.addEventListener("click", closeHistory);
newChatBtn.addEventListener("click", createConversation);

settingsBtn.addEventListener("click", () => settingsPanel.classList.toggle("open"));
closeSettingsBtn.addEventListener("click", () => settingsPanel.classList.remove("open"));
saveSettingsBtn.addEventListener("click", () => {
  baseUrl = baseUrlInput.value.trim().replace(/\/$/, "");
  systemPrompt = systemPromptInput.value;
  localStorage.setItem("myai-baseurl", baseUrl);
  localStorage.setItem("myai-system", systemPrompt);
  settingsPanel.classList.remove("open");
  setStatus("Connecting…");
  fetchModels();
});

loadConversations();
baseUrlInput.value = baseUrl;
systemPromptInput.value = systemPrompt;
renderHistoryList();
if (baseUrl) fetchModels();
else renderConversation();


document.querySelectorAll(".suggestion[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    if (inputEl.disabled || isGenerating) {
      settingsPanel.classList.add("open");
      return;
    }
    inputEl.value = button.dataset.prompt || "";
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    inputEl.focus();
  });
});


// Google account session (served by the Arqen backend).
const googleAuthBtn = document.getElementById("googleAuthBtn");
const accountLabel = document.getElementById("accountLabel");

async function refreshGoogleAccount() {
  if (!googleAuthBtn) return;
  try {
    const response = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("Not signed in");
    const data = await response.json();
    if (!data.authenticated) throw new Error("Not signed in");
    googleAuthBtn.textContent = "Sign out";
    accountLabel.textContent = data.user.name || data.user.email;
    accountLabel.style.display = "block";
    googleAuthBtn.onclick = async () => {
      await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
      window.location.reload();
    };
  } catch {
    accountLabel.style.display = "none";
    googleAuthBtn.textContent = "Continue with Google";
    googleAuthBtn.onclick = () => { window.location.href = "/auth/google"; };
  }
}
refreshGoogleAccount();
