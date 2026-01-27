# Vaulton Password Manager Extension

## Development Setup

The extension is built to talk to the Vaulton backend. During development, we use the local frontend proxy to avoid CORS issues.

### Prerequisites

1.  Ensure the Vaulton backend and frontend are running (e.g., via Docker Compose).
2.  The API should be accessible at `http://localhost:4200/api` (which proxies to the backend).

### Loading into Chrome / Edge

1.  Open your browser and navigate to **Manage Extensions**:
    - **Chrome:** `chrome://extensions/`
    - **Edge:** `edge://extensions/`
2.  Enable **Developer mode** (toggle in the top-right corner).
3.  Click the **Load unpacked** button (top-left).
4.  Select the **`vaulton-web-extension`** folder (the root of this extension project).

### Configuration

- **`src/config.js`**: Controls the API URL.
  - **Dev:** `http://localhost:4200/api` (Frontend Proxy)
  - **Prod:** `https://vaulton.dev/api` (or your domain)

### Troubleshooting

- **Connection Failed:** check if `localhost:4200` is reachable. Open the extension popup, right-click, select "Inspect", and check the **Console** tab for detailed errors.
