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

  #waw-custom-topbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 54px;
    z-index: 999999;
    /* Glassmorphism Effect */
    background-color: rgba(24, 24, 27, 0.8) !important;
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
    width: 40px;
    height: 40px;
    margin: 0 6px;
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

  /* =========================================================
     APPLE iMESSAGE / GLASS PREMIUM THEME - GLOBAL
     Daha ferah, aydınlık ve enerjik (Vibrant Azure & Soft Zinc)
     ========================================================= */
  body.dark,
  html.dark {
      /* Daha aydınlık/ferah bir Koyu Mod Zemin (Zinc 900/950) */
      --background-default: #18181b !important; /* Sohbet Listesi Sol */
      --background-default-hover: #27272a !important;
      --background-default-active: #27272a !important;
      
      --panel-background-lighter: #18181b !important;
      --panel-background-deep: #09090b !important; 
      --panel-background: #18181b !important;
      --panel-background-rgb: 24, 24, 27 !important;
      --panel-background-hover: #27272a !important;
      
      /* Chat Paneli Wallpaper Katmanı (Çok daha ferah siyaha kaçmayan renk) */
      --chat-background: #09090b !important;
      --bg-folder: #09090b !important;
      
      /* Gelen (Açık Gri) ve Giden (Canlı Azure/Apple Mavi) Balonlar */
      --incoming-background: #27272a !important;
      --incoming-background-rgb: 39, 39, 42 !important;
      --outgoing-background: #0ea5e9 !important; /* Apple iMessage tarzı muazzam Mavi */
      --outgoing-background-rgb: 14, 165, 233 !important;
      --outgoing-background-deeper: #0284c7 !important;

      /* Metin ve İkon Renkleri - Yüksek Kontrast */
      --primary: #f8fafc !important; /* Net Beyaz Metinler */
      --primary-strong: #ffffff !important;
      --secondary: #a1a1aa !important; /* İnce Gri Alt Başlıklar */
      --secondary-lighter: #d4d4d8 !important;
      --icon: #a1a1aa !important; /* Zengin İkon Renkleri */
      --icon-fixed: #a1a1aa !important;
      --icon-lighter: #ffffff !important;
      --icon-search-back: #0ea5e9 !important;
      
      /* Vurgu Rengi (Mesaj Oku Tikleri vb. veya Butonlar) */
      --teal-light: #7dd3fc !important; /* Açık Mavi (Okundu tikler vb.) */
      --teal: #0ea5e9 !important;
      --teal-rgb: 14, 165, 233 !important;
      --drawer-header-title: #f8fafc !important;
      --highlight: #0ea5e9 !important;
      --panel-header-background: #18181b !important;
      
      /* Arama Kutusu ve Input (Mesaj Yazma Alanı) - Zarif Yuvarlak Hatlar */
      --search-input-background: #27272a !important;
      --compose-input-background: #27272a !important;
      --compose-input-border: transparent !important;
  }

  /* Yumuşatılmış Köşeler (Sleek Geometric Rounding) */
  .copyable-area,
  [data-testid="conversation-panel-wrapper"],
  #main {
      border-top-left-radius: 20px !important;
      /* Cam çeperli kenarlık */
      border-left: 1px solid rgba(255,255,255,0.04) !important;
      border-top: 1px solid rgba(255,255,255,0.04) !important;
  }

  /* Chat Balonlarının (Bubbles) Köşelerini Modernleştir (Ovalimsi / Glass) */
  [data-testid="msg-container"] {
      border-radius: 22px !important; /* Çok daha yuvarlak ve organik */
      box-shadow: 0 4px 14px rgba(0,0,0,0.15) !important; /* Ferah Derinlik */
      border: 1px solid rgba(255,255,255,0.06) !important; /* Mesaj balonlarına hafif cam çerçevesi */
      padding: 0 4px !important; /* Çok hafif ekstra dolgu hissiyatı */
  }

  /* Mikro Animasyonlar: Sohbet Listesi Hoverl Efekti */
  ._ak8q,
  [data-testid="cell-frame-container"] {
      transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
      border: 1px solid transparent !important;
  }
  
  ._ak8q:hover,
  [data-testid="cell-frame-container"]:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
      background-color: var(--background-default-hover) !important;
      border-radius: 14px !important;
      border: 1px solid rgba(255,255,255,0.05) !important; /* Hover da parlayan cam viyadük */
  }
  
  /* Input Alanlarını Yumuşat (Apple iOS Yuvarlak Mesaj Yazma Kutusu) */
  [data-testid="conversation-compose-box-input"] {
      border-radius: 30px !important;
      padding: 14px 22px !important; /* Daha da ferah ve esnek input text alanı */
      border: 1px solid rgba(255,255,255,0.05) !important; /* Metin giriş kısmında glassy parıltı */
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
