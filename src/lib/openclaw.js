import { resolveBridgeUrl } from './bridge'

async function fetchJson(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  const payload = await response.json()
  if (!payload.ok) {
    throw new Error(payload.error?.message || 'Bridge response was not ok.')
  }

  return payload
}

export async function generateStoryIdea(params = {}) {
  const query = new URLSearchParams({
    audience: params.audience || 'children ages 4-8',
    theme: params.theme || 'friendship, courage, and wonder',
    prompt: params.prompt || '',
  })

  const payload = await fetchJson(`${resolveBridgeUrl()}/api/story-idea?${query.toString()}`)
  if (!payload.storyIdea) {
    throw new Error('Story idea response was incomplete.')
  }

  return payload.storyIdea
}

export async function writeStory(storyIdea, options = {}) {
  const payload = await fetchJson(`${resolveBridgeUrl()}/api/write-story`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      storyIdea: storyIdea || {},
      prompt: options.prompt || '',
    }),
  })

  if (!payload.storyDraft) {
    throw new Error('Write story response was incomplete.')
  }

  return payload.storyDraft
}

export async function editStory(storyDraft, options = {}) {
  const payload = await fetchJson(`${resolveBridgeUrl()}/api/edit-story`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      storyDraft: storyDraft || {},
      prompt: options.prompt || '',
    }),
  })

  if (!payload.editedStory) {
    throw new Error('Edit story response was incomplete.')
  }

  return payload.editedStory
}

export async function saveFileToGoogleDrive(file) {
  const payload = await fetchJson(`${resolveBridgeUrl()}/api/google-drive/save-file`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(file || {}),
  })

  if (!payload.file) {
    throw new Error('Google Drive save response was incomplete.')
  }

  return payload.file
}
