# MV3 Service Worker Smoke Test

Minimal CRXJS + React extension showing how to test a production Manifest V3 service worker in CI.

The important part is not the popup UI. The important part is that the test loads the built `dist` directory into real Chromium and verifies that the MV3 service worker actually starts.

## Why this exists

Chrome Web Store can accept a package that builds correctly but fails at runtime. One common failure mode is accidentally bundling DOM-dependent code into the MV3 service worker:

```js
const title = document.title
```

That code is valid JavaScript, but MV3 service workers do not have `document`. A normal build can pass while the extension is broken in `chrome://extensions`.

This repo demonstrates a cheap CI check for that class of failure.

## What the smoke test checks

`tests/service-worker-smoke.spec.js`:

1. Expects a production extension build in `dist`.
2. Launches Chromium with:

```bash
--disable-extensions-except=dist
--load-extension=dist
```

3. Waits for an extension `serviceworker` target.
4. Evaluates code inside that worker to verify it reached runtime.
5. Opens the extension popup page and sends a smoke ping through `chrome.runtime.sendMessage`.

The ping handler lives in `src/background/service-worker.js`.

## Local run

Install dependencies:

```bash
npm install
```

Install the Playwright Chromium browser:

```bash
npx playwright install chromium
```

Build and run the smoke test:

```bash
npm run ci:service-worker
```

On Linux without a display server, run the Playwright step through Xvfb:

```bash
npm run build
xvfb-run --auto-servernum npm run test:service-worker
```

## GitHub Actions

`.github/workflows/service-worker-smoke.yml` runs the same check on pushes to `main` and pull requests:

```yaml
- run: npm ci
- run: npm run build
- run: npx playwright install --with-deps chromium
- run: xvfb-run --auto-servernum npm run test:service-worker
```

## Try the failure

Uncomment the failure line at the top of `src/background/service-worker.js`:

```js
const title = document.title
```

Then run:

```bash
npm run ci:service-worker
```

The extension build can still complete, but the smoke test should fail because the service worker cannot start cleanly.

## Files to copy into your extension

- `tests/service-worker-smoke.spec.js`
- `playwright.service-worker.config.js`
- `.github/workflows/service-worker-smoke.yml`
- the tiny smoke ping handler from `src/background/service-worker.js`

If your extension already has a background service worker, copy only the message handler and adapt the message name.
