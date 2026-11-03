(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE = { chats: "javelin_chats_v1", current: "javelin_current_v1", key: "javelin_gemini_key_v1", model: "javelin_model_v1", theme: "javelin_theme_v1", language: "javelin_language_v1" };
  const SYSTEM_IDENTITY = `You are J.A.V.E.L.I.N., a personal advanced AI assistant with a calm, professional, friendly, logical, futuristic personality. Your official full form is exactly "JEESHAN'S ADVANCED VIRTUAL ENGINE FOR LOGIC, INTELLIGENCE & NAVIGATION". Your founder, creator, developer, and owner is Jeeshan Ahmad. If asked who created/founded/developed/owns you, answer clearly: "My founder and creator is Jeeshan Ahmad." If asked for your full name or full form, answer: "J.A.V.E.L.I.N. stands for JEESHAN'S ADVANCED VIRTUAL ENGINE FOR LOGIC, INTELLIGENCE & NAVIGATION." Never invent another founder or change the official full form. You specialize in HTML, CSS, JavaScript, React, full-stack development, APIs, databases, debugging, software architecture, web apps, education, general knowledge, project planning, and productivity. Explain accurately and clearly, in steps when useful. Detect the user's language and respond in the same language: English, Hindi, or Hinglish (natural Hindi written in Latin script mixed with English). Follow a manual language preference if one is specified. Do not claim to have performed actions you did not perform.`;
  const $sidebar = $("#sidebar"), $backdrop = $("#sidebarBackdrop"), $history = $("#historyList"), $messages = $("#messages"), $welcome = $("#welcomeScreen"), $input = $("#messageInput"), $send = $("#sendBtn"), $stop = $("#stopBtn"), $scroll = $("#chatScroll"), $dialog = $("#settingsDialog");
  let chats = loadJSON(STORAGE.chats, []), currentId = localStorage.getItem(STORAGE.current), controller = null, isGenerating = false, activeMessageId = null;

  const uuid = () => (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now = () => new Date().toISOString();
  function loadJSON(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } }
  function persist() { try { localStorage.setItem(STORAGE.chats, JSON.stringify(chats)); if (currentId) localStorage.setItem(STORAGE.current, currentId); else localStorage.removeItem(STORAGE.current); } catch { toast("Storage is full. Consider deleting older conversations.", true); } }
  function currentChat() { return chats.find(c => c.id === currentId) || null; }
  function createChat() { const c = { id: uuid(), title: "New conversation", createdAt: now(), updatedAt: now(), messages: [] }; chats.unshift(c); currentId = c.id; persist(); renderHistory(); renderChat(); closeSidebar(); return c; }
  function titleFrom(text) { const clean = text.replace(/\s+/g, " ").trim(); return clean.length > 36 ? clean.slice(0, 35).trimEnd() + "…" : (clean || "New conversation"); }
  function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
  function inlineMarkdown(text) {
    let out = escapeHTML(text);
    out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return out;
  }
  function renderMarkdown(raw) {
    const source = String(raw || "").replace(/\r\n/g, "\n");
    const chunks = source.split(/```/);
    let html = "";
    chunks.forEach((chunk, index) => {
      if (index % 2 === 1) {
        const firstNewline = chunk.indexOf("\n");
        const lang = (firstNewline < 0 ? "" : chunk.slice(0, firstNewline)).trim().replace(/[^\w+#.-]/g, "").slice(0, 20) || "code";
        const code = firstNewline < 0 ? chunk : chunk.slice(firstNewline + 1);
        html += `<div class="code-wrap"><div class="code-head"><span>${escapeHTML(lang)}</span><button class="copy-code" type="button" data-copy-code="${encodeURIComponent(code)}">Copy code</button></div><pre><code>${escapeHTML(code)}</code></pre></div>`;
        return;
      }
      const lines = chunk.split("\n");
      let paragraph = [], list = null;
      const flushP = () => { if (paragraph.length) { html += `<p>${paragraph.map(inlineMarkdown).join("<br>")}</p>`; paragraph = []; } };
      const flushList = () => { if (list) { html += `<${list.tag}>${list.items.map(x => `<li>${inlineMarkdown(x)}</li>`).join("")}</${list.tag}>`; list = null; } };
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) { flushP(); flushList(); continue; }
        const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
        const bullet = trimmed.match(/^[-*+]\s+(.+)$/);
        const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
        if (heading) { flushP(); flushList(); const level = heading[1].length; html += `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`; }
        else if (bullet || numbered) { flushP(); const tag = bullet ? "ul" : "ol"; if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; } list.items.push((bullet || numbered)[1]); }
        else if (trimmed.startsWith("&gt; ") || trimmed.startsWith("> ")) { flushP(); flushList(); html += `<blockquote>${inlineMarkdown(trimmed.replace(/^(&gt;|>)\s?/, ""))}</blockquote>`; }
        else { flushList(); paragraph.push(trimmed); }
      }
      flushP(); flushList();
    });
    return html || "<p></p>";
  }
  function renderHistory(filter = "") {
    const q = filter.trim().toLowerCase();
    const list = chats.filter(c => !q || c.title.toLowerCase().includes(q) || c.messages.some(m => m.text.toLowerCase().includes(q)));
    if (!list.length) { $history.innerHTML = `<div class="history-empty">${q ? "No matching conversations." : "Your conversations will appear here."}</div>`; return; }
    $history.innerHTML = list.map(c => `<div class="history-item ${c.id === currentId ? "active" : ""}" data-chat-id="${c.id}" tabindex="0" role="button" aria-label="Open ${escapeHTML(c.title)}"><span class="history-icon">◷</span><span class="history-title">${escapeHTML(c.title)}</span><button class="history-menu" type="button" data-chat-menu="${c.id}" aria-label="Conversation options">···</button></div>`).join("");
  }
  function renderChat() {
    const c = currentChat();
    $("#topChatTitle").textContent = c?.title || "New conversation";
    $welcome.hidden = !!(c && c.messages.length);
    $messages.innerHTML = "";
    if (c) c.messages.forEach((m, i) => appendMessage(m, i, false));
    renderHistory($("#chatSearch").value);
    requestAnimationFrame(() => { $scroll.scrollTop = $scroll.scrollHeight; checkScroll(); });
  }
  function appendMessage(message, index, save = true) {
    const row = document.createElement("article");
    row.className = `message-row ${message.role === "user" ? "user-row" : "assistant-row"}`;
    row.dataset.messageId = message.id;
    if (message.role === "user") {
      row.innerHTML = `<div class="message-content user-bubble">${escapeHTML(message.text).replace(/\n/g, "<br>")}</div>`;
    } else {
      row.innerHTML = `<img class="message-avatar" src="assets/javelin-avatar.png" alt="J.A.V.E.L.I.N. avatar"><div class="message-content"><div class="assistant-head"><strong>J.A.V.E.L.I.N.</strong><span>${formatTime(message.createdAt)}</span></div><div class="message-body">${message.pending ? '<div class="typing-indicator"><i></i><i></i><i></i></div>' : message.error ? `<div class="message-error">${escapeHTML(message.text)}</div>` : renderMarkdown(message.text)}</div><div class="message-actions">${message.pending ? "" : `<button data-action="copy" data-id="${message.id}">▢ Copy</button>${message.error ? `<button data-action="retry" data-id="${message.id}">↻ Retry</button>` : `<button data-action="regenerate" data-id="${message.id}">↻ Regenerate</button>`}`}</div></div>`;
    }
    $messages.appendChild(row);
    if (save) requestAnimationFrame(() => { $scroll.scrollTop = $scroll.scrollHeight; });
    return row;
  }
  function formatTime(value) { try { return new Date(value || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } }
  function updateChatAfterMessage() { const c = currentChat(); if (!c) return; c.updatedAt = now(); persist(); renderHistory($("#chatSearch").value); $("#topChatTitle").textContent = c.title; }
  function setConnection(connected) {
    $("#sidebarStatusText").textContent = connected ? "Connected to Gemini" : "Not connected";
    $("#sidebarStatusOrb").classList.toggle("connected", connected);
    $("#connectionPill").querySelector(".status-orb").classList.toggle("connected", connected);
    $("#connectionLabel").textContent = connected ? "Connected" : "Offline";
    $("#settingsStatus").textContent = connected ? "KEY SAVED" : "DISCONNECTED";
    $("#settingsStatus").classList.toggle("connected", connected);
  }
  function apiKey() { return localStorage.getItem(STORAGE.key) || ""; }
  function modelName() { return localStorage.getItem(STORAGE.model) || "gemini-3.8-flash"; }
  function updateModelUI() { 
    const model = modelName(); 
    const select = $("#modelSelect");
    if (select) select.value = model; 
    const label = model.replace(/^gemini-/i, "Gemini ").replace(/-/g, " ").replace(/\bflash\b/i, "Flash").replace(/\bpro\b/i, "Pro").replace(/\blite\b/i, "Lite").replace(/\bargon\b/i, "Argon");
    const top = $("#topModelLabel");
    if (top) top.textContent = label;
  }
  function updateKeyUI() { $("#apiKeyInput").value = apiKey(); setConnection(!!apiKey()); }
  function showSettings(tab = "apiPanel") { $dialog.showModal(); activateTab(tab); }
  function activateTab(id) { $$(".settings-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === id)); $$(".settings-panel").forEach(p => p.classList.toggle("active", p.id === id)); }
  function toast(message, error = false) { const node = document.createElement("div"); node.className = `toast ${error ? "error" : ""}`; node.textContent = message; $("#toastRegion").appendChild(node); setTimeout(() => node.remove(), 3000); }
  function openSidebar() { $sidebar.classList.add("open"); $backdrop.classList.add("visible"); }
  function closeSidebar() { $sidebar.classList.remove("open"); $backdrop.classList.remove("visible"); }
  function setGenerating(value) { isGenerating = value; $send.hidden = value; $stop.hidden = !value; $input.disabled = value; if (value) $input.blur(); else $input.focus(); }
  function buildContents(messages) {
    return messages.filter(m => !m.error && !m.pending && (m.role === "user" || m.role === "assistant")).map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] }));
  }
  function languageInstruction() {
    const language = localStorage.getItem(STORAGE.language) || "auto";
    return ({ en: "Respond only in natural English unless the user explicitly requests a translation.", hi: "Respond in natural, easy-to-understand Hindi (Devanagari script), unless the user explicitly requests another language.", hinglish: "Respond in natural Hinglish: Hindi written in Latin script mixed with common English technical terms.", auto: "Automatically detect the language of the latest user message. Reply in that same language: English, Hindi in Devanagari, or natural Hinglish when the user writes Hindi in Latin script or mixes Hindi and English." })[language];
  }
  async function askGemini(chat, assistantMessage) {
    const key = apiKey();
    if (!key) {
      assistantMessage.pending = false; assistantMessage.error = true;
      assistantMessage.text = "Gemini isn't connected yet. Open Settings → API & Model, add your Google Gemini API key, and choose Save & connect. No fake response has been generated.";
      persist(); renderChat(); setGenerating(false); showSettings("apiPanel"); return;
    }
    const contents = buildContents(chat.messages.filter(m => m.id !== assistantMessage.id));
    const body = {
      system_instruction: { parts: [{ text: `${SYSTEM_IDENTITY}\n\nLANGUAGE INSTRUCTION: ${languageInstruction()}\n\nConversation title: ${chat.title}. Treat the content above as conversation context. Keep responses useful, clear, and appropriately concise. Use Markdown for headings, lists, and fenced code blocks when helpful.` }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
    };
    controller = new AbortController();
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName())}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const apiMessage = data?.error?.message || `HTTP ${response.status}`;
        let friendly = apiMessage;
        const status = response.status;
        if (status === 401 || status === 403) {
          friendly = `Invalid or unauthorized API key. Please check your Google Gemini API key in Settings. Details: ${apiMessage}`;
        } else if (status === 400) {
          if (apiMessage.toLowerCase().includes("model") || apiMessage.toLowerCase().includes("not found")) {
            friendly = `Selected model is not available or not supported for your key. Try a different model in Settings. Details: ${apiMessage}`;
          } else {
            friendly = `Bad request to Gemini. Check your input and model selection. Details: ${apiMessage}`;
          }
        } else if (status === 429) {
          friendly = `Gemini is temporarily overloaded or rate limit reached. Please wait a moment and retry. Details: ${apiMessage}`;
        } else if (status >= 500) {
          friendly = `Temporary Gemini service error or overload. Please retry shortly. Details: ${apiMessage}`;
        } else {
          friendly = `Gemini API error (${status}): ${apiMessage}`;
        }
        throw new Error(friendly);
      }
      const text = (data.candidates || []).flatMap(c => c.content?.parts || []).map(p => p.text || "").join("").trim();
      if (!text) throw new Error("Gemini returned no text. The response may have been blocked or the model may not have produced a text candidate.");
      assistantMessage.text = text; assistantMessage.pending = false; assistantMessage.error = false;
      updateChatAfterMessage(); renderChat();
    } catch (error) {
      if (error.name === "AbortError") {
        assistantMessage.pending = false;
        assistantMessage.text = assistantMessage.text || "Generation stopped.";
        assistantMessage.stopped = true;
      } else {
        assistantMessage.pending = false; assistantMessage.error = true;
        assistantMessage.text = error.message || "A network error occurred. Check your internet connection and try again.";
      }
      persist(); renderChat();
    } finally {
      controller = null; setGenerating(false); updateChatAfterMessage();
    }
  }
  async function sendMessage(text = $input.value) {
    const value = String(text).trim();
    if (!value || isGenerating) return;
    let chat = currentChat();
    if (!chat) chat = createChat();
    if (!chat.messages.length || chat.title === "New conversation") chat.title = titleFrom(value);
    const userMessage = { id: uuid(), role: "user", text: value, createdAt: now() };
    chat.messages.push(userMessage);
    const assistantMessage = { id: uuid(), role: "assistant", text: "", createdAt: now(), pending: true };
    chat.messages.push(assistantMessage);
    $input.value = ""; resizeInput(); $welcome.hidden = true;
    persist(); renderChat(); setGenerating(true);
    await askGemini(chat, assistantMessage);
  }
  function stopGeneration() { if (controller) { controller.abort(); toast("Generation stopped."); } }
  async function connectKey() {
    const key = $("#apiKeyInput").value.trim();
    const result = $("#apiResult"); result.className = "api-result"; result.textContent = "";
    if (!key) { result.className += " error"; result.textContent = "Paste your Gemini API key first."; return; }
    if (key.length < 20) { 
      result.className += " error"; 
      result.textContent = "API key looks too short. Please paste the full key from Google AI Studio."; 
      return; 
    }
    const isOldKey = key.startsWith("AIza");
    const isNewAuthKey = key.startsWith("AQ.");
    if (!isOldKey && !isNewAuthKey) { 
      result.className += " error"; 
      result.textContent = "This doesn't look like a Gemini API key. Valid keys start with 'AIza' (older) or 'AQ.' (current auth keys from AI Studio)."; 
      return; 
    }
    const model = $("#modelSelect").value;
    localStorage.setItem(STORAGE.key, key); localStorage.setItem(STORAGE.model, model);
    updateModelUI(); setConnection(true);
    result.className += " success"; result.textContent = "Key saved in this browser. Testing connection…";
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply with exactly: JAVELIN connection test successful." }] }], generationConfig: { maxOutputTokens: 30, temperature: 0 } })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const apiMessage = data?.error?.message || `HTTP ${res.status}`;
        let friendly = apiMessage;
        if (res.status === 401 || res.status === 403) friendly = `Invalid API key or insufficient permissions. ${apiMessage}`;
        else if (res.status === 429) friendly = `Rate limit or temporary overload during test. Try again soon. ${apiMessage}`;
        else if (res.status >= 500) friendly = `Temporary service error. Retry the connection test. ${apiMessage}`;
        else if (res.status === 400 && apiMessage.toLowerCase().includes("model")) friendly = `Model not available for this key. Choose another model. ${apiMessage}`;
        throw new Error(friendly);
      }
      result.textContent = "Connection test successful. Gemini returned a response; you are ready to chat.";
      result.className = "api-result success"; setConnection(true); toast("Gemini connected successfully.");
    } catch (err) {
      result.className = "api-result error";
      result.textContent = `Key saved, but connection test failed: ${err.message}. Check the key, model access, API restrictions, and network.`;
      setConnection(false); toast("Gemini connection test failed.", true);
    }
  }
  function disconnectKey() { localStorage.removeItem(STORAGE.key); $("#apiKeyInput").value = ""; $("#apiResult").className = "api-result"; $("#apiResult").textContent = "API key removed from this browser."; setConnection(false); toast("Gemini disconnected."); }
  function resizeInput() { 
    $input.style.height = "auto"; 
    $input.style.height = `${Math.min($input.scrollHeight, 180)}px`; 
    updateCharCount();
  }
  function updateCharCount() {
    const count = $input.value.length;
    const el = $("#charCount");
    if (el) el.textContent = count > 0 ? `${count} chars` : "";
  }
  function deleteChat(id) {
    const chat = chats.find(c => c.id === id); if (!chat) return;
    if (!confirm(`Delete "${chat.title}"? This cannot be undone.`)) return;
    chats = chats.filter(c => c.id !== id);
    if (currentId === id) { currentId = chats[0]?.id || null; if (!currentId) createChat(); }
    persist(); renderHistory(); renderChat(); toast("Conversation deleted.");
  }
  function renameChat(id) {
    const chat = chats.find(c => c.id === id); if (!chat) return;
    const name = prompt("Rename conversation:", chat.title);
    if (name === null) return;
    if (!name.trim()) { toast("A conversation title cannot be empty.", true); return; }
    chat.title = name.trim().slice(0, 80); chat.updatedAt = now(); persist(); renderHistory($("#chatSearch").value); if (id === currentId) $("#topChatTitle").textContent = chat.title; toast("Conversation renamed.");
  }
  function editUserMessage(messageId) {
    const chat = currentChat(); if (!chat) return;
    const idx = chat.messages.findIndex(m => m.id === messageId && m.role === "user"); if (idx < 0) return;
    const old = chat.messages[idx];
    const replacement = prompt("Edit your message. It will be resent to Gemini:", old.text);
    if (replacement === null || !replacement.trim()) return;
    chat.messages = chat.messages.slice(0, idx);
    $input.value = replacement.trim(); resizeInput(); persist(); renderChat(); sendMessage(replacement.trim());
  }
  async function regenerate(messageId) {
    if (isGenerating) return;
    const chat = currentChat(); if (!chat) return;
    let idx = chat.messages.findIndex(m => m.id === messageId);
    if (idx < 0) return;
    if (chat.messages[idx].role === "assistant") {
      const lastUser = chat.messages.slice(0, idx).map((m, i) => ({m, i})).reverse().find(x => x.m.role === "user");
      if (!lastUser) return;
      chat.messages = chat.messages.slice(0, lastUser.i + 1);
    } else {
      chat.messages = chat.messages.slice(0, idx + 1);
    }
    const assistant = { id: uuid(), role: "assistant", text: "", createdAt: now(), pending: true };
    chat.messages.push(assistant); persist(); renderChat(); setGenerating(true); await askGemini(chat, assistant);
  }
  function clearAllChats() {
    if (!confirm("Delete ALL saved conversations from this browser? This cannot be undone.")) return;
    chats = []; currentId = null; persist(); createChat(); renderChat(); toast("All conversations cleared.");
  }

  $("#newChatBtn").addEventListener("click", createChat);
  $("#openSidebar").addEventListener("click", openSidebar);
  $("#closeSidebar").addEventListener("click", closeSidebar);
  $backdrop.addEventListener("click", closeSidebar);
  $("#settingsBtn").addEventListener("click", () => showSettings("preferencesPanel"));
  $("#quickApiBtn").addEventListener("click", () => showSettings("apiPanel"));
  $("#closeSettings").addEventListener("click", () => $dialog.close());
  $("#doneSettings").addEventListener("click", () => $dialog.close());
  $("#connectBtn").addEventListener("click", connectKey);
  $("#disconnectBtn").addEventListener("click", disconnectKey);
  $("#toggleKeyBtn").addEventListener("click", () => { const input = $("#apiKeyInput"); input.type = input.type === "password" ? "text" : "password"; $("#toggleKeyBtn").textContent = input.type === "password" ? "Show" : "Hide"; });
  $("#modelSelect").addEventListener("change", e => { localStorage.setItem(STORAGE.model, e.target.value); updateModelUI(); });
  $("#topModelBtn").addEventListener("click", () => showSettings("apiPanel"));
  $("#themeSelect").addEventListener("change", e => { localStorage.setItem(STORAGE.theme, e.target.value); document.body.classList.toggle("light", e.target.value === "light"); });
  $("#languageSelect").addEventListener("change", e => localStorage.setItem(STORAGE.language, e.target.value));
  $("#clearAllBtn").addEventListener("click", clearAllChats);
  $$(".settings-tab").forEach(b => b.addEventListener("click", () => activateTab(b.dataset.tab)));
  $$(".prompt-card").forEach(b => b.addEventListener("click", () => { $input.value = b.dataset.prompt; resizeInput(); $input.focus(); }));
  $send.addEventListener("click", () => sendMessage());
  $stop.addEventListener("click", stopGeneration);
  $input.addEventListener("input", resizeInput);
  $input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
  $("#chatSearch").addEventListener("input", e => renderHistory(e.target.value));
  $history.addEventListener("click", e => {
    const menu = e.target.closest("[data-chat-menu]");
    if (menu) { e.stopPropagation(); const id = menu.dataset.chatMenu; const action = prompt("Conversation options: type R to rename or D to delete.", "R"); if (action?.toLowerCase() === "r") renameChat(id); else if (action?.toLowerCase() === "d") deleteChat(id); return; }
    const item = e.target.closest("[data-chat-id]"); if (!item) return; currentId = item.dataset.chatId; persist(); renderChat(); closeSidebar();
  });
  $history.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-chat-id]")) { e.preventDefault(); currentId = e.target.dataset.chatId; persist(); renderChat(); closeSidebar(); } });
  $messages.addEventListener("click", async e => {
    const copyCode = e.target.closest("[data-copy-code]");
    if (copyCode) { try { await navigator.clipboard.writeText(decodeURIComponent(copyCode.dataset.copyCode)); toast("Code copied."); } catch { toast("Clipboard access failed.", true); } return; }
    const button = e.target.closest("[data-action]"); if (!button) return;
    const id = button.dataset.id, action = button.dataset.action, chat = currentChat(); if (!chat) return;
    const message = chat.messages.find(m => m.id === id); if (!message) return;
    if (action === "copy") { try { await navigator.clipboard.writeText(message.text); toast("Response copied."); } catch { toast("Clipboard access failed.", true); } }
    if (action === "regenerate" || action === "retry") await regenerate(id);
  });
  $messages.addEventListener("dblclick", e => { const row = e.target.closest(".user-row"); if (row) editUserMessage(row.dataset.messageId); });
  // Microphone / Speech-to-text
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => {
      isListening = true;
      $("#micBtn").classList.add("listening");
      $("#micBtn").setAttribute("aria-label", "Listening… click to stop");
      toast("Listening… speak now");
    };
    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      // Append final to existing text; show interim temporarily
      const base = $input.value.replace(/\s*\[listening…\]$/, "");
      $input.value = (base + (base && final ? " " : "") + final + (interim ? " [listening…]" : "")).trimStart();
      resizeInput();
    };
    recognition.onerror = (event) => {
      isListening = false;
      $("#micBtn").classList.remove("listening");
      $("#micBtn").setAttribute("aria-label", "Start voice input");
      if (event.error !== "no-speech" && event.error !== "aborted") {
        toast(`Voice input error: ${event.error}`, true);
      }
      // Clean interim marker
      $input.value = $input.value.replace(/\s*\[listening…\]$/, "");
      resizeInput();
    };
    recognition.onend = () => {
      isListening = false;
      $("#micBtn").classList.remove("listening");
      $("#micBtn").setAttribute("aria-label", "Start voice input");
      $input.value = $input.value.replace(/\s*\[listening…\]$/, "");
      resizeInput();
    };
  } else {
    $("#micBtn").style.display = "none";
  }
  $("#micBtn").addEventListener("click", () => {
    if (!recognition) { toast("Voice input is not supported in this browser.", true); return; }
    if (isListening) {
      recognition.stop();
    } else {
      try { recognition.start(); } catch (e) { toast("Could not start microphone.", true); }
    }
  });

  function checkScroll() {
    const btn = $("#scrollBottomBtn");
    if (!btn) return;
    const atBottom = $scroll.scrollHeight - $scroll.scrollTop - $scroll.clientHeight < 80;
    btn.hidden = atBottom;
  }
  $scroll.addEventListener("scroll", checkScroll);
  $("#scrollBottomBtn").addEventListener("click", () => {
    $scroll.scrollTop = $scroll.scrollHeight;
    $("#scrollBottomBtn").hidden = true;
  });

  document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); createChat(); $input.focus(); } if (e.key === "Escape") closeSidebar(); });
  $dialog.addEventListener("click", e => { if (e.target === $dialog) $dialog.close(); });

  // Initialize persisted preferences and history.
  document.body.classList.toggle("light", (localStorage.getItem(STORAGE.theme) || "dark") === "light");
  $("#themeSelect").value = localStorage.getItem(STORAGE.theme) || "dark";
  $("#languageSelect").value = localStorage.getItem(STORAGE.language) || "auto";
  updateModelUI(); updateKeyUI();
  if (!chats.length) createChat();
  else {
    if (!currentId || !chats.some(c => c.id === currentId)) currentId = chats[0].id;
    persist(); renderChat();
  }
  renderHistory();
})();