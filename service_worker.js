
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
  if (cmd === 'lock-now') { chrome.storage.local.set({ session_unlocked: false }, () => lockAllTabs()); }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.storage.local.get(['enabled', 'session_unlocked'], (res) => {
      if (res.enabled && !res.session_unlocked) {
        sendMsg(tabId, { action: 'lock-now' });
      }
    });
  }
});
