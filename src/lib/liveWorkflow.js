import { getAccounts, getAccountsProviders, getBridgeCapabilities, getBridgeHealth, getBridgeStatus, resolveBridgeUrl } from './bridge'
import { sampleWorkflows } from '../data/workflows'
import { PROVIDER_DEFINITIONS } from './accounts'

const fallbackProviders = Object.values(PROVIDER_DEFINITIONS).map((provider) => ({
  ...provider,
  status: provider.status || 'available',
}))

export async function loadLocalConnectionState() {
  const results = await Promise.allSettled([
    getBridgeHealth(),
    getBridgeStatus(),
    getBridgeCapabilities(),
    getAccountsProviders(),
    getAccounts(),
  ])

  const [healthResult, statusResult, capabilitiesResult, providersResult, accountsResult] = results
  const connected = results.some((result) => result.status === 'fulfilled')

  return {
    connected,
    bridgeUrl: resolveBridgeUrl(),
    health: healthResult.status === 'fulfilled' ? healthResult.value : null,
    status: statusResult.status === 'fulfilled' ? statusResult.value : null,
    capabilities: capabilitiesResult.status === 'fulfilled' ? capabilitiesResult.value : null,
    providers: providersResult.status === 'fulfilled' ? (providersResult.value.providers || fallbackProviders) : fallbackProviders,
    accounts: accountsResult.status === 'fulfilled' ? (accountsResult.value.accounts || []) : [],
    error: connected ? null : (healthResult.reason?.message || statusResult.reason?.message || 'Local bridge unavailable.'),
  }
}

export function getInitialWorkflows() {
  return sampleWorkflows
}
