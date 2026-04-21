import { getSavedBridgeUrl } from './bridgeConfig'

function resolveBridgeUrl() {
  const configured = import.meta.env.VITE_OCWS_BRIDGE_URL
  return (configured || getSavedBridgeUrl()).replace(/\/$/, '')
}

async function fetchJson(path, options) {
  const response = await fetch(`${resolveBridgeUrl()}${path}`, options)
  if (!response.ok) {
    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    throw new Error(payload?.error?.message || `Bridge request failed: ${response.status}`)
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

export async function getAccountsProviders() {
  return fetchJson('/api/accounts/providers')
}

export async function getAccounts() {
  return fetchJson('/api/accounts')
}

export async function testAccount(accountId) {
  return fetchJson(`/api/accounts/${accountId}/test`, { method: 'POST' })
}

export async function connectProvider(provider) {
  return fetchJson('/api/accounts/connect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ provider }),
  })
}

export async function connectGoogleAccount() {
  return fetchJson('/api/accounts/google/connect', {
    method: 'POST',
  })
}

export async function getGoogleConnectionStatus(connectionId) {
  return fetchJson(`/api/accounts/google/connect/${connectionId}`)
}

export async function listWorkflowSchedules() {
  return fetchJson('/api/workflows/schedules')
}

export async function createWorkflowSchedule(payload) {
  return fetchJson('/api/workflows/schedules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function updateWorkflowSchedule(scheduleId, payload) {
  return fetchJson(`/api/workflows/schedules/${scheduleId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function deleteWorkflowSchedule(scheduleId) {
  return fetchJson(`/api/workflows/schedules/${scheduleId}`, {
    method: 'DELETE',
  })
}

export async function testWorkflowSchedule(scheduleId) {
  return fetchJson(`/api/workflows/schedules/${scheduleId}/run`, {
    method: 'POST',
  })
}

export { resolveBridgeUrl }
