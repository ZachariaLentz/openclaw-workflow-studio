import { resolveBridgeUrl } from './bridge'

function parseSocratesPayload(payload) {
  if (!payload?.ok) {
    throw new Error(payload?.error?.message || 'Socrates request failed.')
  }

  return {
    ok: true,
    reply: payload.reply || '',
    change: payload.change || { type: 'none' },
    raw: payload.raw || '',
    source: payload.source || 'unknown',
    session: payload.session || 'unknown',
  }
}

export async function sendToSocrates(message, workflow) {
  const response = await fetch(`${resolveBridgeUrl()}/api/socrates-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      protocolVersion: 1,
      message,
      workflow,
    }),
  })

  if (!response.ok) {
    throw new Error(`Socrates request failed: ${response.status}`)
  }

  return parseSocratesPayload(await response.json())
}
