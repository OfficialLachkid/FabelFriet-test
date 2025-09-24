/* ====== CONFIG ====== */
const CHATBOT_CONFIG = {
  webhookUrl: "https://n8n1.vbservices.org/webhook/c5796ce9-6a17-4181-b39c-20108ed3f122/chat",
  title: "Support Assistant",

  // Bubble iconen (t.o.v. index.html)
  bubbleIconClosed: "./Assets/ChatImage.png",
  bubbleIconOpen:   "./Assets/image.png",

  // Avatar in de chat header
  agentAvatar: "./Assets/ChatImage.png",

  // Eventuele extra headers (bv. auth)
  headers: {},

  // Hoe de response te tonen in de widget:
  // Pak primair 'output' (n8n AI Agent), fallback naar 'reply' of string.
  parseReply: (data) => {
    if (!data) return "Er ging iets mis. Probeer opnieuw.";
    if (typeof data === "string") return data;
    if (data.output) return data.output;            // <- jouw wens: alleen output
    if (data.reply)  return data.reply;             // fallback wanneer je Set-node gebruikt
    // extra defensief: veelgebruikte alternatieve keys
    if (data.text)   return data.text;
    if (data.message)return data.message;
    try { return JSON.stringify(data); } catch { return String(data); }
  },

  // Handige metadata meegeven (komt binnen in n8n)
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

  const elIconClosed = qs('.cb-icon-closed', elToggle);
  const elIconOpen   = qs('.cb-icon-open',   elToggle);

  // --- helpers
  const bust = (url)=> url ? url + ((url.includes('?')?'&':'?') + 'v=' + Date.now()) : url;

  function preload(src, onerror){
    if(!src) return;
    const i = new Image();
    i.onload = ()=>{};
    i.onerror = ()=>{ if (onerror) onerror(src); };
    i.src = bust(src);
  }

  function setBubbleIcons(closedSrc, openSrc){
    if (closedSrc) elIconClosed.src = bust(closedSrc);
    if (openSrc)   elIconOpen.src   = bust(openSrc);
  }

  function setAvatar(src){
    if (!src) { elAvatar.style.display='none'; return; }
    elAvatar.src = bust(src);
    elAvatar.referrerPolicy = "no-referrer";
    elAvatar.onerror = () => {
      elAvatar.src = "data:image/svg+xml;utf8," +
        encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="16" fill="#e5e7eb"/><text x="16" y="21" text-anchor="middle" font-size="14" fill="#6b7280">AI</text></svg>');
    };
  }

  // --- init visuals
  setBubbleIcons(CHATBOT_CONFIG.bubbleIconClosed, CHATBOT_CONFIG.bubbleIconOpen);
  // Preload zodat er geen “wit” frame is bij de eerste switch
  preload(CHATBOT_CONFIG.bubbleIconClosed);
  preload(CHATBOT_CONFIG.bubbleIconOpen);
  setAvatar(CHATBOT_CONFIG.agentAvatar);
  if (CHATBOT_CONFIG.title) qs('#cbTitle').textContent = CHATBOT_CONFIG.title;

  // --- session
  const SESSION_KEY = 'cb_session_id';
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  // --- UI
  function setOpen(open){
    elWin.classList[open ? 'add' : 'remove']('cb-open');
    elToggle.classList[open ? 'add' : 'remove']('is-open');
    elToggle.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(()=> elInput.focus(), 50);
  }

  elToggle.addEventListener('click', ()=> setOpen(!elWin.classList.contains('cb-open')));
  elClose.addEventListener('click', ()=> setOpen(false));
  elClose.addEventListener('keydown', (e)=> { if (e.key==='Enter'||e.key===' ') setOpen(false); });

  function addMsg(role, text, asTyping=false){
    const m = document.createElement('div');
    m.className = `cb-msg ${role}`;
    m.innerHTML = asTyping
      ? `<span class="cb-typing"><span class="cb-dot"></span><span class="cb-dot"></span><span class="cb-dot"></span></span>`
      : String(text);
    elBody.appendChild(m);
    elBody.scrollTop = elBody.scrollHeight;
    return m;
  }

 async function sendMessage(text){
  addMsg('user', text);
  const typing = addMsg('bot', '', true);

  const payload = {
    chatInput: text,          // OK voor Chat Trigger
    sessionId: sessionId,     // <-- i.p.v. chatId
    metadata: CHATBOT_CONFIG.identity
  };

  try {
    const res = await fetch(CHATBOT_CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...CHATBOT_CONFIG.headers },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(()=> ({}));
    typing.textContent = CHATBOT_CONFIG.parseReply(data);
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