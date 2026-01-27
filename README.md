# Vaulton Password Manager Extension

The browser extension for Vaulton, built with **Angular** and **TypeScript** using **Vite**.

## Development Setup

The extension is designed for modern browser security standards (Manifest V3) and uses AOT (Ahead-of-Time) compilation for its Angular popup.

### Prerequisites

1.  Ensure the Vaulton backend is running.
2.  Install dependencies: `npm install`.

### Building

The extension must be built before it can be loaded into your browser:

1.  Run `npm run build` - This generates the `dist/` folder.

### Loading into Chrome / Edge

1.  Open your browser and navigate to **Manage Extensions**:
    - **Chrome:** `chrome://extensions/`
    - **Edge:** `edge://extensions/`
2.  Enable **Developer mode** (toggle in the top-right corner).
3.  Click the **Load unpacked** button (top-left).
4.  Select the **`vaulton-web-extension/dist`** folder.

### Key Structure

- **`src/background/main.ts`**: The Background Service Worker.
- **`src/popup/`**: The Angular 17 popup application.
- **`src/config.ts`**: Controls the `API_BASE_URL`.
- **`vite.config.ts`**: Unified build configuration for the background and popup.

### Troubleshooting

- **No Data in Popup:** Right-click the extension icon, select "Inspect Popup", and check the Console.
- **Service Worker Errors:** In `chrome://extensions`, click the "Service Worker" link next to "Inspect views" to view the background logs.
