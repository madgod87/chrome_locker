
// content_script.js - injects a beautiful fullscreen overlay with animated butterflies
(function () {
  if (window.__browserLockerInjected) return;
  window.__browserLockerInjected = true;

  let shadowRoot = null;
  let hostElement = null;

  // overlay creation
  function createOverlay() {
    if (hostElement) return; // already exists

    // Create host and shadow
    hostElement = document.createElement('div');
    hostElement.id = 'bl-host';
    // attachShadow with mode closed to isolate
    shadowRoot = hostElement.attachShadow({ mode: 'closed' });

    // Create Styles
    const style = document.createElement('style');
    style.textContent = `
    /* basic resets */
    :host { all: initial; z-index: 2147483647; position: fixed; inset: 0; display: block; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; }
    #bl-overlay { 
      position: fixed; inset: 0; 
      display:flex; align-items:center; justify-content:center; 
      background: radial-gradient(circle at 50% 10%, #1e1b4b 0%, #020617 80%);
      backdrop-filter: blur(4px); overflow: hidden; 
    }
    
    #bl-card { 
      position: relative; 
      z-index: 10;
      width: 400px; 
      max-width: 90%;
      border-radius: 24px; 
      background: rgba(15, 23, 42, 0.6); 
      backdrop-filter: blur(20px);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.1);
      display:flex; 
      flex-direction: column;
      padding: 40px;
      gap: 20px;
      text-align: center;
      color: #fff;
    }

    #bl-icon { font-size: 48px; margin-bottom: 8px; filter: drop-shadow(0 0 15px rgba(244,114,182,0.5)); }
    #bl-title{ font-size:24px; font-weight:700; color:#fff; letter-spacing: -0.5px; background: linear-gradient(to right, #fff, #cbd5e1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    #bl-sub{ color:#94a3b8; font-size:14px; line-height: 1.5; }
    
    #bl-input-wrap { position: relative; width: 100%; margin-top: 8px; }
    #bl-input{ 
      width:100%; box-sizing: border-box; 
      padding:14px; 
      border-radius:12px; 
      border:1px solid rgba(255,255,255,0.1); 
      background: rgba(0,0,0,0.4); 
      color:#fff; 
      font-family: inherit; font-size: 16px; 
      outline: none; 
      transition: all 0.2s; 
    }
    #bl-input:focus { border-color: #8b5cf6; background: rgba(0,0,0,0.6); box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2); }
    #bl-input::placeholder { color: rgba(255,255,255,0.3); }

    #bl-btn{ 
      width: 100%;
      padding:14px; 
      border-radius:12px; 
      border:none; cursor:pointer; 
      font-weight:600; font-size: 15px;
      background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
      color:#fff; 
      transition: transform 0.1s, opacity 0.2s;
      margin-top: 4px;
      box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    #bl-btn:hover { opacity: 0.95; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(236, 72, 153, 0.4); }
    #bl-btn:active { transform: translateY(1px); }
    
    #bl-msg{ min-height:20px; color:#fca5a5; font-size:13px; margin-top: 4px;}

    /* Butterfly Background */
    #butterfly-container {
      position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden;
    }
    .butterfly-mover {
      position: absolute;
      top: 0; left: 0;
      width: 120px; height: 120px;
      will-change: transform;
    }
    .butterfly-visual {
      width: 100%; height: 100%;
      animation: flutter 0.8s ease-in-out infinite alternate;
      transform-origin: center;
    }
    
    /* Slight variation in flutter speed for realism */
    .b1 .butterfly-visual { animation-duration: 0.7s; }
    .b2 .butterfly-visual { animation-duration: 0.5s; }
    .b3 .butterfly-visual { animation-duration: 0.8s; }
    .b4 .butterfly-visual { animation-duration: 0.6s; }

    @keyframes flutter {
      0% { transform: scaleX(1); }
      50% { transform: scaleX(0.7); } /* Simple squeeze */
      100% { transform: scaleX(1); }
    }
    `;
    shadowRoot.appendChild(style);

    // Structure
    const overlay = document.createElement('div');
    overlay.id = 'bl-overlay';
    overlay.innerHTML = `
      <div id="butterfly-container"></div>
      <div id="bl-card">
        <div id="bl-icon">🦋</div>
        <div id="bl-content">
          <div id="bl-title">Session Locked</div>
          <div id="bl-sub">Enter your password to resume your journey.</div>
          <div id="bl-input-wrap">
            <input id="bl-input" type="password" placeholder="Password" />
          </div>
          <div id="bl-msg"></div>
          <button id="bl-btn">Unlock</button>
        </div>
      </div>
    `;
    shadowRoot.appendChild(overlay);

    document.documentElement.appendChild(hostElement);

    // Initialize Butterflies
    const container = shadowRoot.getElementById('butterfly-container');

    // SVG Builder
    function butterflySVG(c1, c2, id) {
      const uniqueId = `g_${id}_${Math.random().toString(36).substr(2, 9)}`;
      return `
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 12px ${c1}); overflow: visible;">
          <defs>
             <linearGradient id="${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stop-color="${c1}" />
               <stop offset="100%" stop-color="${c2}" />
             </linearGradient>
          </defs>
          <g transform="rotate(180, 12, 12)">
             <!-- Antennae -->
             <path d="M12 19 L10 22 M12 19 L14 22" stroke="rgba(255,255,255,0.8)" stroke-width="0.5" stroke-linecap="round" />
             
             <!-- Main Wings -->
             <path d="M12 5.5C12 5.5 10.5 2.5 7.5 3C4.5 3.5 2 6 2.5 9C3 12 5.5 11.5 7 11C5 12.5 3 15 4 17C5 19 8 19 10 17C11 16 11.5 14 12 13C12.5 14 13 16 14 17C16 19 19 19 20 17C21 15 19 12.5 17 11C18.5 11.5 21 12 21.5 9C22 6 19.5 3.5 16.5 3C13.5 2.5 12 5.5 12 5.5Z" fill="url(#${uniqueId})" stroke="rgba(255,255,255,0.8)" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
             
             <!-- Body & Head -->
             <line x1="12" y1="5" x2="12" y2="19" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" stroke-linecap="round" style="filter: drop-shadow(0 0 2px white);"/>
             <circle cx="12" cy="19" r="1.5" fill="white" style="filter: drop-shadow(0 0 4px white);"/>
          </g>
        </svg>`;
    }

    const butterflies = [
      { c1: '#f43f5e', c2: '#fbbf24' }, // Magma (Rose to Amber)
      { c1: '#0ea5e9', c2: '#6366f1' }, // Cyber (Sky to Indigo)
      { c1: '#d946ef', c2: '#8b5cf6' }, // Neon (Fuchsia to Violet)
      { c1: '#84cc16', c2: '#10b981' }, // Acid (Lime to Emerald)
      { c1: '#f59e0b', c2: '#ef4444' }, // Solar (Amber to Red)
      { c1: '#2dd4bf', c2: '#ffffff' }  // Spirit (Teal to White)
    ];

    butterflies.forEach((b, i) => {
      const mover = document.createElement('div');
      mover.className = `butterfly-mover b${i % 4}`;

      const visual = document.createElement('div');
      visual.className = 'butterfly-visual';
      visual.innerHTML = butterflySVG(b.c1, b.c2, i);

      mover.appendChild(visual);
      container.appendChild(mover);

      // Animation Logic
      const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
      const animate = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const duration = rand(15, 30); // seconds

        const tx = rand(-100, w + 100);
        const ty = rand(-100, h + 100);
        const rot = rand(-20, 20);

        mover.style.transition = `transform ${duration}s linear`;
        mover.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;

        // Listen for end
        const handler = () => {
          mover.removeEventListener('transitionend', handler);
          animate();
        };
        mover.addEventListener('transitionend', handler);
      };

      // Initial Position
      mover.style.transform = `translate(${rand(0, window.innerWidth)}px, ${rand(0, window.innerHeight)}px)`;
      // Start loop slightly delayed
      setTimeout(animate, rand(100, 2000));
    });

    // handle unlock button
    shadowRoot.getElementById('bl-btn').addEventListener('click', tryUnlock);
    shadowRoot.getElementById('bl-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });

    // focus input
    setTimeout(() => {
      const ip = shadowRoot.getElementById('bl-input');
      if (ip) ip.focus();
    }, 300);
  }

  function removeOverlay() {
    if (hostElement) {
      hostElement.remove();
      hostElement = null;
      shadowRoot = null;
    }
  }

  async function sha256Hex(text) { const enc = new TextEncoder(); const data = enc.encode(text); const h = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''); }

  function tryUnlock() {
    if (!shadowRoot) return;
    const inputEl = shadowRoot.getElementById('bl-input');
    const v = inputEl.value || '';
    const msg = shadowRoot.getElementById('bl-msg');

    if (!v) { if (msg) msg.textContent = 'Enter password'; return; }
    sha256Hex(v).then(h => {
      chrome.runtime.sendMessage({ action: 'verify', hash: h }, (res) => {
        if (res && res.success) {
          const overlay = shadowRoot.getElementById('bl-overlay');
          if (overlay) {
            overlay.style.transition = 'opacity 420ms ease, transform 420ms ease';
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(1.05)';
            setTimeout(() => { removeOverlay(); }, 420);
          } else {
            removeOverlay();
          }
        } else {
          if (msg) msg.textContent = 'Wrong password';
          inputEl.value = '';
          inputEl.focus();
          const card = shadowRoot.getElementById('bl-card');
          card.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 });
        }
      });
    });
  }

  // initial check
  chrome.storage.local.get(['enabled', 'session_unlocked'], (res) => {
    if (res.enabled && !res.session_unlocked) {
      createOverlay();
    }
  });

  // listen for messages
  chrome.runtime.onMessage.addListener((m, s, r) => {
    if (!m || !m.action) return;
    if (m.action === 'lock-now') createOverlay();
    if (m.action === 'remove_overlay') removeOverlay();
  });
})();