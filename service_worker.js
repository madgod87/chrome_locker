
// service_worker.js - safe messaging & verification
function sendMsg(tabId, msg) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, msg, (res) => {
      if (chrome.runtime.lastError) {
        // try to inject and resend
        chrome.scripting.executeScript({ target: { tabId }, files: ['content_script.js'] }, () => {
          chrome.tabs.sendMessage(tabId, msg, (r) => { resolve(r); });
        });
      } else resolve(res);
    });
  });
}

function lockAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(t => {
      if (t.id && t.url && (t.url.startsWith('http') || t.url.startsWith('https') || t.url.startsWith('file'))) {
        sendMsg(t.id, { action: 'lock-now' });
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['enabled'], (res) => {
    if (typeof res.enabled === 'undefined') chrome.storage.local.set({ enabled: false, session_unlocked: false });
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ session_unlocked: false }, () => {
    chrome.storage.local.get(['enabled'], (res) => { if (res.enabled) lockAllTabs(); });
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;
  if (msg.action === 'lockNow' || msg.action === 'lock-now') {
    chrome.storage.local.set({ session_unlocked: false }, () => lockAllTabs());
    sendResponse({ success: true });
    return true;
  }
  if (msg.action === 'verify') {
    const provided = msg.hash;
    chrome.storage.local.get(['hash'], (res) => {
      const stored = res.hash || null;
      if (stored && provided === stored) {
        chrome.storage.local.set({ session_unlocked: true }, () => {
          chrome.tabs.query({}, (tabs) => { tabs.forEach(t => { if (t.id) sendMsg(t.id, { action: 'remove_overlay' }); }); });
          sendResponse({ success: true });
        });
      } else sendResponse({ success: false });
    });
    return true;
  }
});

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'lock-now') {
    chrome.storage.local.get(['hash'], (res) => {
      // Only lock if a password is set to prevent lockout
      if (res.hash) {
        chrome.storage.local.set({ session_unlocked: false }, () => lockAllTabs());
      }
    });
  }
});

// Block all internal browser pages when locked (History, Settings, Extensions, New Tab, etc.)
const BANNED_SCHEMES = ['chrome:', 'edge:', 'about:', 'brave:', 'vivaldi:', 'opera:'];

function checkAndLock(tabId, tabUrl, status) {
  chrome.storage.local.get(['enabled', 'session_unlocked'], (res) => {
    if (res.enabled && !res.session_unlocked) {
      // 1. Strict Lockdown: Close any internal browser page
      // This covers: chrome://newtab, chrome://history, chrome://bookmarks, chrome://settings/passwords, etc.
      if (tabUrl && BANNED_SCHEMES.some(s => tabUrl.startsWith(s))) {
        chrome.tabs.remove(tabId).catch(() => { });
        return;
      }

      // 2. Inject Lock Overlay on normal web pages (http/https/file)
      // We only inject when status is 'complete' to ensure DOM is ready
      if (status === 'complete') {
        sendMsg(tabId, { action: 'lock-now' });
      }
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  checkAndLock(tabId, tab.url, changeInfo.status || 'loading');
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) checkAndLock(tab.id, tab.url || '', 'loading');
});
