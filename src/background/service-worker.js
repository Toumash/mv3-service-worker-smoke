globalThis.__MV3_SERVICE_WORKER_SMOKE_READY = true
globalThis.__MV3_SERVICE_WORKER_SMOKE_SCRIPT_URL = import.meta.url

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'service-worker-smoke') {
    return false
  }

  sendResponse({
    ok: true,
    serviceWorker: 'ready',
    scriptUrl: import.meta.url,
    manifestVersion: chrome.runtime.getManifest().manifest_version,
  })

  return true
})
