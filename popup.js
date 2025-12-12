
const turnOn = document.getElementById('turnOn');
const turnOff = document.getElementById('turnOff');
const changePwd = document.getElementById('changePwd');
const lockNow = document.getElementById('lockNow');
const statusEl = document.getElementById('status');
const msg = document.getElementById('msg');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const pwd = document.getElementById('pwd');
const oldPwd = document.getElementById('oldPwd');
const pwd2 = document.getElementById('pwd2');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

function showMsg(t, ok = false) { msg.textContent = t; msg.style.color = ok ? '#065f46' : '#b91c1c'; setTimeout(() => msg.textContent = '', 4000); }

async function sha256Hex(text) { const enc = new TextEncoder(); const data = enc.encode(text); const h = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''); }

async function refresh() { const s = await chrome.storage.local.get(['enabled']); const enabled = s.enabled === true; statusEl.textContent = enabled ? 'Status: ON' : 'Status: OFF'; turnOn.disabled = enabled; turnOff.disabled = !enabled; }

function openModal(title, saveHandler) {
  modalTitle.textContent = title;
  pwd.value = '';
  pwd2.value = '';
  oldPwd.value = '';
  modal.classList.remove('hidden');
  if (!oldPwd.classList.contains('hidden')) oldPwd.focus();
  else pwd.focus();
  saveBtn.onclick = saveHandler;
}

cancelBtn.onclick = () => modal.classList.add('hidden');

turnOn.addEventListener('click', async () => {
  const data = await chrome.storage.local.get(['hash']);
  if (!data.hash) {
    oldPwd.classList.add('hidden');
    openModal('Create password', async () => {
      const p = pwd.value || ''; const p2 = pwd2.value || '';
      if (!p) { showMsg('Password cannot be empty'); return; }
      if (p !== p2) { showMsg('Passwords do not match'); return; }
      const h = await sha256Hex(p); await chrome.storage.local.set({ hash: h, enabled: true, session_unlocked: false }); modal.classList.add('hidden'); await refresh(); chrome.runtime.sendMessage({ action: 'lockNow' }); showMsg('Enabled and locked', true);
    });
  } else {
    await chrome.storage.local.set({ enabled: true, session_unlocked: false }); await refresh(); chrome.runtime.sendMessage({ action: 'lockNow' }); showMsg('Enabled and locked', true);
  }
});

turnOff.addEventListener('click', async () => { await chrome.storage.local.set({ enabled: false, session_unlocked: false }); await refresh(); showMsg('Disabled', true); });

changePwd.addEventListener('click', async () => {
  oldPwd.classList.remove('hidden');
  openModal('Change password', async () => {
    const oldV = oldPwd.value || '';
    const p = pwd.value || ''; const p2 = pwd2.value || '';

    // verify old
    const stored = await chrome.storage.local.get(['hash']);
    if (stored.hash) {
      const oldH = await sha256Hex(oldV);
      if (oldH !== stored.hash) { showMsg('Current password incorrect'); return; }
    }

    if (!p) { showMsg('Password cannot be empty'); return; }
    if (p !== p2) { showMsg('Passwords do not match'); return; }
    const h = await sha256Hex(p); await chrome.storage.local.set({ hash: h }); modal.classList.add('hidden'); showMsg('Password changed', true);
  });
});

lockNow.addEventListener('click', async () => {
  const s = await chrome.storage.local.get(['enabled']); if (!s.enabled) { showMsg('Enable the extension first'); return; } chrome.runtime.sendMessage({ action: 'lockNow' }); showMsg('Locking...', true);
});

document.addEventListener('DOMContentLoaded', async () => { await refresh(); });
