# Chrome Locker 🔒

A premium, secure Chrome Extension that locks your browser profile to prevent unauthorized access. Featuring a futuristic "Cyberpunk" aesthetic with a dynamic galaxy star-field animation.

## Features ✨

*   **Startup Lock**: Automatically locks the browser instantly when Chrome opens.
*   **Idle Auto-Lock**: Secures your browser after 5 minutes of inactivity.
*   **Military-Grade Security**: Passwords are SHA-256 hashed (never stored in plain text).
*   **Emergency Recovery**: Generate a unique One-Time Recovery Code in case you forget your password.
*   **Intruder Detection**: Tracks failed unlock attempts and alerts you upon successful login ("3 failed attempts detected").
*   **Tab & Audio Protection**: Mutes all tabs and hides content while locked.
*   **Global Shortcut**: Press `Alt + Shift + L` to instantly lock the browser from any tab.
*   **Premium UI**: Stunning animated lock screen with a rotating galaxy particle system.

## Installation 🛠️

1.  Clone this repository or download the source code.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the `chrome_locker` directory.

## Usage 📖

1.  **Initial Setup**: Click the extension icon to set your `Master Password`.
2.  **Save Your Code**: You will be given a Recovery Code (e.g., `A1B2-C3D4`). **Save this safely!**
3.  **Unlock**: When Chrome opens, enter your password to access your tabs.
4.  **Instant Lock**: Press `Alt + Shift + L` or click "Lock Terminal" in the extension popup.

## Technologies

*   Manifest V3
*   Vanilla JavaScript (ES6+)
*   CSS3 Animations (Keyframes, Box-Shadow Particles)
*   Chrome Extension APIs (Storage, Tabs, Idle, Runtime)

## License

MIT License.
