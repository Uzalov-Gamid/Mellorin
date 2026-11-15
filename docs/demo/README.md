# Demo capture provenance

`chat.png` and `reading.png` were captured on 2026-11-15 from the actual React UI/CSS at baseline `ed914d4`, using Vite and headless Chromium via Playwright (1200 × 800, scale 1). They are unretouched browser screenshots, not native desktop captures or generated artwork.

`capture.mjs` intercepts only the served HTML to install Tauri's mock IPC/event bridge before loading the unchanged application entrypoint. Chat replies, configuration, translation, and vocabulary writes are mocked. Clicking buttons and entering text uses the rendered app's normal controls. The displayed vault path is a synthetic label. The script creates a fresh temporary synthetic vault and removes it afterward; the bridge does not read or write any real vault. No Claude process or service is invoked. External browser requests are blocked. The reading sample is original synthetic material in `reading.txt`.

The reading screenshot shows one marked unfamiliar word and a translation popup; persistence is not exercised by the mock. The chat screenshot shows a deterministic fixture reply; CLI authentication, streaming protocol compatibility, service responses, and native WebView behavior are not validated by these assets.

## Reproduce

From the repository root, install the app dependencies and start Vite:

```bash
npm ci
npm run dev -- --host 127.0.0.1
```

In another terminal, install capture tooling in a temporary directory (no project dependency changes):

```bash
CAPTURE_TOOLS="$(mktemp -d "${TMPDIR:-/tmp}/mellorin-capture-tools.XXXXXX")"
npm install --prefix "$CAPTURE_TOOLS" --no-package-lock playwright@1.65.1
"$CAPTURE_TOOLS/node_modules/.bin/playwright" install chromium
PLAYWRIGHT_MODULE="$CAPTURE_TOOLS/node_modules/playwright" node docs/demo/capture.mjs
```

Use `DEMO_URL` to override the default `http://127.0.0.1:1420` if needed (loopback host must remain `127.0.0.1`). The script replaces the two PNGs, fails on browser page errors, and closes the browser/removes its synthetic vault. Stop Vite afterward. These fixtures are for documentation only and add no demo mode to the shipped application.
