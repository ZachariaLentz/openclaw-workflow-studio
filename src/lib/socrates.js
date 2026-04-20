import { resolveBridgeUrl } from './bridge'

export async function sendToSocrates(message, workflowText) {
  const response = await fetch(`${resolveBridgeUrl()}/api/socrates-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, workflowText }),
  })

  if (!response.ok) {
    throw new Error(`Socrates request failed: ${response.status}`)
  }

  const payload = await response.json()
  if (!payload.ok) {
    throw new Error(payload.error?.message || 'Socrates request failed.')
  }

  return payload
}
