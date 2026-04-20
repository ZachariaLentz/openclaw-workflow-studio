import { sampleWorkflows } from '../data/workflows'
import { getBridgeCapabilities, getBridgeHealth, getBridgeStatus, resolveBridgeUrl } from './bridge'

export async function loadLocalConnectionState() {
  try {
    const [health, status, capabilities] = await Promise.all([
      getBridgeHealth(),
      getBridgeStatus(),
      getBridgeCapabilities(),
    ])

    return {
      connected: true,
      bridgeUrl: resolveBridgeUrl(),
      health,
      status,
      capabilities,
    }
  } catch (error) {
    return {
      connected: false,
      bridgeUrl: resolveBridgeUrl(),
      error: error.message,
    }
  }
}

export function getInitialWorkflows() {
  return sampleWorkflows
}
