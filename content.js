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
let navRailElement = null; // Persistent reference to the navigation rail
const colorCache = new Map(); // Cache for profile picture colors
const sharedCanvas = document.createElement('canvas');
const sharedCtx = sharedCanvas.getContext('2d', { willReadFrequently: true });
sharedCanvas.width = 16;
sharedCanvas.height = 16;

function log(...a) { console.log('%c[WAW Compact]', 'color:#00a884;font-weight:bold', ...a); }

// ULTRA-GLOBAL DEBUG
window.addEventListener('pointerdown', (e) => {
    if (document.body.classList.contains('waw-compact')) {
        log('Pointerdown (GLOBAL):', e.target.tagName, e.target.className);
    }
}, { capture: true, passive: true });

// ── Navigasyon ve Layout Yardımcıları ───────────────────────────

// Profil resminden baskın rengi çıkar (CORS-safe ve Hızlı)
async function getDominantColor(source) {
    if (!source) return null;
    const src = typeof source === 'string' ? source : source.src;
    if (!src) return null;
    if (colorCache.has(src)) return colorCache.get(src);

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        
        img.onload = () => {
            try {
                sharedCtx.clearRect(0, 0, 16, 16);
                sharedCtx.drawImage(img, 0, 0, 16, 16);
                const data = sharedCtx.getImageData(0, 0, 16, 16).data;
                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 4) {
                    r += data[i]; g += data[i+1]; b += data[i+2]; count++;
                }
                const color = `rgb(${Math.round(r/count)}, ${Math.round(g/count)}, ${Math.round(b/count)})`;
                colorCache.set(src, color);
                log('Renk çıkarıldı:', src.substring(0, 30), '->', color);
                resolve(color);
            } catch (e) {
                log('CORS Hatası veya Analiz Başarısız:', src.substring(0, 50));
                resolve(null);
            }
        };
        img.onerror = () => {
            log('Resim yükleme hatası:', src.substring(0, 50));
            resolve(null);
        };
    });
}

// Rengi ANINDA uygula (Debounce beklemeden)
async function syncColorImmediately(img) {
    if (!img) return;
    const color = await getDominantColor(img);
    if (color) {
        // color is "rgb(r, g, b)"
        const match = color.match(/\d+/g);
        if (match && match.length === 3) {
            const r = parseInt(match[0]);
            const g = parseInt(match[1]);
            const b = parseInt(match[2]);
            
            // Calculate luminance to determine if background is light or dark
            // Formula: (0.299*R + 0.587*G + 0.114*B)
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
            
            if (luminance < 128) {
                // Background is DARK -> Doodles should be LIGHT
                document.body.classList.remove('waw-bg-light');
                document.body.classList.add('waw-bg-dark');
            } else {
                // Background is LIGHT -> Doodles should be DARK
                document.body.classList.remove('waw-bg-dark');
                document.body.classList.add('waw-bg-light');
            }
            
            // Set the background tint (using user's chosen 0.75 opacity for strong effect)
            document.body.style.setProperty('--waw-doodle-layer', `rgba(${r}, ${g}, ${b}, 0.75)`);
        }
    } else {
        document.body.style.setProperty('--waw-doodle-layer', 'transparent');
        document.body.classList.remove('waw-bg-light', 'waw-bg-dark');
    }
}

// Sidebar'daki diğer kişilerin renklerini önceden hafızaya al
function preCacheColors() {
    const avatars = document.querySelectorAll('#pane-side img, [data-testid="chat-list"] img');
    avatars.forEach(img => {
        if (img.complete && img.naturalWidth > 0) {
            getDominantColor(img);
        }
    });
}

// Navigasyon Sütununu Yapısal Değil "Fiziksel" Olarak Bul (Kusursuz Yöntem)
function getFarLeftColumn() {
    if (navRailElement && document.body.contains(navRailElement)) return navRailElement;

    const side = document.querySelector('#side') || document.querySelector('._ak9p');
    if (!side) return null;

    // WhatsApp'ın ana düzen kapsayıcısı genellikle .two veya .three class'ına sahiptir.
    const container = side.closest('.two, .three') || side.parentElement?.parentElement;
    if (!container) return null;

    // Rail genellikle ilk çocuktur (eğer varsa)
    const firstChild = container.children[0];
    if (firstChild && firstChild !== side.parentElement) {
        // İçinde Ayarlar veya Profil ikonu var mı kontrol et
        const hasNavIcon = firstChild.querySelector('[data-icon*="settings"], [data-icon*="chat"], [data-icon*="status"], [aria-label*="Settings"], [aria-label*="Ayarlar"]');
        if (hasNavIcon) {
            navRailElement = firstChild;
            if (!navRailElement.classList.contains('waw-nav-rail')) {
                navRailElement.classList.add('waw-nav-rail');
            }
            return navRailElement;
        }
    }

    // Fallback: Ayarlar ikonundan yukarı çık
    const settingsIcon = document.querySelector('[data-icon*="settings"], [aria-label*="Settings"], [aria-label*="Ayarlar"]');
    if (settingsIcon) {
        let p = settingsIcon.parentElement;
        while (p && p !== document.body) {
            if (p.parentElement === container) {
                navRailElement = p;
                if (!navRailElement.classList.contains('waw-nav-rail')) {
                    navRailElement.classList.add('waw-nav-rail');
                }
                return navRailElement;
            }
            p = p.parentElement;
        }
    }

    return null;
}

function syncCustomTopBar() {
  if (!isCompact) {
      restoreOriginalLayout();
      return;
  }

  // 1. Ayarlar / Profil ikonunu bularak Menüyü GÜVENLİ BİR ŞEKİLDE fiziksel boyutuyla tespit et
  const col = getFarLeftColumn();

  if (col) {
      if (!col.classList.contains('waw-nav-rail')) {
          col.classList.add('waw-nav-rail');
      }
      // CSS is handling the hiding via .waw-nav-rail and body.waw-compact
      // but ensure no transition-breaking inline styles are present
      col.style.display = ''; 
      col.style.visibility = '';

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
          
          const lowerLabel = label.toLowerCase();
          
          // WhatsApp logosunu üst barda İSTEMİYORUZ.
          let safeLabel = label.trim().replace(/['"\s]/g, '-');
          try { safeLabel = CSS.escape(safeLabel); } catch(e) {}

          // WhatsApp logosunu üst barda İSTEMİYORUZ.
          if (lowerLabel.includes('whatsapp') || lowerLabel.includes('logo')) {
              const existingClone = topBar.querySelector(`[data-waw-label="${safeLabel}"]`);
              if (existingClone) existingClone.remove();
              return;
          }

          let clone = topBar.querySelector(`[data-waw-label="${safeLabel}"]`);

          if (!clone) {
              clone = document.createElement('div');
              clone.className = 'waw-topbar-btn';
              clone.setAttribute('data-waw-label', safeLabel);
              
              clone.addEventListener('click', () => {
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
                          originalBtn.click();
                      }
                  } else {
                      originalBtn.click();
                  }
              });
              
              const t = label.toLowerCase();
              
              const existingButtons = topBar.querySelectorAll('.waw-topbar-btn');
              if (existingButtons.length === 1) {
                  createSpecialSearchButton(topBar);
              }
              topBar.appendChild(clone);
          }
          
          if (clone.innerHTML !== originalBtn.innerHTML) {
              clone.innerHTML = originalBtn.innerHTML;
          }

          // CLEAN CLONED STYLES: Prevent overflow from original absolute/fixed styles
          clone.style.position = 'static'; // Use static to stay in flex
          clone.style.left = 'auto';
          clone.style.top = 'auto';
          clone.style.transform = 'none';
          clone.style.margin = '0 5px';
          clone.style.padding = '0';
          clone.style.display = 'flex';
          clone.style.width = '34px';
          clone.style.height = '34px';
          clone.style.flex = '0 0 auto';
          
          // Remove any problematic classes that might have fixed positions
          clone.classList.remove('x10l6tqk', 'xh8yej3', 'x1g42fcv', 'x1y1aw1k', 'xw2cs43', 'x1qv4bc5', 'xw4jn90');

          const svg = clone.querySelector('svg');
          if (svg) {
              svg.style.width = '24px';
              svg.style.height = '24px';
              svg.style.position = 'static';
              svg.style.transform = 'none';
              svg.style.margin = '0';
          }
      });

      // --- SCALE DOWN IF TOO MANY ICONS ---
      const iconCount = topBar.querySelectorAll('.waw-topbar-btn').length;
      if (iconCount > 8) {
          topBar.style.gap = '2px';
          topBar.querySelectorAll('.waw-topbar-btn').forEach(b => {
              b.style.margin = '0 2px';
              b.style.width = '30px';
          });
      }

      // --- Üst Bar En Sağa "More Vert" Butonu Proxy Olarak Ekle ---
      createSpecialMoreButton(topBar);

      // --- LİSTE ÜSTÜ BUTON GRUBU OLUŞTUR (Sadece New Chat) ---
      createListHeaderButtons();

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

// ── Tam Restorasyon (Orijinal Hale Dönüş) ───────────────────────
function restoreOriginalLayout() {
    log('Orijinal yerleşime dönülüyor...');

    // 1. Custom Elementleri Gizle/Temizle
    const topBar = document.getElementById('waw-custom-topbar');
    if (topBar) {
        topBar.style.display = 'none';
        topBar.innerHTML = ''; // Butonları temizle ki tekrar açıldığında sıfırdan gelsin
    }

    const dd = document.getElementById('waw-search-dropdown');
    if (dd) {
        dd.classList.remove('open');
        const sBtn = document.querySelector('[data-waw-special="search"]');
        if (sBtn) sBtn.classList.remove('active');
    }

    const tip = document.getElementById('waw-tooltip');
    if (tip) tip.classList.remove('visible');

    // 2. Arama Kutusunu Eski Yerine Koy
    const stash = document.getElementById('waw-search-stash');
    const nativeSearchContainer = 
        document.querySelector('[data-testid="chat-list-search-container"]') || 
        (stash && stash.firstElementChild);

    if (nativeSearchContainer) {
        const side = document.querySelector('#side') || document.querySelector('._ak9p');
        if (side) {
            // Arama kutusunun orijinal yerini bularak geri koy
            const searchPlace = side.querySelector('._ai04') || 
                                side.querySelector('[data-testid="chat-list-search-container"]') ||
                                side.firstElementChild;
            if (searchPlace && !searchPlace.contains(nativeSearchContainer)) {
                side.insertBefore(nativeSearchContainer, side.children[1] || null);
            }
        }
    }

    // 3. Gizlenen Navigasyon Sütununu Geri Getir
    const hiddenCol = navRailElement || 
                      document.querySelector('.waw-nav-rail') ||
                      document.getElementById('waw-nav-col-hidden') ||
                      getFarLeftColumn();
                      
    if (hiddenCol) {
        hiddenCol.style.display = '';
        hiddenCol.style.visibility = '';
        hiddenCol.style.width = '';
        hiddenCol.style.opacity = '';
        hiddenCol.style.pointerEvents = '';
        hiddenCol.style.flex = '';
        hiddenCol.style.margin = '';
        hiddenCol.style.padding = '';
        if (hiddenCol.id === 'waw-nav-col-hidden') hiddenCol.removeAttribute('id');
        hiddenCol.removeAttribute('data-waw-nav-col');
        // Class kalsın, CSS body.waw-compact olmadığı sürece bir şey yapmaz
    }

    // 4. "More" Butonu ve Diğer Opacity Değerlerini Sıfırla
    const moreSelector = '[data-icon="menu"], [aria-label="Menu"], [title="Menu"], [aria-label="Menü"], [title="Menü"]';
    const originalMore = document.querySelector(`#side header ${moreSelector}`) || 
                         document.querySelector(`._ak9p header ${moreSelector}`);
    if (originalMore) {
        originalMore.style.opacity = '1';
        originalMore.style.pointerEvents = 'auto';
        originalMore.style.position = '';
        originalMore.style.width = '';
        originalMore.style.height = '';
        originalMore.style.overflow = '';
        originalMore.style.zIndex = '';
    }

    // 5. Filtre Butonlarını Geri Getir
    const sideCol = document.getElementById('waw-compact-sidebar-col') || document.querySelector('#side, ._ak9p')?.parentElement;
    if (sideCol) {
        const hiddenFilters = sideCol.querySelectorAll('[style*="display: none"]');
        hiddenFilters.forEach(el => {
            const text = el.textContent.toLowerCase().trim();
            if (text === 'all' || text === 'tümü' || text === 'unread' || text === 'okunmayanlar' || 
                text === 'favourites' || text === 'favoriler' || text === 'groups' || text === 'gruplar' ||
                (el.clientHeight > 0 && el.clientHeight < 60)) {
                el.style.display = '';
            }
        });
        if (sideCol.id === 'waw-compact-sidebar-col') sideCol.removeAttribute('id');
    }

    // 6. Pane IDs Temizle
    const mainPaneCol = document.getElementById('waw-chat-pane-col');
    if (mainPaneCol) mainPaneCol.removeAttribute('id');

    // 7. Pulse ve Ring Class'larını Temizle
    document.querySelectorAll('.waw-typing-pulse, .waw-selected-ring').forEach(el => {
        el.classList.remove('waw-typing-pulse', 'waw-selected-ring');
    });
    document.querySelectorAll('.waw-typing-pulse-img').forEach(el => {
        el.classList.remove('waw-typing-pulse-img');
    });

    log('Restorasyon tamamlandı ✓');

    // WhatsApp'ın kendi render döngüsüyle çakışmamak için kısa bir süre sonra tekrar kontrol edelim
    setTimeout(() => {
        const side = document.querySelector('#side') || document.querySelector('._ak9p');
        
        // Arama kutusu kontrolü
        if (side && !side.querySelector('[data-testid="chat-list-search-container"]')) {
            const stash = document.getElementById('waw-search-stash');
            const search = document.querySelector('[data-testid="chat-list-search-container"]') || (stash && stash.firstElementChild);
            if (search) side.insertBefore(search, side.children[1] || null);
        }

        // Navigasyon Rail kontrolü (Ekstra Agresif)
        const rail = navRailElement || document.querySelector('.waw-nav-rail') || getFarLeftColumn();
        if (rail) {
            rail.style.display = '';
            rail.style.visibility = '';
            rail.style.opacity = '';
            rail.style.pointerEvents = '';
            rail.style.width = '';
            rail.style.flex = '';
        }
    }, 500);
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

  function createSpecialMoreButton(parent) {
      const moreSelector = '[data-icon="menu"], [aria-label="Menu"], [title="Menu"], [aria-label="Menü"], [title="Menü"]';
      const originalMore = document.querySelector(`#side header ${moreSelector}`) || 
                           document.querySelector(`._ak9p header ${moreSelector}`);

      if (!originalMore) return;

      let proxy = parent.querySelector('[data-waw-special="more-proxy"]');
      if (!proxy) {
          proxy = document.createElement('div');
          proxy.className = 'waw-topbar-btn';
          proxy.setAttribute('data-waw-special', 'more-proxy');
          proxy.setAttribute('title', 'Menü');
          parent.appendChild(proxy);

          proxy.addEventListener('click', (e) => {
              const currentOriginal = document.querySelector(`#side header ${moreSelector}`) || 
                                      document.querySelector(`._ak9p header ${moreSelector}`);
              if (currentOriginal) {
                  currentOriginal.click();
              }
          });
      }

      if (proxy.innerHTML !== originalMore.innerHTML) {
          proxy.innerHTML = originalMore.innerHTML;
      }
      
      if (originalMore.style.opacity !== '0.01') {
          originalMore.style.opacity = '0.01';
          originalMore.style.pointerEvents = 'none';
          originalMore.style.position = 'absolute';
          originalMore.style.width = '1px';
          originalMore.style.height = '1px';
          originalMore.style.overflow = 'hidden';
          originalMore.style.zIndex = '-1';
      }
  }

  function createListHeaderButtons() {
      // Artık gerek yok, her şey üst barda toplandı.
      const listHeader = document.getElementById('waw-list-header-btns');
      if (listHeader) listHeader.remove();
  }

  function cleanOriginalButtonStyle(el) {
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.margin = '0';
      el.style.padding = '10px';
      el.style.background = 'none';
      el.style.width = 'auto';
      el.style.height = 'auto';
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.position = 'static';
      el.style.zIndex = 'auto';
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
      const name = title.textContent.trim();
      row.dataset.wawName = name;
      // Tooltip için data-waw-name'i de [role="row"] parent'ına ekle
      const rowEl = row.closest('[role="row"]');
      if (rowEl) rowEl.dataset.wawName = name;
    }
  });

  syncChatHeaderBackground();
  syncTypingStatus();
  syncSelectedHighlight();
  
  // Arka planda renkleri hafızaya al (lag önlemek için)
  if (mutationCount % 5 === 0) preCacheColors();
  mutationCount++;
}

// Seçili chat avatarına daire highlight ekle (JS class injection)
function syncSelectedHighlight() {
    if (!isCompact) return;

    // Önce tüm eski ring class'larını temizle
    document.querySelectorAll('.waw-selected-ring').forEach(el => {
        el.classList.remove('waw-selected-ring');
    });

    const selectedEls = document.querySelectorAll(
        '#pane-side [aria-selected="true"], [data-testid="chat-list"] [aria-selected="true"]'
    );

    selectedEls.forEach(sel => {
        const img = sel.querySelector('img');
        if (img && img.parentElement) {
            img.parentElement.classList.add('waw-selected-ring');
        }
    });
}

// "Yazıyor..." durumunu kontrol et ve pulse efekti ekle
function syncTypingStatus() {
    if (!isCompact) return;
    
    // 1. Sidebar Rows
    const rows = document.querySelectorAll('#pane-side [role="row"], [data-testid="chat-list"] [role="row"]');
    rows.forEach(row => {
        const statusElem = row.querySelector('._ak8j') || row.querySelector('._ak8l');
        const avatarImg = row.querySelector('img');
        
        if (statusElem && avatarImg) {
            const avatarTarget = avatarImg.parentElement; // Parent Anchor
            const text = statusElem.textContent.toLowerCase();
            const isTyping = text.includes('typing') || text.includes('yazıyor') || 
                             text.includes('recording') || text.includes('kaydediyor');
            
            if (isTyping) {
                if (!avatarTarget.classList.contains('waw-typing-pulse')) {
                    avatarTarget.classList.add('waw-typing-pulse');
                    avatarImg.classList.add('waw-typing-pulse-img');
                }
            } else {
                avatarTarget.classList.remove('waw-typing-pulse');
                avatarImg.classList.remove('waw-typing-pulse-img');
            }
        }
    });

    // 2. Chat Header
    const header = document.querySelector('#main header');
    if (header) {
        // Status element broader detection (WhatsApp updates classes frequently)
        const headerStatus = header.querySelector('[data-testid="chat-subtitle"]') || 
                             header.querySelector('._aj-8') ||
                             header.querySelector('span.x1rg5ohu') ||
                             header.querySelector('.y304m08c');
        const headerImg = header.querySelector('img');
        
        if (headerStatus && headerImg) {
            const headerTarget = headerImg.parentElement; // Immediate Parent
            const text = headerStatus.textContent.toLowerCase();
            const isTyping = text.includes('typing') || text.includes('yazıyor') || 
                             text.includes('recording') || text.includes('kaydediyor');
            
            if (isTyping) {
                if (!headerTarget.classList.contains('waw-typing-pulse')) {
                    headerTarget.classList.add('waw-typing-pulse');
                    headerImg.classList.add('waw-typing-pulse-img');
                }
            } else {
                headerTarget.classList.remove('waw-typing-pulse');
                headerImg.classList.remove('waw-typing-pulse-img');
            }
        }
    }
}

// Sohbet header'ına profil resmini bulanık arkaplan olarak ata
function syncChatHeaderBackground() {
    if (!isCompact) return;
    const header = document.querySelector('#main header');
    if (!header) return;
    
    // Header içindeki ilk resmi (avatarı) bul
    const avatar = header.querySelector('img');
    if (avatar && avatar.src) {
        const bgUrl = `url("${avatar.src}")`;
        if (header.style.getPropertyValue('--header-bg-image') !== bgUrl) {
            header.style.setProperty('--header-bg-image', bgUrl);
            
            // NEW: Duvar kağıdı desenini (doodles) renklendir
            getDominantColor(avatar).then(color => {
                if (color) {
                    document.body.style.setProperty('--waw-doodle-color', color);
                }
            });
        }
    } else {
        header.style.removeProperty('--header-bg-image');
        document.body.style.removeProperty('--waw-doodle-color');
    }
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
    restoreOriginalLayout();
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
    timer = setTimeout(() => {
        annotateRows();
        syncCustomTopBar();
    }, 80); 
  });
  const target = document.getElementById('app') || document.body;
  mutationObserver.observe(target, { childList: true, subtree: true });
}

function initEventListeners() {
    // Sohbete tıklandığında (veya basıldığında) anında highlight ve RENK güncelle
    // 'pointerdown' kullanıyoruz çünkü WhatsApp mobil/modern etkileşimlerde 'click' veya 'mousedown' durdurabiliyor.
    window.addEventListener('pointerdown', (e) => {
        if (!isCompact) return;
        const target = e.target;
        const row = target.closest('[role="row"]') || 
                    target.closest('[role="gridcell"]') ||
                    target.closest('._ak8q') || 
                    target.closest('[data-testid="cell-frame-container"]') || 
                    target.closest('[data-testid="list-item"]') ||
                    target.closest('._agum');
        
        if (row) {
            log('Pointerdown algılandı:', row.dataset.wawName || 'Bilinmeyen Sohbet');
            // 1. Renk anında (Sidebar avatarından al)
            const sideAvatar = row.querySelector('img');
            if (sideAvatar) {
                syncColorImmediately(sideAvatar);
            }

            // 2. Highlight'ı biraz sonra güncelle ki WhatsApp'ın seçimi tamamlansın
            setTimeout(syncSelectedHighlight, 80);
            
            // 3. Header delay'ini önlemek için tıklar tıklamaz header sync'i çalıştır
            setTimeout(syncCustomTopBar, 10);
            setTimeout(syncCustomTopBar, 150); // Fallback for delayed loads
        }
    }, { capture: true, passive: true });

    // Hover anında pre-cache yap ki tıklandığında renk hazır olsun
    document.addEventListener('mouseover', (e) => {
        if (!isCompact) return;
        const target = e.target;
        const row = target.closest('[role="row"]') || target.closest('._ak8q') || target.closest('._agum');
        if (row && !row.dataset.wawPrecached) {
            const img = row.querySelector('img');
            if (img) {
                getDominantColor(img);
                row.dataset.wawPrecached = 'true';
            }
        }
    }, { capture: true, passive: true });
}

// ── Floating Tooltip ───────────────────────────────────────────
function initTooltip() {
  if (document.getElementById('waw-tooltip')) return;

  const tip = document.createElement('div');
  tip.id = 'waw-tooltip';
  document.body.appendChild(tip);

  document.addEventListener('mouseover', (e) => {
    if (!isCompact) return;
    const row = e.target.closest('#pane-side [role="row"], [data-testid="chat-list"] [role="row"]');
    if (!row || !row.dataset.wawName) return;

    tip.textContent = row.dataset.wawName;
    const rect = row.getBoundingClientRect();
    tip.style.left = (rect.right + 12) + 'px';
    tip.style.top = (rect.top + rect.height / 2) + 'px';
    tip.style.transform = 'translateY(-50%)';
    tip.classList.add('visible');
  }, { passive: true });

  document.addEventListener('mouseout', (e) => {
    const row = e.target.closest('#pane-side [role="row"], [data-testid="chat-list"] [role="row"]');
    if (row) tip.classList.remove('visible');
  }, { passive: true });
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
  
  // Stash ve Dropdown yapılarını önden hazırla (Hızlı müdahale için)
  if (!document.getElementById('waw-search-stash')) {
      const stash = document.createElement('div');
      stash.id = 'waw-search-stash';
      stash.style.display = 'none';
      document.body.appendChild(stash);
  }
  
  startResize();
  startMutation();
  initTooltip();
  initEventListeners();
  log('Sistem aktif ✓');
}

log('Bekleniyor...');
waitReady(bootstrap);
// --- POPUP / MENU FIXER ---
function startMenuObserver() {
    const observer = new MutationObserver((mutations) => {
        if (!document.body.classList.contains('waw-compact')) return;
        
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // ELEMENT_NODE
                    if (node.getAttribute('role') === 'application' || 
                        node.getAttribute('role') === 'dialog' || 
                        node.querySelector('[style*="transform-origin"]') ||
                        node.classList.contains('x1qjc9v5')) {
                        
                        const rect = node.getBoundingClientRect();
                        const topBar = document.getElementById('waw-custom-topbar');
                        const topOffset = topBar ? topBar.offsetHeight : 60;

                        node.style.zIndex = '2000001';
                        node.style.position = 'fixed';
                        node.style.top = topOffset + 'px';
                        
                        // Dinamik yerleşim: ekranın ortasından biraz sağa
                        const app = document.getElementById('app');
                        const containerWidth = app ? app.offsetWidth : 500;
                        const screenMid = window.innerWidth / 2;
                        const leftPos = screenMid + (containerWidth / 4);

                        node.style.left = leftPos + 'px';
                        node.style.right = 'auto';
                        node.style.transform = 'none';
                        node.style.display = 'block';
                        node.style.visibility = 'visible';
                        node.style.opacity = '1';

                        const innerMenu = node.querySelector('.x1qjc9v5, ._ak9v, ._ak9w');
                        if (innerMenu) {
                            innerMenu.style.transform = 'none';
                            innerMenu.style.opacity = '1';
                            innerMenu.style.visibility = 'visible';
                        }
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: false });
}

// Global başlatma
startMenuObserver();
