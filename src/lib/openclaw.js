import { resolveBridgeUrl } from './bridge'

export async function generateStoryIdea(params = {}) {
  const query = new URLSearchParams({
    audience: params.audience || 'children ages 4-8',
    theme: params.theme || 'friendship, courage, and wonder',
  })

  const response = await fetch(`${resolveBridgeUrl()}/api/story-idea?${query.toString()}`)
  if (!response.ok) {
    throw new Error(`Story idea request failed: ${response.status}`)
  }

  const payload = await response.json()
  if (!payload.ok || !payload.storyIdea) {
    throw new Error('Story idea response was incomplete.')
  }

  return payload.storyIdea
}
