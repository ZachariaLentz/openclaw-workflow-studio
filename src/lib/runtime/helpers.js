export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getTimestamp() {
  return new Date().toISOString()
}

export function formatScheduleSummary(config = {}) {
  if (config.scheduleSummary) return config.scheduleSummary
  if (config.scheduleMode === 'once' && config.runAt) return `Once at ${config.runAt}`
  if (config.scheduleMode === 'every' && config.everyMinutes) return `Every ${config.everyMinutes} minutes`
  if (config.scheduleMode === 'cron' && config.cronExpression) return `Cron: ${config.cronExpression}`
  return 'Scheduled trigger'
}

export function inferPriorityFromItem(item = {}) {
  const severity = String(item.severity || item.priority || '').toLowerCase()
  if (['critical', 'urgent', 'high', 'error'].includes(severity)) return 'urgent'
  if (['warning', 'medium', 'today'].includes(severity)) return 'today'
  if (['low', 'info', 'informational', 'normal'].includes(severity)) return 'informational'
  return 'today'
}

export function summarizeEvents(events = []) {
  if (!Array.isArray(events) || events.length === 0) return 'No events in the selected window.'
  return events
    .slice(0, 3)
    .map((event) => `${event.title || 'Untitled'}${event.startsAt ? ` @ ${event.startsAt}` : ''}`)
    .join('; ')
}

export function buildPriorityItem(base = {}, fallback = {}) {
  return {
    label: base.label || fallback.label || 'Untitled item',
    summary: base.summary || fallback.summary || '',
    source: base.source || fallback.source || 'unknown',
    severity: base.severity || fallback.severity || 'info',
    startsAt: base.startsAt || fallback.startsAt || null,
    recommendedAction: base.recommendedAction || fallback.recommendedAction || null,
    route: base.route || fallback.route || null,
    blocked: Boolean(base.blocked ?? fallback.blocked ?? false),
    live: Boolean(base.live ?? fallback.live ?? false),
    placeholder: Boolean(base.placeholder ?? fallback.placeholder ?? false),
    details: base.details || fallback.details || null,
  }
}

export function inferStoryTitle(idea) {
  return idea?.title || 'The Little Lantern in the Woods'
}

export function getPromptText(node, context) {
  if (node.prompt) return node.prompt
  return context.lastOutput?.prompt || 'Complete the requested AI task.'
}

export function buildFileName(template, title) {
  const safeTitle = (title ?? 'story')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const baseName = safeTitle || 'story'
  return (template || '{{title}}.txt').replace('{{title}}', baseName)
}

export function toDownloadUrl({ content, contentType }) {
  const blob = new Blob([content], { type: contentType || 'text/plain' })
  return URL.createObjectURL(blob)
}
