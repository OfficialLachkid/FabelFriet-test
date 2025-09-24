/* ====== CONFIG ====== */
const CHATBOT_CONFIG = {
  webhookUrl: "https://YOUR-N8N-HOST/webhook/your-endpoint",
  title: "Support Assistant",

  // RELATIEF T.O.V. index.html (niet chat.js)
  // Probeer "./Assets/ChatImage.png" of "/Assets/ChatImage.png"
  agentAvatar: "./Assets/chatboticon.png",

  // Optioneel: icoon voor de floating bubble (ipv inline SVG)
  bubbleIcon: null, // voorbeeld: "./Assets/chatboticon.png"

  headers: { /* optioneel extra headers */ },

  parseReply: (data) => {
    if (!data) return "Er ging iets mis. Probeer opnieuw.";
    if (typeof data === "string") return data;
    return data.reply || JSON.stringify(data);
  },

  identity: { site: location.hostname, path: location.pathname },
};
/* ===================== */

(function(){
  const qs = (s,p=document)=>p.querySelector(s);
  const elWin    = qs('#cbWindow');
  const elBody   = qs('#cbBody');
  const elForm   = qs('#cbForm');
  const elInput  = qs('#cbInput');
  const elToggle = qs('#cbToggle');
  const elClose  = qs('#cbClose');
  const elAvatar = qs('#cbAvatar');

  // ===== Bubble icon (optioneel) =====
  if (CHATBOT_CONFIG.bubbleIcon) {
    elToggle.classList.add('has-icon');
    elToggle.style.backgroundImage = `url("${CHATBOT_CONFIG.bubbleIcon}")`;
  }

  // ===== Avatar =====
  function setAvatar(src){
    // cache-bust om hard refresh te forceren bij wijzigingen
    const bust = (src.includes('?') ? '&' : '?') + 'v=' + Date.now();
    elAvatar.src = src + bust;
    elAvatar.referrerPolicy = "no-referrer";
  }

  if (CHATBOT_CONFIG.agentAvatar) {
    // eerst even zichtbaar houden; toon fallback i.p.v. verbergen
    elAvatar.style.display = 'block';
    elAvatar.onerror = () => {
      console.warn("[chat] Avatar laden faalde:", CHATBOT_CONFIG.agentAvatar);
      elAvatar.src =
        "data:image/svg+xml;utf8," +
        encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="16" fill="#e5e7eb"/><text x="16" y="21" text-anchor="middle" font-size="14" fill="#6b7280">AI</text></svg>');
    };
    setAvatar(CHATBOT_CONFIG.agentAvatar);
  } else {
    elAvatar.style.display = 'none';
  }

  // ===== Session =====
  const SESSION_KEY = 'cb_session_id';
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  // ===== Title =====
  if (CHATBOT_CONFIG.title) qs('#cbTitle').textContent = CHATBOT_CONFIG.title;

  // ===== UI helpers =====
  function toggle(open){
    elWin.classList[open ? 'add' : 'remove']('cb-open');
    if (open) setTimeout(()=> elInput.focus(), 50);
  }
  elToggle.onclick = ()=> toggle(!elWin.classList.contains('cb-open'));
  elClose.onclick  = ()=> toggle(false);

  function addMsg(role, text, asTyping=false){
    const m = document.createElement('div');
    m.className = `cb-msg ${role}`;
    if (asTyping) {
      m.innerHTML = `<span class="cb-typing"><span class="cb-dot"></span><span class="cb-dot"></span><span class="cb-dot"></span></span>`;
    } else {
      m.textContent = text;
    }
    elBody.appendChild(m);
    elBody.scrollTop = elBody.scrollHeight;
    return m;
  }

  async function sendMessage(text){
    addMsg('user', text);
    const typing = addMsg('bot', '', true);

    const payload = {
      message: text,
      sessionId,
      metadata: CHATBOT_CONFIG.identity
    };

    try {
      const res = await fetch(CHATBOT_CONFIG.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...CHATBOT_CONFIG.headers
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(()=> ({}));
      const reply = CHATBOT_CONFIG.parseReply(data);
      typing.textContent = reply;
    } catch (e) {
      typing.textContent = "Sorry, er ging iets mis. Probeer het later opnieuw.";
      console.error(e);
    }
  }

  elForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const text = (elInput.value || '').trim();
    if (!text) return;
    elInput.value = '';
    sendMessage(text);
  });

  // Welkomstbericht
  addMsg('bot', 'Hoi! Waar kan ik je mee helpen?');
})();