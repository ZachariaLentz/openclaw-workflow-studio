import { getAccounts, getAccountsProviders, getBridgeCapabilities, getBridgeHealth, getBridgeStatus, resolveBridgeUrl } from './bridge'
import { sampleWorkflows } from '../data/workflows'

export async function loadLocalConnectionState() {
  try {
    const [health, status, capabilities, providersResponse, accountsResponse] = await Promise.all([
      getBridgeHealth(),
      getBridgeStatus(),
      getBridgeCapabilities(),
      getAccountsProviders(),
      getAccounts(),
    ])

    return {
      connected: true,
      bridgeUrl: resolveBridgeUrl(),
      health,
      status,
      capabilities,
      providers: providersResponse.providers || [],
      accounts: accountsResponse.accounts || [],
    }
  } catch (error) {
    return {
      connected: false,
      bridgeUrl: resolveBridgeUrl(),
      error: error.message,
      providers: [],
      accounts: [],
    }
  }
}

export function getInitialWorkflows() {
  return sampleWorkflows
}
