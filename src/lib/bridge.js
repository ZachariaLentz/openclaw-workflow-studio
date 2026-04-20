const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:4318'

function resolveBridgeUrl() {
  const configured = import.meta.env.VITE_OCWS_BRIDGE_URL
  return (configured || DEFAULT_BRIDGE_URL).replace(/\/$/, '')
}

async function fetchJson(path) {
  const response = await fetch(`${resolveBridgeUrl()}${path}`)
  if (!response.ok) {
    throw new Error(`Bridge request failed: ${response.status}`)
  }
  return response.json()
}

export async function getBridgeHealth() {
  return fetchJson('/health')
}

export async function getBridgeStatus() {
  return fetchJson('/api/status')
}

export async function getBridgeCapabilities() {
  return fetchJson('/api/capabilities')
}

export { resolveBridgeUrl }
