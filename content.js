/* ================================================================
   WhatsApp Web Compact — content.js  (v3 — Pure Compact Mode)
   
   Strateji:
   - WhatsApp'ın kendi sol menüsü (Communities, Status, vb.) zaten var.
   - Bizim özel Drawer'a gerek yok.
   - Bu eklenti sadece pencere 820px'in altına inince chat listesini
     (sadece avatarlar görünecek şekilde) daraltır.
   ================================================================ */

'use strict';

const COMPACT_THRESHOLD = 820;
let isCompact = false;
let mutationCount = 0;
let mutationObserver = null;

function log(...a) { console.log('%c[WAW Compact]', 'color:#00a884;font-weight:bold', ...a); }

// ── CSS Injection (Pure Compact Mode Styles) ─────────────────────
function injectStyles() {
  if (document.getElementById('waw-styles')) return;
  const st = document.createElement('style');
  st.id = 'waw-styles';
  st.textContent = `
  :root, .dark, .light {
    --waw-cw: 68px;  
    --waw-tr: 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* =========================================================
     COMPACT MOD (body.waw-compact)
     ========================================================= */

  /* PENCEREYİ İSTEDİĞİMİZ KADAR DARALTABİLMEK İÇİN KÖK MİNİMUM GENİŞLİKLERİ SIFIRLIYORUZ */
  html,
  body.waw-compact,
  body.waw-compact #app,
  body.waw-compact #app > div,
  body.waw-compact #app > div > div,
  body.waw-compact .two,
  body.waw-compact .three {
    min-width: 0 !important;
    max-width: 100% !important;
    opacity: 1 !important; /* WhatsApp'ın dar ekranda arayüzü 'karartmak' (fade) için kullandığı atomic sınıfları ez! */
  }
  
  html, body.waw-compact {
    overflow-x: hidden !important;
  }

  /* Mesaj balonlarının ve formun olduğu taşıyıcıları (Sağ Taraf) ESNEMEYE ZORLUYORUZ */
  body.waw-compact #waw-chat-pane-col,
  body.waw-compact #main,
  body.waw-compact #main > div,
  body.waw-compact #main > footer {
    min-width: 0 !important;
    max-width: 100% !important;
    width: auto !important;
    opacity: 1 !important;
  }

  /* --- CHAT HEADER REDESIGN (Vertical Stack) --- */
  body.waw-compact #main > header {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    height: auto !important;
    min-height: 200px !important; /* Biraz daha genişletelim ferahlasın */
    padding: 30px 20px !important;
    background-color: rgba(24, 24, 27, 0.6) !important; /* Daha solid bir zemin */
    backdrop-filter: blur(30px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    position: relative !important;
    gap: 16px !important;
    box-shadow: none !important;
  }

  /* Ana Header */
  /* WhatsApp'ın kendi çocuk elementlerindeki arka planları ve maskeleri temizle */
  body.waw-compact #main > header > div {
    justify-content: center !important;
  }

  body.waw-compact #main > header {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    height: auto !important;
    min-height: 200px !important;
    padding: 30px 20px !important;
    position: relative !important;
    gap: 16px !important;
    z-index: 10 !important;
  }

  /* Çocuk elementlerin genişliğini ve pozisyonunu düzelt */
  body.waw-compact #main > header > div {
    display: flex !important;
    width: auto !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    justify-content: center !important;
    align-items: center !important;
    position: static !important;
  }

  /* 1. Profil Resmi */
  body.waw-compact #main > header [data-testid="chat-head-button"] {
    transform: scale(0.8) !important;
    margin: 0 !important;
    border-radius: 50% !important;
    overflow: hidden !important;
    order: 1 !important;
  }
  
  body.waw-compact #main > header [data-testid="chat-head-button"] img,
  body.waw-compact #main > header [data-testid="chat-head-button"] svg {
    display: block !important;
  }

  /* 2. İsim ve Numara Alanı */
  body.waw-compact #main > header > div:nth-child(2) {
    flex-direction: column !important;
    order: 2 !important;
    width: 100% !important;
    max-width: 250px !important;
    overflow: hidden !important;
    text-align: center !important;
    justify-content: center !important;
  }
  body.waw-compact #main > header span[title] {
    line-height: 1.4 !important;
  }
  /* Status/Last Seen / Member List */
  body.waw-compact #main > header ._aj-8,
  body.waw-compact #main > header [data-testid="chat-subtitle"] {
    margin: 4px 0 0 0 !important;
    text-align: center !important;
  }

  /* 3. Buton Grubu */
  body.waw-compact #main > header > div:last-child {
    gap: 15px !important;
    margin-top: 2px !important;
    order: 3 !important;
  }
  body.waw-compact #main > header [role="button"] {
    transition: all 0.2s !important;
  }
  body.waw-compact #main > header [role="button"]:hover {
    transform: scale(1.05) !important;
  }


  /* --- 1. UYGULAMANIN ANA WRAPPER'INI AŞAĞI İT --- */
  /* Üste asacağımız Özel Navigasyon Barı için 54px yer açıyoruz */
  /* Güçlü position ayarı ile %100 height sorunlarını aşarız */
  body.waw-compact #app {
    position: absolute !important;
    top: 54px !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    height: auto !important; /* height yerine top/bottom kullanıyoruz */
    box-sizing: border-box !important;
  }

  /* WhatsApp'ın ORİJİNAL dikey Navigasyon Sütununu GİZLE (JS id atar) */
  body.waw-compact #waw-nav-col-hidden {
    display: none !important;
    width: 0 !important;
    min-width: 0 !important;
    max-width: 0 !important;
    flex: 0 0 0 !important;
    overflow: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  #waw-custom-topbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 54px;
    z-index: 999999 !important; /* CRITICAL: Must be above WA native header */
    background-color: var(--panel-header-background, #202c33); /* Standard WA color */
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0 8px;
    box-sizing: border-box;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none; /* Firefox */
  }
  #waw-custom-topbar::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }

  /* İçindeki klon butonlar */
  #waw-custom-topbar .waw-topbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px; /* 40px'den 34px'e çekildi */
    height: 34px;
    margin: 0 4px;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;
    flex-shrink: 0;
  }
  
  #waw-custom-topbar .waw-topbar-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  /* Klonlanmış ikonların ve bildirim baloncuklarının (badge) WhatsApp'ın orijinal 
     CSS kurallarıyla kendi yerlerini bulması için iç yapıya müdahale etmiyoruz! 
     Sadece tıklamaların üst butona geçmesini sağlıyoruz. */
  #waw-custom-topbar .waw-topbar-btn * {
    pointer-events: none !important;
  }

  /* --- 3. SOHBET LİSTESİ SÜTUNU (En Sola Yaslı, Daraltılmış) --- */
  body.waw-compact #waw-compact-sidebar-col {
    flex: 0 0 var(--waw-cw) !important;
    width: var(--waw-cw) !important;
    min-width: var(--waw-cw) !important;
    max-width: var(--waw-cw) !important;
    border: none !important; /* Dikey çizgiyi kaldırdık! */
    overflow: hidden !important;
  }

  /* Chat listesini daralt (#side) */
  body.waw-compact #side,
  body.waw-compact ._ak9p {
    overflow: hidden !important;
    transition: width var(--waw-tr) !important;
    flex-shrink: 0 !important;
    border: none !important;
  }

  /* SOHBET EKRANI PANELI (Geriye kalan boşluğu kapla) */
  body.waw-compact #waw-chat-pane-col,
  body.waw-compact #main {
      flex: 1 1 0 !important;
      min-width: 0 !important;
      overflow: hidden !important;
      border: none !important;
  }

  /* --- WHATSAPP'IN Orijinal Arayüz Ayırıcılarını (Ghost Lines) YOK ET --- */
  /* 1. Sayfanın Ortasındaki Çizgi (Atomic Sınıflar ve Taşıyıcılar) */
  body.waw-compact .two > div,
  body.waw-compact .three > div,
  body.waw-compact .x1iyjqo2,
  body.waw-compact .xjdofhw {
      border-left: none !important;
      border-right: none !important;
      border-left-color: transparent !important;
      border-right-color: transparent !important;
      border-left-width: 0 !important;
      border-right-width: 0 !important;
  }
  
  /* 2. Avatarların Sağındaki Çizgi */
  body.waw-compact #side,
  body.waw-compact ._aigw {
      border-right: none !important;
      border-left: none !important;
  }

  /* Ana ayırıcı tutamakları (Karanlık ekrana yol açan ._aigs silindi, sadece resize iptal) */
  body.waw-compact [data-testid="sidebar-resize-handle"] {
      display: none !important;
      pointer-events: none !important;
  }

  /* --- 4. SOHBET LİSTESİ SATIRLARINI (AVATARLARI VE HIGHLIGHTER'I) HİZALAMA --- */
  
  /* --- 4. SOHBET LİSTESİ SATIRLARINI (AVATARLARI VE HIGHLIGHTER'I) HİZALAMA --- */
  
  /* Tüm listelerde sağ/sol gereksiz scroll/taşıntıları nükle */
  body.waw-compact #pane-side,
  body.waw-compact [data-testid="chat-list"] {
      overflow-x: hidden !important;
  }

  /* Ana Satır Taşıyıcılarındaki Sola Kaydıran GİZLİ padding'leri SIFIRLA */
  body.waw-compact [role="listitem"] > div,
  body.waw-compact [role="listitem"] > div > div {
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
  }
  
  /* Seçili Sohbet Zemini (Cell Frame) - Bunu kusursuz bir KARE BALON (Bubble) yapıyoruz!
     Sütun 72px. Biz bu arkaplan kutusunu 56px yapıp "margin: auto" ile GÖBEKTEN ortalıyoruz */
  body.waw-compact ._ak8q,
  body.waw-compact [data-testid="cell-frame-container"] {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      width: 42px !important; /* 48px'den 42px'e çekildi */
      min-width: 42px !important;
      max-width: 42px !important;
      height: 42px !important;
      margin: 4px auto !important; /* Boşluklar daha da daraltıldı */
      padding: 0 !important;
      border-radius: 10px !important;
      box-sizing: border-box !important;
  }

  /* Avatarın Kendisi ve İçerici Elemanlar (SVG/IMG) */
  body.waw-compact ._ak8q > div:first-child,
  body.waw-compact [data-testid="cell-frame-container"] > div:first-child,
  body.waw-compact ._ak8q img,
  body.waw-compact [data-testid="cell-frame-container"] img,
  body.waw-compact ._ak8q svg,
  body.waw-compact [data-testid="cell-frame-container"] svg {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
  }

  /* Default Active Contact Style Minimal Override */
  body.waw-compact ._ak8q[aria-selected="true"],
  body.waw-compact [data-testid="cell-frame-container"][aria-selected="true"] {
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
  }

  /* Avatar Dışındaki Mesaj/İsim Özeti Gizle */

  /* --- SEARCH DROPDOWN (Modern Glassy Bar) --- */
  #waw-search-dropdown {
      position: fixed;
      top: -100px; /* Hidden initially */
      left: 0;
      width: 100%;
      height: 64px;
      z-index: 999998;
      background-color: rgba(24, 24, 27, 0.85) !important;
      backdrop-filter: blur(25px) saturate(200%);
      -webkit-backdrop-filter: blur(25px) saturate(200%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 20px;
      box-sizing: border-box;
      transition: top 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
      opacity: 0;
      pointer-events: none;
  }
  #waw-search-dropdown.open {
      top: 54px;
      opacity: 1;
      pointer-events: auto;
  }
  /* --- SEARCH DROPDOWN (Native Element Container) --- */
  #waw-search-dropdown {
      position: fixed;
      top: -100px; /* Hidden initially */
      left: 0;
      width: 100%;
      height: 64px;
      z-index: 999998;
      background-color: rgba(24, 24, 27, 0.4) !important; /* Mesajlaşma ekranı üstünde çok hafif karartma */
      backdrop-filter: blur(25px) saturate(200%);
      -webkit-backdrop-filter: blur(25px) saturate(200%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 20px;
      box-sizing: border-box;
      transition: top 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
      opacity: 0;
      pointer-events: none;
  }
  #waw-search-dropdown.open {
      top: 54px;
      opacity: 1;
      pointer-events: auto;
  }
  .waw-search-inner {
      width: 100%;
      max-width: 600px;
      position: relative;
      /* Orijinal kutunun kendi stili kalsın diye tüm özel background/borderları kaldırdık */
  }

  /* Orijinal kutuyu dropdown içinde biraz daha ferah gösterelim */
  .waw-search-inner > div {
      width: 100% !important;
  }

  /* Orijinaldeki büyüteç ikonunu gizleme (bizim dropdown butonumuz zaten arama butonu) */
  /* Ama kullanıcı "orijinali kalsın" dediği için artık hiçbir şeyi gizlemiyoruz. */

  /* Native arama kutusu gizliyken saklanacak yer */
  #waw-search-stash {
      display: none !important;
  }
  
  /* Aktif Arama Butonu Vurgusu */
  .waw-topbar-btn.active {
      background-color: rgba(14, 165, 233, 0.2) !important;
      color: var(--outgoing-background) !important;
  }
  .waw-topbar-btn.active svg {
      fill: var(--outgoing-background) !important;
  }

  /* --- 3. SOHBET LİSTESİ SÜTUN YÖNETİMİ --- */
  body.waw-compact #waw-compact-sidebar-col {
    flex: 0 0 var(--waw-cw) !important;
    width: var(--waw-cw) !important;
    min-width: var(--waw-cw) !important;
    max-width: var(--waw-cw) !important;
    overflow: hidden !important;
  }

  body.waw-compact #side,
  body.waw-compact ._ak9p {
    overflow: hidden !important;
    transition: width var(--waw-tr) !important;
    flex-shrink: 0 !important;
  }

  /* --- 4. SOHBET LİSTESİ SATIRLARINI (AVATARLARI) HİZALAMA --- */
  
  /* Ana Satır Taşıyıcılarındaki Sola Kaydıran GİZLİ padding'leri SIFIRLA */
  body.waw-compact [role="row"],
  body.waw-compact [role="listitem"] {
      width: 100% !important;
  }

  body.waw-compact [role="row"] > div,
  body.waw-compact [role="listitem"] > div,
  body.waw-compact [role="listitem"] > div > div {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
  }

  /* Negatif offsetli taşıyıcıları (özel WhatsApp React DOM elementleri) sıfırla */
  body.waw-compact ._ak72 {
      display: flex !important;
      justify-content: center !important;
      width: 100% !important;
      left: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      transform: none !important;
  }
  
  /* Seçili Sohbet Zemini (Cell Frame) - Ortalanmış Kutu */
  body.waw-compact ._ak8q,
  body.waw-compact [data-testid="cell-frame-container"] {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      width: 48px !important; 
      min-width: 48px !important;
      max-width: 48px !important;
      height: 48px !important;
      margin: 4px auto !important;
      padding: 0 !important;
      border-radius: 12px !important;
      box-sizing: border-box !important;
  }

  /* Avatarın Kendisi ve İçerici Elemanlar (SVG/IMG) */
  body.waw-compact ._ak8q > div:first-child,
  body.waw-compact [data-testid="cell-frame-container"] > div:first-child {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      margin: 0 auto !important;
      width: 100% !important;
  }

  body.waw-compact ._ak8q img,
  body.waw-compact [data-testid="cell-frame-container"] img,
  body.waw-compact ._ak8q svg,
  body.waw-compact [data-testid="cell-frame-container"] svg {
      display: block !important;
      margin: 0 auto !important;
      width: 40px !important;
      height: 40px !important;
      border-radius: 50% !important;
  }

  /* Avatar Dışındaki Mesaj/İsim Özeti Gizle */
  body.waw-compact ._ak8q > :nth-child(n+2),
  body.waw-compact [data-testid="cell-frame-container"] > :nth-child(n+2) {
      display: none !important;
  }

  /* --- 5. GEREKSİZ LİSTE BAŞLIKLARINI VE ETİKETLERİ GİZLE --- */
  
  /* The core text container identified by DOM inspection */
  body.waw-compact ._ak8l {
      display: none !important;
  }

  /* Force the avatar container to fill the row and center the image */
  body.waw-compact ._ak8n {
      width: 100% !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      margin: 0 !important;
      padding: 0 !important;
  }

  /* WhatsApp DOM yapısı değiştiğinde (isimlerin göründüğü o geniş sağ sütun) metin kutularını acımasızca yok et fallback */
  body.waw-compact ._ak8i,
  body.waw-compact .x11i5rnm,
  body.waw-compact ._ak8j,
  body.waw-compact [data-testid="cell-frame-title"],
  body.waw-compact [data-testid="chat-subtitle"] {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
      opacity: 0 !important;
      overflow: hidden !important;
  }

  /* --- 5. GEREKSİZ LİSTE BAŞLIKLARINI VE ETİKETLERİ GİZLE --- */
  body.pattern-bg-color ._ak9p header,
  body.waw-compact #waw-compact-sidebar-col header,
  body.waw-compact #side header,
  body.waw-compact [data-testid="chat-list-search-container"],
  body.waw-compact div.x1n2onr6.x11uqc5h.x9f619.x78zum5.x1okw0bk.xl2dz39.xexx8yu.x18d9i69.x73uwhe,
  body.waw-compact [role="heading"], /* "Chats", "Messages" başlıklarını nükle */
  body.waw-compact span._ak8l, /* Okunmamış sayısı/tarih gibi yandaki kalıntıları gizle */
  body.waw-compact ._ak8j {
    display: none !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /* DROPDOWN İÇİNDEYKEN GÖRÜNÜR YAP (Özel Override) */
  #waw-search-dropdown [data-testid="chat-list-search-container"],
  #waw-search-dropdown div.x1n2onr6.x11uqc5h.x9f619.x78zum5.x1okw0bk.xl2dz39.xexx8yu.x18d9i69.x73uwhe {
    display: flex !important;
    height: auto !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    overflow: visible !important;
    width: 100% !important;
  }

  /* USER DIRECT OVERRIDES */
  body.waw-compact ._ak8h {
      display: flex !important;
      flex: none !important;
      align-items: center !important;
      margin-top: -1px !important;
  }
  `;
  document.head.appendChild(st);
}

// ── İsimleri Hover İçin Atama & Layout ID'lerini Bulma ─────────────

// Navigasyon Sütununu Yapısal Değil "Fiziksel" Olarak Bul (Kusursuz Yöntem)
function getFarLeftColumn() {
  const icon = document.querySelector('span[data-icon="settings-outline"]') || 
               document.querySelector('span[data-icon="settings"]') || 
               document.querySelector('[aria-label="Settings"]') || 
               document.querySelector('[aria-label="Ayarlar"]') ||
               document.querySelector('[aria-label="Chats"]') || 
               document.querySelector('[aria-label="Sohbetler"]') ||
               document.querySelector('span[data-icon="chat-outline"]') ||
               document.querySelector('span[data-icon="chat"]');
  if (!icon) return null;

  let p = icon.parentElement;
  while (p && p !== document.body) {
      // Navigasyon menüsü her zaman incedir (40-100px) ve oldukça uzundur (ekranın yarısından büyük)
      if (p.clientWidth > 40 && p.clientWidth < 100 && p.clientHeight > window.innerHeight * 0.5) {
          return p;
      }
      p = p.parentElement;
  }
  return null;
}

function syncCustomTopBar() {
  if (!isCompact) {
      const b = document.getElementById('waw-custom-topbar');
      if (b) b.style.display = 'none';
      
      const hiddenCol = document.getElementById('waw-nav-col-hidden');
      if (hiddenCol) {
          hiddenCol.style.display = '';
          hiddenCol.id = ''; // Restore original
      }
      return;
  }

  // 1. Ayarlar / Profil ikonunu bularak Menüyü GÜVENLİ BİR ŞEKİLDE fiziksel boyutuyla tespit et
  const col = getFarLeftColumn();

  if (col) {
      if (col.id !== 'waw-nav-col-hidden') col.id = 'waw-nav-col-hidden';
      col.style.display = 'none';

      // Custom bar oluştur / göster
      let topBar = document.getElementById('waw-custom-topbar');
      if (!topBar) {
          topBar = document.createElement('div');
          topBar.id = 'waw-custom-topbar';
          document.body.appendChild(topBar); // Body'nin sonuna ekle
      }
      topBar.style.display = 'flex';

      // Butonları eşitle (Sütunun içindeki tıklanabilir her şey)
      let buttons = Array.from(col.querySelectorAll('[role="button"], [role="tab"], button'));
      
      // Arama butonunu 2. sıraya (index 1) manuel olarak EKLE
      // Eğer henüz listeye eklenmemişse dummy bir "Search" objesi oluşturacağız
      const searchInjected = buttons.some(b => {
          const l = b.getAttribute('aria-label') || b.getAttribute('title') || '';
          return l.toLowerCase().includes('search') || l.toLowerCase().includes('ara');
      });

      // Eğer butonlar içinde search yoksa (WhatsApp bazen farklı DOM yapısı sunar),
      // biz yine de 2. sıraya bir Search butonu garantisi veriyoruz.
      // Ama önce mevcut butonları işleyelim.
      
      buttons.forEach((originalBtn, idx) => {
          let label = originalBtn.getAttribute('aria-label') || originalBtn.getAttribute('title') || originalBtn.querySelector('span[data-icon]')?.getAttribute('data-icon') || 'btn-' + idx;
          let safeLabel = label.trim().replace(/['"\s]/g, '-');
          try { safeLabel = CSS.escape(safeLabel); } catch(e) {}

          let clone = topBar.querySelector(`[data-waw-label="${safeLabel}"]`);

          if (!clone) {
              clone = document.createElement('div');
              clone.className = 'waw-topbar-btn';
              clone.setAttribute('data-waw-label', safeLabel);
              
              clone.addEventListener('click', () => {
                  // Her tıklamada DOM'daki orijinal elementi yeniden bul (React destroy etmiş olabilir)
                  const activeCol = getFarLeftColumn();
                  if (activeCol) {
                      const currentBtn = Array.from(activeCol.querySelectorAll('[role="button"], [role="tab"], button')).find((b, idx2) => {
                          let l = b.getAttribute('aria-label') || b.getAttribute('title') || b.querySelector('span[data-icon]')?.getAttribute('data-icon') || 'btn-' + idx2;
                          let sl = l.trim().replace(/['"\\s]/g, '-');
                          try { sl = CSS.escape(sl); } catch(e) {}
                          return sl === safeLabel;
                      });
                      if (currentBtn) {
                          currentBtn.click();
                      } else {
                          originalBtn.click(); // Fallback
                      }
                  } else {
                      originalBtn.click(); // Fallback
                  }
              });
              
              // Sağ gruplama (Settings / Profil). Bunlardan ilkine marginLeft:auto atarsak sağa itilirler.
              const t = label.toLowerCase();
              if (t.includes('setting') || t.includes('ayarlar') || t.includes('profile') || t.includes('profil') || t.includes('default-user')) {
                  if (!topBar.querySelector('.waw-pushed-right')) {
                      clone.style.marginLeft = 'auto'; // Sadece ilk sağa geçene auto ver
                      clone.classList.add('waw-pushed-right');
                  }
              }
              
              // İkinci sıraya (Sohbetler'den hemen sonraya) eklemek için insertBefore mantığı
              const existingButtons = topBar.querySelectorAll('.waw-topbar-btn');
              if (existingButtons.length === 1) {
                  // İlk butondan sonra "Search" butonu gelecek, biz bunu manuel tetikleyeceğiz
                  createSpecialSearchButton(topBar);
              }
              topBar.appendChild(clone);
          }
          
          // WhatsApp'ın SVG'sini direkt kopyala (nokta veya okundu verisi varsa anında geçer)
          if (clone.innerHTML !== originalBtn.innerHTML) {
              clone.innerHTML = originalBtn.innerHTML;
          }
      });

      // --- ARAMA KUTUSUNU PROAKTİF GİZLE / STASH'E TAŞI ---
      syncSearchProactively();
  }

  function syncSearchProactively() {
      const dd = document.getElementById('waw-search-dropdown');
      // Eğer dropdown açıksa veya açılıyorsa (transition) dokunma!
      if (dd && (dd.classList.contains('open') || dd.querySelector('.x1n2onr6'))) {
          // Eğer dropdown içinde değilse taşıyabiliriz ama dropdown tıklandığında zaten taşıyor.
          // O yüzden dropdown varken risk almayalım.
          return;
      }

      const stash = document.getElementById('waw-search-stash');
      if (!stash) return;

      const nativeSearchContainer = 
          document.querySelector('[data-testid="chat-list-search-container"]') || 
          document.querySelector('div.x1n2onr6.x11uqc5h.x9f619.x78zum5.x1okw0bk.xl2dz39');

      if (nativeSearchContainer && nativeSearchContainer.parentElement !== stash && !nativeSearchContainer.closest('#waw-search-dropdown')) {
          stash.appendChild(nativeSearchContainer);
          log('Arama kutusu proaktif olarak stashlendi.');
      }
  }

  // --- ÖZEL ARAMA BUTONU VE DROPDOWN MANTIĞI ---
  function createSpecialSearchButton(parent) {
      if (parent.querySelector('[data-waw-special="search"]')) return;
      
      const sBtn = document.createElement('div');
      sBtn.className = 'waw-topbar-btn';
      sBtn.setAttribute('data-waw-special', 'search');
      // WhatsApp'ın paylaştığı yeni "search-refreshed-thin" ikonunu kullanıyoruz
      sBtn.innerHTML = `<span data-icon="search-refreshed-thin"><svg viewBox="0 0 20 20" height="20" width="20" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.36653 4.3664C5.36341 3.36953 6.57714 2.87 8.00012 2.87C9.42309 2.87 10.6368 3.36953 11.6337 4.3664C12.6306 5.36329 13.1301 6.57724 13.1301 8.00062C13.1301 8.57523 13.0412 9.11883 12.8624 9.63057C12.6972 10.1038 12.4733 10.5419 12.1909 10.9444L16.5712 15.3247C16.7454 15.4989 16.8385 15.7046 16.8385 15.9375C16.8385 16.1704 16.7454 16.3761 16.5712 16.5503C16.396 16.7254 16.1866 16.8175 15.948 16.8175C15.7095 16.8175 15.5001 16.7254 15.3249 16.5503L10.9448 12.1906C10.5421 12.4731 10.104 12.697 9.63069 12.8623C9.11895 13.041 8.57535 13.13 8.00074 13.13C6.57736 13.13 5.36341 12.6305 4.36653 11.6336C3.36965 10.6367 2.87012 9.42297 2.87012 8C2.87012 6.57702 3.36965 5.36328 4.36653 4.3664ZM8.00012 4.63C7.06198 4.63 6.26877 4.95685 5.61287 5.61275C4.95698 6.26865 4.63012 7.06186 4.63012 8C4.63012 8.93813 4.95698 9.73134 5.61287 10.3872C6.26877 11.0431 7.06198 11.37 8.00012 11.37C8.93826 11.37 9.73146 11.0431 10.3874 10.3872C11.0433 9.73134 11.3701 8.93813 11.3701 8C11.3701 7.06186 11.0433 6.26865 10.3874 5.61275C9.73146 4.95685 8.93826 4.63 8.00012 4.63Z" fill="currentColor"></path></svg></span>`;
      
      // "Chats" butonundan hemen sonraya ekle (Sıralama: Chats, SEARCH, Status...)
      const first = parent.querySelector('.waw-topbar-btn');
      if (first && first.nextSibling) {
          parent.insertBefore(sBtn, first.nextSibling);
      } else {
          parent.appendChild(sBtn);
      }

      sBtn.addEventListener('click', toggleSearchDropdown);
  }

  function toggleSearchDropdown() {
      let dd = document.getElementById('waw-search-dropdown');
      if (!dd) {
          dd = document.createElement('div');
          dd.id = 'waw-search-dropdown';
          dd.innerHTML = `<div class="waw-search-inner"></div>`;
          document.body.appendChild(dd);

          // Stash alanı: Dropdown kapalıyken orijinal element burada bekler
          const stash = document.createElement('div');
          stash.id = 'waw-search-stash';
          document.body.appendChild(stash);
      }

      const isOpen = dd.classList.toggle('open');
      const inner = dd.querySelector('.waw-search-inner');
      const stash = document.getElementById('waw-search-stash');
      const sBtn = document.querySelector('[data-waw-special="search"]');
      
      if (sBtn) sBtn.classList.toggle('active', isOpen);

      // Orijinal arama kutusunu bul
      // Kullanıcının attığı yapıya göre en geniş kapsayıcıyı hedefliyoruz
      const nativeSearchContainer = 
          document.querySelector('[data-testid="chat-list-search-container"]') || 
          document.querySelector('div.x1n2onr6.x11uqc5h.x9f619.x78zum5.x1okw0bk.xl2dz39'); // Kullanıcının attığı ilk div sınıfı

      if (nativeSearchContainer) {
          if (isOpen) {
              // TAŞI: Orijinal elementi dropdown'a al
              inner.appendChild(nativeSearchContainer);
              setTimeout(() => {
                  const input = nativeSearchContainer.querySelector('[role="textbox"]') || nativeSearchContainer.querySelector('input');
                  if (input) input.focus();
              }, 150);
          } else {
              // GERİ KOY: Kapandığında stash'e (gizli yere) at
              stash.appendChild(nativeSearchContainer);
          }
      }

      if (isOpen) {
          // ESC ile kapatma listener'ı (Sadece dropdown açıkken global dinleyebiliriz)
          const escHandler = (e) => {
              if (e.key === 'Escape') {
                  toggleSearchDropdown();
                  window.removeEventListener('keydown', escHandler);
              }
          };
          window.addEventListener('keydown', escHandler);
      }
  }

  // 2. Chat List Sütununu 72px yap ve filtre tablarını gizle
  const side = document.querySelector('#side') || document.querySelector('._ak9p');
  if (side && side.parentElement) {
      if (side.parentElement.id !== 'waw-compact-sidebar-col') {
          side.parentElement.id = 'waw-compact-sidebar-col';
      }

      // Filtre tablarını JS ile yok et (All, Unread vb.)
      const filters = side.parentElement.querySelectorAll('button, [role="button"]');
      filters.forEach(btn => {
          const text = btn.textContent.toLowerCase().trim();
          if (text === 'all' || text === 'tümü' || text === 'unread' || text === 'okunmayanlar' || 
              text === 'favourites' || text === 'favoriler' || text === 'groups' || text === 'gruplar') {
              btn.style.display = 'none';
              // Küçük bir divi varsa onu da yok et (maks 60px)
              if (btn.parentElement && btn.parentElement.clientHeight > 0 && btn.parentElement.clientHeight < 60) {
                  btn.parentElement.style.display = 'none';
              }
          }
      });
  }

  // 3. Chat Pane (Sağ Ekran) Etiketle
  const mainPane = document.querySelector('#main') || document.querySelector('[data-testid="conversation-panel-wrapper"]');
  if (mainPane && mainPane.parentElement) {
      if (mainPane.parentElement.id !== 'waw-chat-pane-col') {
          mainPane.parentElement.id = 'waw-chat-pane-col';
      }
  }
}

function annotateRows() {
  syncCustomTopBar();

  // Sohbet satırlarını bul (_ak8q güncel class)
  const rows = document.querySelectorAll('._ak8q, [data-testid="cell-frame-container"]');
  rows.forEach(row => {
    if (row.dataset.wawName) return;
    // İçindeki isim span'i bul
    const title = row.querySelector('span[title]') ||
                  row.querySelector('[data-testid="cell-frame-title"] span') ||
                  row.querySelector('span[dir="auto"]');
    if (title && title.textContent) {
      row.dataset.wawName = title.textContent.trim();
    }
  });
}

// ── Compact Mode Aç/Kapat ───────────────────────────────────────
function setCompact(on) {
  if (on === isCompact) return;
  isCompact = on;
  document.body.classList.toggle('waw-compact', on);
  if (on) {
    annotateRows();
    log('Compact mod AKTİF');
  } else {
    log('Compact mod KAPALI');
  }
}

// ── Resize Dinleyici ───────────────────────────────────────────
function startResize() {
  const check = () => setCompact(window.innerWidth < COMPACT_THRESHOLD);
  window.addEventListener('resize', check, { passive: true });
  check(); 
}

// ── DOM Değişimlerini İzle (İsim eklemeleri için) ──────────────
function startMutation() {
  if (mutationObserver) return;
  let timer;
  mutationObserver = new MutationObserver(() => {
    if (!isCompact) return;
    clearTimeout(timer);
    timer = setTimeout(annotateRows, 300);
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

// ── Sayfa Yüklenme Bekleyicisi ─────────────────────────────────
function waitReady(cb, ms = 30000) {
  const t0 = Date.now();
  const check = () => {
    // WhatsApp sol panel yüklenmesi
    if (document.querySelector('._ak9p') || document.getElementById('side')) { 
      cb(); 
    }
    else if (Date.now() - t0 < ms) { 
      setTimeout(check, 500); 
    }
  };
  check();
}

// ── Başlatıcı ───────────────────────────────────────────────────
function bootstrap() {
  log('Sistem başlatılıyor...');
  
  // Önceki overlay'leri, butonları temizle
  document.getElementById('waw-overlay')?.remove();
  document.getElementById('waw-drawer')?.remove();
  document.getElementById('waw-compact-btn')?.remove();

  injectStyles();
  
  // Stash ve Dropdown yapılarını önden hazırla (Hızlı müdahale için)
  if (!document.getElementById('waw-search-stash')) {
      const stash = document.createElement('div');
      stash.id = 'waw-search-stash';
      stash.style.display = 'none';
      document.body.appendChild(stash);
  }
  
  startResize();
  startMutation();
  log('Sistem aktif ✓');
}

log('Bekleniyor...');
waitReady(bootstrap);
