// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');

    // Check status
    chrome.runtime.sendMessage({ action: 'checkLockStatus' }, (status) => {
        if (!status.hasPassword) {
            renderSetup();
        } else {
            renderControls();
        }
    });

    function renderSetup(isChangePassword = false) {
        let title = isChangePassword ? "Change Password" : "Initialize System";
        let btnText = isChangePassword ? "Update Credentials" : "Set Password";

        app.innerHTML = `
            <h2>${title}</h2>
            <p class="status">Secure your digital perimeter.</p>
            <input type="password" id="new-password" placeholder="New Password" class="styled-input">
            <input type="password" id="confirm-password" placeholder="Confirm Password" class="styled-input">
            <button id="chrome-locker-btn" class="primary-btn">${btnText}</button>
            ${isChangePassword ? '<button id="cancel-btn" class="secondary-btn">Cancel</button>' : ''}
            <div id="status-area" style="color: #ff416c; font-size: 0.8rem; margin-top: 10px;"></div>
        `;

        setTimeout(() => document.getElementById('new-password').focus(), 100);

        document.getElementById('chrome-locker-btn').addEventListener('click', () => {
            const pass = document.getElementById('new-password').value;
            const confirm = document.getElementById('confirm-password').value;
            const statusArea = document.getElementById('status-area');

            if (pass.length < 4) {
                statusArea.textContent = "Password too short (min 4 chars)";
                return;
            }
            if (pass !== confirm) {
                statusArea.textContent = "Passwords do not match";
                return;
            }

            chrome.runtime.sendMessage({ action: 'setPassword', password: pass }, (response) => {
                // Show Recovery Code
                renderRecovery(response.recoveryCode);
            });
        });

        if (isChangePassword) {
            document.getElementById('cancel-btn').addEventListener('click', renderControls);
        }
    }

    function renderRecovery(code) {
        app.innerHTML = `
            <h2 style="color: #00f2ff;">Recovery Code</h2>
            <p class="warning-text">SAVE THIS CODE! It is the ONLY way to recover your account if you forget your password.</p>
            <div class="code-display" title="Click to Copy">${code}</div>
            <p style="font-size: 0.7rem; color: #94a3b8;">Click code to copy to clipboard</p>
            <button id="done-btn" class="primary-btn">I Have Saved It</button>
        `;

        const codeDisplay = document.querySelector('.code-display');
        codeDisplay.addEventListener('click', () => {
            navigator.clipboard.writeText(code);
            codeDisplay.style.background = "rgba(0, 255, 0, 0.1)";
            codeDisplay.style.borderColor = "#00ff00";
            setTimeout(() => {
                codeDisplay.style.background = "";
                codeDisplay.style.borderColor = "";
            }, 500);
        });

        document.getElementById('done-btn').addEventListener('click', renderControls);
    }

    function renderControls() {
        app.innerHTML = `
            <h2>System Active</h2>
            <div id="status-msg" class="status">Profile Protected</div>
            
            <button id="lock-now-btn" class="danger-btn">
                LOCK TERMINAL
            </button>
            
            <button id="change-pass-btn" class="secondary-btn">Change Password</button>
            <button id="forgot-pass-btn" class="secondary-btn" style="border: none; color: #64748b; font-size: 0.8rem;">Forgot Password?</button>
        `;

        document.getElementById('lock-now-btn').addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'lockNow' }, () => {
                window.close();
            });
        });

        document.getElementById('change-pass-btn').addEventListener('click', () => {
            promptCurrentPassword();
        });

        document.getElementById('forgot-pass-btn').addEventListener('click', () => {
            renderForgot();
        });
    }

    function promptCurrentPassword() {
        app.innerHTML = `
            <h2>Verify Identity</h2>
            <p class="status">Enter current password.</p>
            <input type="password" id="current-password" placeholder="Password" class="styled-input">
            <button id="verify-btn" class="primary-btn">Verify</button>
            <button id="cancel-verify-btn" class="secondary-btn">Cancel</button>
            <div id="status-area" style="color: #ff416c; font-size: 0.8rem;"></div>
        `;

        document.getElementById('current-password').focus();

        document.getElementById('verify-btn').addEventListener('click', () => {
            const pass = document.getElementById('current-password').value;
            chrome.runtime.sendMessage({ action: 'validatePassword', password: pass }, (response) => {
                if (response.valid) {
                    renderSetup(true);
                } else {
                    document.getElementById('status-area').textContent = "Access Denied: Incorrect Password";
                }
            });
        });

        document.getElementById('cancel-verify-btn').addEventListener('click', renderControls);
    }

    function renderForgot() {
        app.innerHTML = `
            <h2 style="color: #fbbf24;">Recovery Mode</h2>
            <p class="status">Enter your recovery code (XXXX-XXXX).</p>
            <input type="text" id="recovery-code" placeholder="A1B2-C3D4" class="styled-input" style="text-transform: uppercase;">
            <button id="recover-btn" class="primary-btn">Reset System</button>
            <button id="cancel-rec-btn" class="secondary-btn">Cancel</button>
             <div id="status-area" style="color: #ff416c; font-size: 0.8rem; margin-top: 10px;"></div>
        `;

        document.getElementById('recovery-code').focus();

        document.getElementById('recover-btn').addEventListener('click', () => {
            let code = document.getElementById('recovery-code').value.trim().toUpperCase();

            chrome.runtime.sendMessage({ action: 'resetWithRecovery', code: code }, (response) => {
                if (response.success) {
                    alert("System Reset Successful. Please set a new password.");
                    renderSetup();
                } else {
                    document.getElementById('status-area').textContent = "Invalid Recovery Code";
                }
            });
        });

        document.getElementById('cancel-rec-btn').addEventListener('click', renderControls);
    }
});
