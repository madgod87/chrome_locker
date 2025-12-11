/* Global variables */
let isLocked = true;
let userPasswordHash = null;
let recoveryCodeHash = null;
let failedAttempts = 0;
const IDLE_THRESHOLD_SECONDS = 300; // 5 minutes

/* Utilities */
async function hashHelper(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateRecoveryCode() {
  // Generate a formatted code like A1B2-C3D4
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, 0, 1, O to avoid confusion
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/* Initialize on startup */
chrome.runtime.onStartup.addListener(() => {
  lockBrowser();
});

/* Retrieve password on init */
chrome.storage.local.get(['passwordHash', 'recoveryHash'], (result) => {
  if (result.passwordHash) {
    userPasswordHash = result.passwordHash;
    recoveryCodeHash = result.recoveryHash;
    lockBrowser();
  } else {
    isLocked = false;
  }
});

/* Idle Listener */
chrome.idle.setDetectionInterval(IDLE_THRESHOLD_SECONDS);
chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'idle' || state === 'locked') {
    lockBrowser();
  }
});

/* Listener for new tabs to ensure they get locked if needed */
chrome.tabs.onCreated.addListener((tab) => {
  if (isLocked) {
    // Slight delay to ensure content script is ready or simply retry
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { action: 'locked' }).catch(() => { });
    }, 500);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isLocked && changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { action: 'locked' }).catch(() => { });
  }
});

/* Action Creators */
function lockBrowser() {
  isLocked = true;
  notifyAllTabs('locked');
  muteAllTabs(true);
}

function unlockBrowser() {
  isLocked = false;
  notifyAllTabs('unlocked');
  muteAllTabs(false);
}

function muteAllTabs(mute) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.update(tab.id, { muted: mute }).catch(() => { });
    });
  });
}

function notifyAllTabs(action, data = {}) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { action: action, ...data }).catch(() => {
        // Ignore errors
      });
    });
  });
}

/* Message Handling */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'checkLockStatus') {
    sendResponse({
      isLocked: isLocked,
      hasPassword: !!userPasswordHash
    });
    return true;
  }

  if (request.action === 'unlock') {
    hashHelper(request.password).then(hash => {
      if (hash === userPasswordHash) {
        // SUCCESS
        const attemptsReport = failedAttempts;
        failedAttempts = 0; // Reset counter
        unlockBrowser();

        // Send success + intruder report
        sendResponse({ success: true, attempts: attemptsReport });

        // Also notify content script to show banner if needed
        if (attemptsReport > 0) {
          // We can signal the tab that just unlocked to show a banner
          // But simpler is to return it in the response and let content.js handle it
        }

      } else {
        // FAILED
        failedAttempts++;
        sendResponse({ success: false });
      }
    });
    return true;
  }

  if (request.action === 'setPassword') {
    const code = generateRecoveryCode();

    Promise.all([
      hashHelper(request.password),
      hashHelper(code)
    ]).then(([pHash, rHash]) => {
      userPasswordHash = pHash;
      recoveryCodeHash = rHash;

      chrome.storage.local.set({
        passwordHash: pHash,
        recoveryHash: rHash
      });

      isLocked = false;
      failedAttempts = 0;
      sendResponse({ success: true, recoveryCode: code });
    });
    return true;
  }

  if (request.action === 'resetWithRecovery') {
    hashHelper(request.code).then(hash => {
      if (hash === recoveryCodeHash) {
        // Valid code -> Clear password
        userPasswordHash = null;
        recoveryCodeHash = null;
        chrome.storage.local.remove(['passwordHash', 'recoveryHash']);

        isLocked = false;
        notifyAllTabs('unlocked');
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
    });
    return true;
  }

  if (request.action === 'lockNow') {
    lockBrowser();
    sendResponse({ success: true });
  }

  // Used for changing password inside popup
  if (request.action === 'validatePassword') {
    hashHelper(request.password).then(hash => {
      sendResponse({ valid: hash === userPasswordHash });
    });
    return true;
  }
});
