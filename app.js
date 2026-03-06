/* ============================================================
   WhatsApp Web Redesign — app.js
   ============================================================ */

// ── Data ────────────────────────────────────────────────────────
const CONTACTS = [
  {
    id: 1, name: 'Ahmet Yılmaz', initials: 'AY',
    color: 'linear-gradient(135deg,#e91e63,#f48fb1)',
    preview: 'Yarın görüşebilir miyiz?', time: '19:02', unread: 3, online: true,
    messages: [
      { from: 'in',  text: 'Merhaba, nasılsın?', time: '18:50' },
      { from: 'out', text: 'İyiyim, sen nasılsın?', time: '18:51' },
      { from: 'in',  text: 'Yarın görüşebilir miyiz?', time: '19:02' },
    ]
  },
  {
    id: 2, name: 'Elif Kaya', initials: 'EK',
    color: 'linear-gradient(135deg,#9c27b0,#e1bee7)',
    preview: '✅ Dosyayı gönderdim', time: '18:45', unread: 0, online: false,
    messages: [
      { from: 'in',  text: 'Dosyayı aldın mı?', time: '18:30' },
      { from: 'out', text: 'Henüz bakmadım, birazdan kontrol edeceğim', time: '18:40' },
      { from: 'in',  text: '✅ Dosyayı gönderdim', time: '18:45' },
    ]
  },
  {
    id: 3, name: 'Proje Ekibi 🚀', initials: 'PE',
    color: 'linear-gradient(135deg,#ff9800,#ffe082)',
    preview: 'Berke: Toplantı saat 15\'te', time: '18:20', unread: 12, online: true,
    messages: [
      { from: 'in',  text: 'Deploy başarıyla tamamlandı 🎉', time: '17:00' },
      { from: 'out', text: 'Harika! Tebrikler ekip!', time: '17:05' },
      { from: 'in',  text: 'Berke: Toplantı saat 15\'te', time: '18:20' },
    ]
  },
  {
    id: 4, name: 'Selin Demir', initials: 'SD',
    color: 'linear-gradient(135deg,#2196f3,#90caf9)',
    preview: '😂 Çok komikti ya', time: '17:58', unread: 1, online: true,
    messages: [
      { from: 'out', text: 'Doğum günün kutlu olsun! 🎂', time: '09:00' },
      { from: 'in',  text: 'Teşekkürler çok sevdim! 🥰', time: '09:15' },
      { from: 'in',  text: '😂 Çok komikti ya', time: '17:58' },
    ]
  },
  {
    id: 5, name: 'Baba', initials: 'BA',
    color: 'linear-gradient(135deg,#607d8b,#b0bec5)',
    preview: 'Akşam eve gel', time: '17:30', unread: 0, online: false,
    messages: [
      { from: 'in',  text: 'Akşam eve gel', time: '17:30' },
      { from: 'out', text: 'Tamam baba, 7\'de gelirim', time: '17:31' },
    ]
  },
  {
    id: 6, name: 'Burak Çelik', initials: 'BC',
    color: 'linear-gradient(135deg,#4caf50,#a5d6a7)',
    preview: 'Maçı izledin mi?', time: '16:10', unread: 0, online: false,
    messages: [
      { from: 'in',  text: 'Dün gece maçı izledin mi?', time: '16:05' },
      { from: 'out', text: 'Tabii ki! Muhteşem maçtı', time: '16:08' },
      { from: 'in',  text: 'Maçı izledin mi?', time: '16:10' },
    ]
  },
  {
    id: 7, name: 'Cansu Öztürk', initials: 'CO',
    color: 'linear-gradient(135deg,#f44336,#ef9a9a)',
    preview: 'Kitabı bitirdim, öneririm!', time: 'Dün', unread: 0, online: false,
    messages: [
      { from: 'in',  text: 'Kitabı bitirdim, öneririm!', time: 'Dün' },
    ]
  },
  {
    id: 8, name: 'Müşteri Destek', initials: 'MD',
    color: 'linear-gradient(135deg,#00bcd4,#80deea)',
    preview: 'Talebiniz işleme alındı.', time: 'Dün', unread: 2, online: false,
    messages: [
      { from: 'out', text: 'Siparişim nerede?', time: 'Dün' },
      { from: 'in',  text: 'Talebiniz işleme alındı.', time: 'Dün' },
    ]
  },
];

// ── State ────────────────────────────────────────────────────────
let activeContactId = null;
let filteredContacts = [...CONTACTS];
let isCompact = false;

const COMPACT_THRESHOLD = 820; // px — below this, compact mode activates

// ── DOM References ───────────────────────────────────────────────
const drawer        = document.getElementById('drawer');
const overlay       = document.getElementById('drawer-overlay');
const contactList   = document.getElementById('contact-list');
const welcomeScreen = document.getElementById('welcome-screen');
const chatView      = document.getElementById('chat-view');
const messagesArea  = document.getElementById('messages-area');
const chatName      = document.getElementById('chat-name');
const chatAvatar    = document.getElementById('chat-avatar');
const chatStatusLbl = document.getElementById('chat-status-label');
const messageInput  = document.getElementById('message-input');
const toast         = document.getElementById('toast');

// ── Drawer ───────────────────────────────────────────────────────
function openDrawer() {
  drawer.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  drawer.classList.remove('open');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Theme Toggle ─────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.getAttribute('data-theme') === 'light';
  html.setAttribute('data-theme', isLight ? 'dark' : 'light');
  document.getElementById('theme-toggle').checked = !isLight;
}

// ── Tabs ─────────────────────────────────────────────────────────
function switchTab(btn, tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  // For demo, only "Sohbetler" shows contacts
  if (tabName !== 'chats') {
    showToast(`"${btn.textContent}" bölümü yakında!`);
  }
}

// ── Contact List Rendering ───────────────────────────────────────
function renderContacts(contacts) {
  contactList.innerHTML = '';

  if (contacts.length === 0) {
    contactList.innerHTML = `
      <div style="text-align:center;padding:48px 24px;color:var(--text-muted);font-size:14px;">
        Sonuç bulunamadı.
      </div>`;
    return;
  }

  contacts.forEach(contact => {
    const item = document.createElement('div');
    item.className = 'contact-item' + (contact.id === activeContactId ? ' active' : '');
    item.id = `contact-${contact.id}`;
    item.dataset.name = contact.name; // used by compact tooltip
    item.onclick = () => openChat(contact.id);

    const timeClass = contact.unread > 0 ? 'contact-time new' : 'contact-time';
    const badgeHTML = contact.unread > 0
      ? `<span class="badge">${contact.unread}</span>`
      : '';

    const onlineDot = contact.online
      ? `<span class="status-dot"></span>`
      : '';

    item.innerHTML = `
      <div class="avatar medium" style="background:${contact.color};position:relative;">
        <span>${contact.initials}</span>
        ${onlineDot}
      </div>
      <div class="contact-info">
        <div class="contact-top">
          <span class="contact-name">${contact.name}</span>
          <span class="${timeClass}">${contact.time}</span>
        </div>
        <div class="contact-bottom">
          <span class="contact-preview">${contact.preview}</span>
          ${badgeHTML}
        </div>
      </div>
    `;

    contactList.appendChild(item);
  });
}

// ── Filter / Search ──────────────────────────────────────────────
function filterContacts(query) {
  const q = query.trim().toLowerCase();
  filteredContacts = q
    ? CONTACTS.filter(c => c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q))
    : [...CONTACTS];
  renderContacts(filteredContacts);
  // Restore active highlight
  if (activeContactId) {
    const el = document.getElementById(`contact-${activeContactId}`);
    if (el) el.classList.add('active');
  }
}

// ── Open Chat ────────────────────────────────────────────────────
function openChat(contactId) {
  activeContactId = contactId;
  const contact = CONTACTS.find(c => c.id === contactId);
  if (!contact) return;

  // Clear unread badge
  contact.unread = 0;
  contact.time = contact.time; // keep time

  // Update contact list selection
  document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`contact-${contactId}`);
  if (el) el.classList.add('active');

  // Re-render that item (remove badge)
  renderContacts(filteredContacts);
  const newEl = document.getElementById(`contact-${activeContactId}`);
  if (newEl) newEl.classList.add('active');

  // Update header
  chatName.textContent = contact.name;
  chatAvatar.textContent = contact.initials;
  chatAvatar.style.background = contact.color;
  chatStatusLbl.textContent = contact.online ? 'çevrimiçi' : 'son görülme bilinmiyor';
  chatStatusLbl.style.color = contact.online ? 'var(--accent)' : 'var(--text-muted)';

  // Show chat view
  welcomeScreen.style.display = 'none';
  chatView.style.display = 'flex';

  // Render messages
  renderMessages(contact);
}

// ── Render Messages ──────────────────────────────────────────────
function renderMessages(contact) {
  messagesArea.innerHTML = '';

  // Date separator
  const sep = document.createElement('div');
  sep.className = 'date-separator';
  sep.innerHTML = `<span>Bugün</span>`;
  messagesArea.appendChild(sep);

  contact.messages.forEach(msg => {
    const group = document.createElement('div');
    group.className = `msg-group ${msg.from}`;

    const bubble = document.createElement('div');
    bubble.className = `bubble ${msg.from}`;
    bubble.innerHTML = `
      ${escapeHtml(msg.text)}
      <div class="bubble-meta">
        <span>${msg.time}</span>
        ${msg.from === 'out' ? `<span class="ticks">✓✓</span>` : ''}
      </div>
    `;

    group.appendChild(bubble);
    messagesArea.appendChild(group);
  });

  // Scroll to bottom
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// ── Send Message ─────────────────────────────────────────────────
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || activeContactId === null) return;

  const contact = CONTACTS.find(c => c.id === activeContactId);
  if (!contact) return;

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const msg = { from: 'out', text, time };
  contact.messages.push(msg);
  contact.preview = text;
  contact.time = time;

  messageInput.value = '';

  // Append message to view
  appendMessage(msg);

  // Update contact list
  renderContacts(filteredContacts);
  const el = document.getElementById(`contact-${activeContactId}`);
  if (el) el.classList.add('active');

  // Simulate reply after 1-2s
  const replies = [
    'Anladım 👍',
    'Tamam, birazdan yazarım.',
    'Harika!',
    '😊',
    'Evet, kesinlikle!',
    'Bir saniye...',
    'Şu an meşgulüm, sonra yazarım.',
  ];
  const delay = 1000 + Math.random() * 1500;
  setTimeout(() => {
    const replyText = replies[Math.floor(Math.random() * replies.length)];
    const replyTime = `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
    const reply = { from: 'in', text: replyText, time: replyTime };
    contact.messages.push(reply);
    contact.preview = replyText;
    contact.time = replyTime;

    if (activeContactId === contact.id) {
      appendMessage(reply);
    }
    renderContacts(filteredContacts);
    const el2 = document.getElementById(`contact-${activeContactId}`);
    if (el2) el2.classList.add('active');
  }, delay);
}

function appendMessage(msg) {
  const group = document.createElement('div');
  group.className = `msg-group ${msg.from}`;

  const bubble = document.createElement('div');
  bubble.className = `bubble ${msg.from}`;
  bubble.innerHTML = `
    ${escapeHtml(msg.text)}
    <div class="bubble-meta">
      <span>${msg.time}</span>
      ${msg.from === 'out' ? `<span class="ticks">✓✓</span>` : ''}
    </div>
  `;

  group.appendChild(bubble);
  messagesArea.appendChild(group);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function handleEnter(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

// ── Helpers ──────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function showNewChatToast() {
  showToast('Yeni sohbet özelliği yakında! 💬');
}

// ── Compact Mode ─────────────────────────────────────────────────
const appEl = document.getElementById('app');

function setCompactMode(compact) {
  if (compact === isCompact) return;
  isCompact = compact;

  if (compact) {
    appEl.classList.add('compact');
    // Close drawer if open, as it now overlaps the panel
    closeDrawer();
  } else {
    appEl.classList.remove('compact');
  }
}

// ── Init ─────────────────────────────────────────────────────────
function init() {
  renderContacts(CONTACTS);

  // Keyboard shortcut: Escape closes drawer
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });

  // ── ResizeObserver for compact mode ──
  // Watch the app container width so it works even inside an iframe
  const ro = new ResizeObserver(entries => {
    for (const entry of entries) {
      const w = entry.contentRect.width;
      setCompactMode(w < COMPACT_THRESHOLD);
    }
  });
  ro.observe(appEl);

  // Also handle initial size
  setCompactMode(appEl.offsetWidth < COMPACT_THRESHOLD);

  // Greeting toast
  setTimeout(() => showToast('WhatsApp Web\'e hoş geldiniz! 👋'), 800);
}

init();
