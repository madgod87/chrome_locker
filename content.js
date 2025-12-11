// content.js
const LOCK_ID = 'chrome-locker-overlay';

function createOverlay(locked = true) {
    if (document.getElementById(LOCK_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = LOCK_ID;

    overlay.innerHTML = `
        <div id="chrome-locker-card">
            <div id="chrome-locker-alert">⚠️ INTRUSTION ATTEMPT DETECTED</div>
            <div class="locked-icon">🔒</div>
            <div id="chrome-locker-title">SYSTEM LOCKED</div>
            <div id="chrome-locker-subtitle">Enter authentication credentials</div>
            <input type="password" id="chrome-locker-input" class="styled-input" placeholder="Password" autofocus>
            <button id="chrome-locker-btn" class="primary-btn">UNLOCK</button>
            <div id="chrome-locker-error"></div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const input = overlay.querySelector('#chrome-locker-input');
    const btn = overlay.querySelector('#chrome-locker-btn');
    const errorMsg = overlay.querySelector('#chrome-locker-error');
    const alertBanner = overlay.querySelector('#chrome-locker-alert');

    // Subtle shake animation helper
    function shakeCard() {
        const card = overlay.querySelector('#chrome-locker-card');
        card.style.transform = 'translate(5px, 0)';
        setTimeout(() => card.style.transform = 'translate(-5px, 0)', 50);
        setTimeout(() => card.style.transform = 'translate(5px, 0)', 100);
        setTimeout(() => card.style.transform = 'translate(0, 0)', 150);
    }

    function attemptUnlock() {
        const pass = input.value;
        chrome.runtime.sendMessage({ action: 'unlock', password: pass }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn("Connection error:", chrome.runtime.lastError.message);
                if (chrome.runtime.lastError.message.includes("Extension context invalidated")) {
                    alert("Extension has been updated. Please refresh this page.");
                } else {
                    alert("Connection error: " + chrome.runtime.lastError.message);
                }
                return;
            }

            if (response && response.success) {
                // If intruder attempts were found, show alert before closing?
                // Nah, usually users want to get to work. Let's show a toast notification instead maybe in regular UI?
                // For now, let's just slide up and remove.

                if (response.attempts > 0) {
                    alert(`WARNING: ${response.attempts} failed unlock attempts detected while you were away.`);
                }

                removeOverlay();
            } else {
                errorMsg.textContent = "ACCESS DENIED";
                shakeCard();
                input.value = '';
                input.focus();
            }
        });
    }

    btn.addEventListener('click', attemptUnlock);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') attemptUnlock();
    });

    input.focus();
}

// Global shortcut listener: Alt+Shift+L to Lock
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        chrome.runtime.sendMessage({ action: 'lockNow' }, (response) => {
            if (chrome.runtime.lastError) {
                // Ignore context errors during shortcut if context is invalid
                console.log("Shortcut ignored due to invalid context");
            }
        });
    }
});

function removeOverlay() {
    const overlay = document.getElementById(LOCK_ID);
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            document.body.style.overflow = '';
        }, 500); // Wait for transition
    }
}

chrome.runtime.sendMessage({ action: 'checkLockStatus' }, (response) => {
    if (response && response.isLocked) {
        createOverlay();
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'locked') {
        createOverlay();
    } else if (message.action === 'unlocked') {
        removeOverlay();
    }
});
