export const PROVIDER_DEFINITIONS = {
  google: {
    id: 'google',
    label: 'Google',
    description: 'Connect Google services like Drive.',
    authType: 'oauth',
    capabilities: ['drive'],
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    description: 'Connect an OpenAI account for future AI nodes.',
    authType: 'api_key',
    capabilities: ['responses'],
  },
  'openclaw-local': {
    id: 'openclaw-local',
    label: 'OpenClaw Local',
    description: 'Shows whether the local OpenClaw bridge is available.',
    authType: 'local',
    capabilities: ['local-runtime'],
  },
}

export function getToolRequirements(toolId) {
  switch (toolId) {
    case 'integrations.google_drive.save_file':
      return { provider: 'google', requiredCapabilities: ['drive'] }
    default:
      return null
  }
}

export function getCompatibleAccounts(accounts, toolId) {
  const requirements = getToolRequirements(toolId)
  if (!requirements) return []

  return accounts.filter((account) => {
    if (account.provider !== requirements.provider) return false
    const capabilities = new Set(account.capabilities || [])
    return requirements.requiredCapabilities.every((capability) => capabilities.has(capability))
  })
}
