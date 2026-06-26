import { expect, test, chromium } from '@playwright/test'
import { access, mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const extensionDir = path.resolve(process.cwd(), process.env.EXTENSION_DIST ?? 'dist')
const expectedWorkerFile = process.env.SERVICE_WORKER_FILE ?? 'service-worker'

async function waitForExtensionServiceWorker(context) {
  const existingWorker = context
    .serviceWorkers()
    .find((worker) => worker.url().startsWith('chrome-extension://'))

  if (existingWorker) {
    return existingWorker
  }

  const worker = await context.waitForEvent('serviceworker', {
    timeout: 10_000,
    predicate: (candidate) => candidate.url().startsWith('chrome-extension://'),
  })

  return worker
}

test('production MV3 service worker starts and handles a smoke ping', async () => {
  await access(path.join(extensionDir, 'manifest.json'))

  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'mv3-service-worker-smoke-'))

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      '--no-sandbox',
    ],
  })

  try {
    const serviceWorker = await waitForExtensionServiceWorker(context)
    const serviceWorkerUrl = serviceWorker.url()

    expect(serviceWorkerUrl).toContain(expectedWorkerFile)

    const directProbe = await serviceWorker.evaluate(() => ({
      ready: globalThis.__MV3_SERVICE_WORKER_SMOKE_READY,
      scriptUrl: globalThis.__MV3_SERVICE_WORKER_SMOKE_SCRIPT_URL,
      manifestVersion: chrome.runtime.getManifest().manifest_version,
    }))

    expect(directProbe).toMatchObject({
      ready: true,
      manifestVersion: 3,
    })
    expect(directProbe.scriptUrl).toContain('chrome-extension://')

    const extensionId = new URL(serviceWorkerUrl).host
    const extensionPage = await context.newPage()
    await extensionPage.goto(`chrome-extension://${extensionId}/src/popup/index.html`)

    const pingResponse = await extensionPage.evaluate(() => {
      return chrome.runtime.sendMessage({ type: 'service-worker-smoke' })
    })

    expect(pingResponse).toMatchObject({
      ok: true,
      serviceWorker: 'ready',
      manifestVersion: 3,
    })
    expect(pingResponse.scriptUrl).toContain('chrome-extension://')
  } finally {
    await context.close()
    await rm(userDataDir, { recursive: true, force: true })
  }
})
