const STORAGE_KEY = 'ocws.bridgeUrl'
const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:4318'

export function getDefaultBridgeUrl() {
  return DEFAULT_BRIDGE_URL
}

export function getSavedBridgeUrl() {
  if (typeof window === 'undefined') return DEFAULT_BRIDGE_URL
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_BRIDGE_URL
  } catch {
    return DEFAULT_BRIDGE_URL
  }
}

export function saveBridgeUrl(url) {
  if (typeof window === 'undefined') return
  const normalized = (url || DEFAULT_BRIDGE_URL).trim().replace(/\/$/, '') || DEFAULT_BRIDGE_URL
  try {
    window.localStorage.setItem(STORAGE_KEY, normalized)
  } catch {
    // ignore storage failures in privacy-restricted contexts
  }
}

export function clearBridgeUrl() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore storage failures in privacy-restricted contexts
  }
}
