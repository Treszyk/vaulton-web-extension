# Vaulton Password Manager: Browser Extension

This is the official chromium browser extension for **Vaulton**, a zero-knowledge, AccountId-based password manager. Built with **Angular 21.1**, **TypeScript**, and **Vite**, it adheres to modern browser security standards (Manifest V3).

The extension acts as a bridge between your vault and the websites you visit, providing autofill, credential saving, and background synchronization while designed to minimize the exposure of cryptographic keys to the DOM.

## Key Features

- **Zero-Knowledge Architecture:** Cryptographic operations are designed to happen primarily within the extension's isolated memory. The background service worker handles vault decryption, while the content script requests specific credentials contextually.
- **Form Detection:** Uses heuristics and `MutationObserver` to identify login, registration, and password change flows, aiming to detect forms without relying on global page keyloggers (note: highly customized SPAs may require manual interaction).
- **Visual Overlays:** Injects isolated UI elements (Credential Pickers, Save Prompts) into a `Shadow DOM`, intending to minimize host-page style bleeding and reduce exposure to clickjacking.
- **Dynamic Storage Boundaries:**
  - **Encrypted Vault Cache**: Stored in `chrome.storage.local`
  - **Cryptographic Keys**: By default, sensitive material like the derived Vault Key is kept in `chrome.storage.session` (wiped when the browser closes). If the user explicitly opts into "Persistent" mode, these keys are written to `chrome.storage.local` to survive browser restarts.
- **Background Synchronization:** The Service Worker manages throttled synchronization with the Vaulton API to help keep credentials up-to-date.

## Architecture

The extension is compartmentalized into three strict execution contexts:

- **`src/background/` (Service Worker):** The central nervous system. It handles all Vaulton API communication, manages the `BackgroundAuthManager`, holds the decryption keys in volatile memory, and responds to messages from content scripts.
- **`src/content/` (Content Script):** The injection layer. It operates within the context of the active webpage to scan for login forms (`form-detector.ts`), inject the Vaulton icon (`button-injector.ts`), and populate credentials (`autofill-engine.ts`).
- **`src/popup/` (Angular UI):** A standalone Angular Single Page Application embedded in the extension popup. It serves as the primary dashboard for viewing the vault and extension settings.

## Development Setup

### Prerequisites

1. Ensure the main Vaulton backend API framework is running.
2. Install Node.js dependencies:
   ```bash
   npm install
   ```

> **Configuring for Local Development:**
> The extension is configured for production by default. To test it against a local backend, you must make two changes:
>
> 1. In `src/config.ts`, change `API_BASE_URL` to `'http://localhost:8080'`.
> 2. In `manifest.json`, inject local host permissions. Add `"http://localhost:8080/*"` (and your frontend ports) to the `"host_permissions"` array, and `http://localhost:8080` to the `connect-src` directive in the `"content_security_policy"`.

### Building

The extension uses Vite for bundling. Run the cross-platform build script to compile:

```bash
npm run build
```

This generates the unified, deployable extension inside the `dist/` directory.

### Loading into Chrome / Edge

1. Open your browser and navigate to **Manage Extensions**:
   - **Chrome:** `chrome://extensions/`
   - **Edge:** `edge://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click the **Load unpacked** button (top-left).
4. Select the newly built **`vaulton-web-extension/dist`** folder.

## License

This project is licensed under the [MIT License](./LICENSE).

This project bundles the [Inter](https://github.com/rsms/inter) font, licensed under the [SIL Open Font License 1.1](public/fonts/LICENSE.txt). It also uses third-party dependencies via npm under their respective licenses.
