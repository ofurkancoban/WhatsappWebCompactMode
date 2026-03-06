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
  :root {
    --waw-cw: 72px;  /* Sadece avatarların görüneceği genişlik */
    --waw-tr: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* =========================================================
     COMPACT MOD (body.waw-compact)
     ========================================================= */

  /* GENEL KÜÇÜLTME (HER ŞEYİ %18 KÜÇÜLT) */
  body.waw-compact {
    zoom: 0.82 !important; /* Mobile Widget Hissi */
  }

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
  }
  
  html, body.waw-compact {
    overflow-x: hidden !important;
  }

  /* Mesaj balonlarının ve formun olduğu taşıyıcıları (Sağ Taraf) ESNEMEYE ZORLUYORUZ */
  body.waw-compact #waw-chat-pane-col,
  body.waw-compact #main,
  body.waw-compact #main > div,
  body.waw-compact #main > header,
  body.waw-compact #main > footer {
    min-width: 0 !important;
    max-width: 100% !important;
    width: auto !important; /* React inline "width: 700px" atarsa EZ! */
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

  /* --- 2. ÖZEL TOP BAR KENDİ STİLİ (JS ile Eklenir) --- */
  #waw-custom-topbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 54px;
    z-index: 999999;
    background-color: #111b21;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0 16px;
    box-sizing: border-box;
    transition: opacity var(--waw-tr);
  }

  /* İçindeki klon butonlar */
  #waw-custom-topbar .waw-topbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    margin: 0 12px;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;
    flex-shrink: 0;
  }
  
  #waw-custom-topbar .waw-topbar-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  /* Mavi veya bildirim noktalı badge'lerin görünürlüğünü sağla */
  #waw-custom-topbar .waw-topbar-btn > div,
  #waw-custom-topbar .waw-topbar-btn svg {
    pointer-events: none;
    display: flex;
    justify-content: center;
    align-items: center;
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
    width: var(--waw-cw) !important;
    min-width: var(--waw-cw) !important;
    max-width: var(--waw-cw) !important;
    height: 100% !important;
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
      width: 56px !important;
      min-width: 56px !important;
      max-width: 56px !important;
      height: 56px !important;
      margin: 8px auto !important; /* Yatayda mükemmel matematiksel ortalama! */
      padding: 0 !important;
      border-radius: 14px !important; /* Seçili olduğunda arkasındaki harika yumuşak kutu */
      box-sizing: border-box !important;
  }

  /* Avatarın Kendisi (Cell Frame içindeki resim kutusu) */
  body.waw-compact ._ak8q > div:first-child,
  body.waw-compact [data-testid="cell-frame-container"] > div:first-child {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      width: 48px !important;
      min-width: 48px !important;
      max-width: 48px !important;
      height: 48px !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
  }

  /* Avatar Dışındaki Mesaj/İsim Özeti Gizle */
  body.waw-compact ._ak8q > :nth-child(n+2),
  body.waw-compact [data-testid="cell-frame-container"] > :nth-child(n+2) {
      display: none !important;
  }

  /* --- 5. GEREKSİZ LİSTE BAŞLIKLARINI GİZLE (Sıkışıklığı Engeller) --- */
  body.waw-compact #waw-compact-sidebar-col header,
  body.waw-compact #side header,
  body.waw-compact [data-testid="chat-list-search-container"] {
    display: none !important;
  }

  /* 6. Tooltip (Hover kısmında isim çıksın) */
  body.waw-compact [data-waw-name] {
    position: relative !important;
  }
  body.waw-compact [data-waw-name]::after {
    content: attr(data-waw-name);
    position: absolute;
    left: calc(100% + 8px);
    top: 50%;
    transform: translateY(-50%);
    background: #111b21;
    color: #e9edef;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 8px;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    opacity: 0;
    transition: opacity var(--waw-tr);
    z-index: 9999;
  }
  body.waw-compact [data-waw-name]:hover::after {
    opacity: 1;
  }

  /* KULLANICI ÖZEL SINIF GEÇERSİZ KILMALARI (USER DIRECT OVERRIDES) */
  body.waw-compact ._ak8h {
      display: flex !important;
      flex: none !important;
      align-items: center !important;
      padding: 0 var(--chat-spacing) 0 2px !important;
      margin-top: -1px !important;
  }

  body.waw-compact ._ap1- {
      border-radius: 12px !important;
      margin-left: 2px !important;
      margin-right:2px !important;
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
      const buttons = col.querySelectorAll('[role="button"], [role="tab"], button');
      buttons.forEach((originalBtn, idx) => {
          let label = originalBtn.getAttribute('aria-label') || originalBtn.getAttribute('title') || originalBtn.querySelector('span[data-icon]')?.getAttribute('data-icon') || 'btn-' + idx;
          let safeLabel = label.trim().replace(/['"\s]/g, '-');
          try { safeLabel = CSS.escape(safeLabel); } catch(e) {}

          let clone = null;
          try { clone = topBar.querySelector(`[data-waw-label="${safeLabel}"]`); } catch(e) {}

          if (!clone) {
              clone = document.createElement('div');
              clone.className = 'waw-topbar-btn';
              clone.setAttribute('data-waw-label', safeLabel);
              
              clone.addEventListener('click', () => originalBtn.click());
              
              // Sağ gruplama (Settings / Profil). Bunlardan ilkine marginLeft:auto atarsak sağa itilirler.
              const t = label.toLowerCase();
              if (t.includes('setting') || t.includes('ayarlar') || t.includes('profile') || t.includes('profil') || t.includes('default-user')) {
                  if (!topBar.querySelector('.waw-pushed-right')) {
                      clone.style.marginLeft = 'auto'; // Sadece ilk sağa geçene auto ver
                      clone.classList.add('waw-pushed-right');
                  }
              }
              topBar.appendChild(clone);
          }
          
          // WhatsApp'ın SVG'sini direkt kopyala (nokta veya okundu verisi varsa anında geçer)
          if (clone.innerHTML !== originalBtn.innerHTML) {
              clone.innerHTML = originalBtn.innerHTML;
          }
      });
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
  
  if (!isCompact) return;

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
  startResize();
  startMutation();
  log('Sistem aktif ✓');
}

log('Bekleniyor...');
waitReady(bootstrap);
