import { collectIncomingOutputs } from './core'
import {
  buildFileName,
  buildPriorityItem,
  formatScheduleSummary,
  getPromptText,
  getTimestamp,
  inferPriorityFromItem,
  inferStoryTitle,
  summarizeEvents,
  toDownloadUrl,
} from './helpers'

async function executeStructuredPrompt(node, context) {
  if (context.liveExecutors?.generateStoryIdea) {
    const storyIdea = await context.liveExecutors.generateStoryIdea({
      audience: node.config?.audience,
      theme: node.config?.theme,
      prompt: getPromptText(node, context),
      expectedSchema: node.config?.expectedSchema,
    })

    return {
      message: 'Structured prompt returned live output',
      output: {
        ...storyIdea,
        live: true,
        nodeKind: 'structured_prompt',
      },
    }
  }

  return {
    message: 'Structured prompt returned fallback output',
    output: {
      title: 'Milo and the Moonlight Kite',
      mainCharacter: 'Milo, a curious young fox',
      setting: 'a breezy meadow at the edge of a moonlit forest',
      conflict: 'Milo is afraid his handmade kite will never fly high enough to reach the stars',
      lesson: 'Patience and courage help small efforts become something beautiful',
      premise: 'A young fox builds a kite and learns that steady practice matters more than instant success.',
      live: false,
      fallback: true,
      nodeKind: 'structured_prompt',
    },
  }
}

async function executePrompt(node, context) {
  if (node.id === 'prompt-write-story') {
    const idea = context.lastOutput ?? {}
    const title = inferStoryTitle(idea)

    if (context.liveExecutors?.writeStory) {
      const storyDraft = await context.liveExecutors.writeStory(idea, { prompt: getPromptText(node, context) })
      return {
        message: 'Prompt node returned a live story draft',
        output: {
          ...storyDraft,
          live: true,
          nodeKind: 'prompt',
        },
      }
    }

    return {
      message: 'Prompt node returned fallback story draft',
      output: {
        title,
        storyText: `${title}\n\nMilo was a young fox who loved the sky. Every evening he watched the first stars sparkle above the meadow and wondered what it might feel like to send something of his all the way up to greet them.\n\nOne cool evening, Milo tied together twigs, soft cloth, and a long ribbon of blue string. “This will be my moonlight kite,” he whispered. But when he ran across the meadow, the kite only bumped and skipped over the grass. It did not rise at all.\n\nMilo tried again the next day. And the next. Sometimes the kite lifted for only a moment before tumbling down. Sometimes the wind spun it sideways. Sometimes Milo felt like giving up.\n\nBut each time, Milo changed one small thing. He made the tail a little longer. He held the string a little higher. He waited more carefully for the breeze.\n\nAt last, on a silver-blue evening, the wind caught the kite just right. Up it soared over the meadow, over the flowers, and high toward the first shining star. Milo laughed and ran and felt his heart rise with it.\n\nThe kite did not touch the stars. It did something better. It showed Milo what patient practice could do. And as the ribbon danced in the moonlight, Milo smiled and said, “That is high enough for tonight.”`,
        live: false,
        fallback: true,
        nodeKind: 'prompt',
      },
    }
  }

  const draft = context.lastOutput ?? {}

  if (context.liveExecutors?.editStory) {
    const editedStory = await context.liveExecutors.editStory(draft, { prompt: getPromptText(node, context) })
    return {
      message: 'Prompt node returned a live edited story',
      output: {
        ...editedStory,
        live: true,
        nodeKind: 'prompt',
      },
    }
  }

  return {
    message: 'Prompt node returned fallback edited story',
    output: {
      title: draft.title ?? 'The Little Lantern in the Woods',
      editedText: `${draft.storyText ?? ''}\n\nEdited for smoother read-aloud pacing, gentler transitions, and a warmer closing beat.`,
      notes: 'Trimmed repetition, improved rhythm, and preserved the core lesson.',
      live: false,
      fallback: true,
      nodeKind: 'prompt',
    },
  }
}

async function executeGoogleDriveSaveFile(node, context) {
  const previous = context.lastOutput ?? {}
  const title = previous.title ?? 'story'
  const fileName = buildFileName(node.config?.fileNameTemplate, title)
  const content = previous.editedText ?? previous.storyText ?? ''

  if (!node.config?.accountId) {
    throw new Error('Google Drive Save File requires a connected Google account.')
  }

  if (!content) {
    throw new Error('No content available to save to Google Drive.')
  }

  if (context.liveExecutors?.saveFileToGoogleDrive) {
    const file = await context.liveExecutors.saveFileToGoogleDrive({
      accountId: node.config?.accountId,
      fileName,
      content,
      destination: node.config?.destination,
      contentType: node.config?.contentType || 'text/plain',
    })

    return {
      message: 'Google Drive save completed through the live bridge',
      output: {
        ...file,
        saved: true,
        live: true,
        content,
      },
    }
  }

  return {
    message: 'Google Drive save used fallback metadata',
    output: {
      fileId: 'local-fallback-drive-file',
      fileName,
      destination: node.config?.destination || 'Workflow Studio/Children Stories',
      link: null,
      saved: false,
      live: false,
      fallback: true,
      content,
    },
  }
}

async function executeDownloadFile(node, context) {
  const previous = context.lastOutput ?? {}
  const title = previous.fileName ? previous.fileName.replace(/\.txt$/i, '') : previous.title ?? 'story'
  const content = previous.content ?? previous.editedText ?? previous.storyText ?? ''

  if (!content) {
    throw new Error('No content available to prepare for download.')
  }

  const fileName = previous.fileName || buildFileName(node.config?.fileNameTemplate, title)
  const contentType = node.config?.contentType || 'text/plain'

  return {
    message: 'Download artifact prepared in the app',
    output: {
      fileName,
      contentType,
      content,
      downloadUrl: toDownloadUrl({ fileName, content, contentType }),
      exportReady: true,
      live: true,
    },
  }
}

export async function executeNode(node, context) {
  switch (node.type) {
    case 'trigger': {
      if (node.toolId === 'trigger.schedule') {
        return {
          message: 'Schedule trigger started the workflow',
          output: {
            started: true,
            triggeredAt: getTimestamp(),
            triggerMode: node.config?.triggerMode ?? 'schedule',
            scheduleMode: node.config?.scheduleMode ?? 'cron',
            timezone: node.config?.timezone ?? 'UTC',
            enabled: node.config?.enabled ?? true,
            scheduleSummary: formatScheduleSummary(node.config),
            cronJobId: node.config?.cronJobId ?? null,
            triggerLabel: node.config?.triggerLabel ?? 'Scheduled workflow',
          },
        }
      }

      return {
        message: 'Manual trigger started the workflow',
        output: {
          started: true,
          triggeredAt: getTimestamp(),
          initiator: node.config?.initiator || 'user',
          triggerMode: node.config?.triggerMode ?? 'manual',
          triggerLabel: node.config?.triggerLabel ?? 'Start workflow',
        },
      }
    }
    case 'input': {
      if (node.toolId === 'sources.calendar_fetch') {
        const briefingConfig = context.lastOutput?.briefingConfig || {}
        const windowHours = node.config?.lookaheadHours ?? briefingConfig.calendar?.lookaheadHours ?? 24
        const accountId = node.config?.accountId || briefingConfig.calendar?.accountId || null
        const enabled = node.config?.enabled !== false && briefingConfig.calendar?.enabled !== false
        const destination = accountId || briefingConfig.calendar?.provider || 'google-calendar'

        if (!enabled) {
          return {
            message: 'Calendar fetch is disabled in the briefing configuration',
            output: {
              source: 'calendar',
              enabled: false,
              windowHours,
              events: [],
              unavailable: true,
              reason: 'disabled',
              live: false,
              blocked: false,
              summary: 'Calendar fetch disabled.',
            },
          }
        }

        if (!accountId) {
          return {
            message: 'Calendar fetch is blocked because no calendar account is configured',
            output: {
              source: 'calendar',
              enabled: true,
              windowHours,
              events: [],
              unavailable: true,
              blocked: true,
              reason: 'missing-account',
              destination,
              live: false,
              summary: `Calendar account unavailable for the next ${windowHours} hours.`,
            },
          }
        }

        return {
          message: 'Calendar fetch prepared an honest upcoming-events payload',
          output: {
            source: 'calendar',
            enabled: true,
            windowHours,
            accountId,
            destination,
            events: [],
            unavailable: true,
            blocked: true,
            reason: 'live-fetch-not-yet-implemented',
            live: false,
            summary: `Calendar account ${accountId} is selected, but live event fetch is not implemented yet.`,
          },
        }
      }

      if (node.toolId === 'sources.weather_fetch') {
        const upstream = collectIncomingOutputs(context.state, context.workflow, node.id)
        const briefingConfig = upstream.find((item) => item.from === 'load-briefing-config')?.output?.briefingConfig || context.lastOutput?.briefingConfig || {}
        const enabled = node.config?.enabled !== false && briefingConfig.weather?.enabled !== false
        const location = node.config?.location || briefingConfig.weather?.location || 'default'

        if (!enabled) {
          return {
            message: 'Weather fetch is disabled in the briefing configuration',
            output: {
              source: 'weather',
              enabled: false,
              location,
              forecast: null,
              unavailable: true,
              reason: 'disabled',
              live: false,
              blocked: false,
              summary: 'Weather fetch disabled.',
            },
          }
        }

        return {
          message: 'Weather fetch produced a static fallback forecast summary',
          output: {
            source: 'weather',
            enabled: true,
            location,
            forecast: {
              summary: 'Static fallback: weather integration not yet connected; no severe alerts assumed.',
              temperature: null,
              conditions: 'unknown',
            },
            unavailable: true,
            reason: 'live-fetch-not-yet-implemented',
            live: false,
            blocked: false,
            summary: `Weather for ${location} is using fallback summary only.`,
          },
        }
      }

      if (node.toolId === 'sources.system_status') {
        const upstream = collectIncomingOutputs(context.state, context.workflow, node.id)
        const briefingConfig = upstream.find((item) => item.from === 'load-briefing-config')?.output?.briefingConfig || context.lastOutput?.briefingConfig || {}
        const includeRepoState = node.config?.includeRepoState ?? briefingConfig.systemStatus?.includeRepoState ?? true
        const includeRuntimeHealth = node.config?.includeRuntimeHealth ?? briefingConfig.systemStatus?.includeRuntimeHealth ?? true
        const statusItems = []

        if (includeRepoState) {
          statusItems.push({
            label: 'Repository state requires live bridge implementation',
            summary: 'No repo status executor is wired yet for scheduled mission briefing.',
            severity: 'warning',
            source: 'repo',
            blocked: true,
            live: false,
          })
        }

        if (includeRuntimeHealth) {
          statusItems.push({
            label: 'Workflow Studio runtime available in local fallback mode',
            summary: 'Runtime can execute the workflow locally, but external bridge-backed health checks are not yet attached here.',
            severity: 'info',
            source: 'runtime',
            blocked: false,
            live: false,
          })
        }

        return {
          message: 'System / Project Status Fetch produced an honest operational-status payload',
          output: {
            source: 'system-status',
            enabled: node.config?.enabled !== false,
            statusItems,
            unavailable: statusItems.some((item) => item.blocked),
            live: false,
            blocked: statusItems.some((item) => item.blocked),
            summary: statusItems.map((item) => item.label).join('; '),
          },
        }
      }

      return {
        message: `Input placeholder completed: ${node.toolId ?? 'unknown-input'}`,
        output: {
          toolId: node.toolId,
          status: 'ok',
          placeholder: true,
        },
      }
    }
    case 'tool': {
      if (node.toolId === 'ai.structured_prompt') {
        return executeStructuredPrompt(node, context)
      }

      if (node.toolId === 'ai.prompt' || node.toolId === 'ai.prompt.edit') {
        return executePrompt(node, context)
      }

      if (node.toolId === 'ai.brief_synthesis') {
        const priorities = context.lastOutput?.priorities || {}
        const urgent = Array.isArray(priorities.urgent) ? priorities.urgent : []
        const today = Array.isArray(priorities.today) ? priorities.today : []
        const informational = Array.isArray(priorities.informational) ? priorities.informational : []
        const lines = [
          'Mission briefing',
          `Urgent: ${urgent.length}`,
          `Today: ${today.length}`,
          `Info: ${informational.length}`,
        ]

        if (urgent[0]) lines.push(`Top urgent: ${urgent[0].label} — ${urgent[0].summary || 'No summary.'}`)
        if (today[0]) lines.push(`Top today: ${today[0].label} — ${today[0].summary || 'No summary.'}`)
        if (!urgent[0] && informational[0]) lines.push(`Context: ${informational[0].label} — ${informational[0].summary || 'No summary.'}`)

        const recommendedNextAction = urgent[0]?.recommendedAction || today[0]?.recommendedAction || 'Review the top classified item and decide whether delivery should stay internal or be pushed outward.'

        return {
          message: 'Brief Synthesis produced a concise operational mission briefing',
          output: {
            briefing: lines.join('\n'),
            recommendedNextAction,
            priorities,
            live: false,
            fallback: true,
            placeholder: false,
            nodeKind: 'brief_synthesis',
          },
        }
      }

      if (node.toolId === 'config.load_briefing') {
        const trigger = context.lastOutput ?? {}
        const configuredSources = Array.isArray(node.config?.sources) ? node.config.sources : []
        const sourceFlags = {
          calendar: configuredSources.includes('calendar'),
          weather: configuredSources.includes('weather'),
          systemStatus: configuredSources.includes('system-status'),
        }

        return {
          message: 'Briefing config loaded workflow-level settings and trigger context',
          output: {
            briefingConfig: {
              sourceFlags,
              sources: configuredSources,
              deliveryTarget: node.config?.deliveryTarget || 'telegram-dm',
              quietHours: node.config?.quietHours || null,
              briefingStyle: node.config?.briefingStyle || 'concise-operational',
              urgencyThreshold: node.config?.urgencyThreshold || 'high',
              triggerContext: {
                triggerMode: trigger.triggerMode || 'schedule',
                scheduleMode: trigger.scheduleMode || null,
                triggeredAt: trigger.triggeredAt || getTimestamp(),
                timezone: trigger.timezone || 'UTC',
                scheduleSummary: trigger.scheduleSummary || formatScheduleSummary(node.config),
                triggerLabel: trigger.triggerLabel || 'Scheduled workflow',
              },
            },
            live: false,
            placeholder: false,
          },
        }
      }

      return {
        message: `Tool placeholder completed: ${node.toolId ?? 'unknown-tool'}`,
        output: {
          toolId: node.toolId,
          status: 'ok',
          result: node.config?.mockResult ?? `${node.label} finished`,
          placeholder: true,
        },
      }
    }
    case 'transform': {
      if (node.toolId === 'data.merge_inputs') {
        const sources = collectIncomingOutputs(context.state, context.workflow, node.id)
        const sourceMap = Object.fromEntries(sources.map((item) => [item.from, item.output || {}]))
        const calendar = sourceMap['calendar-fetch'] || {}
        const weather = sourceMap['weather-fetch'] || {}
        const systemStatus = sourceMap['system-project-status-fetch'] || {}
        const configPayload = sourceMap['load-briefing-config'] || {}
        const blockedSources = sources
          .filter((item) => item.output?.blocked || item.output?.unavailable)
          .map((item) => item.from)

        return {
          message: 'Merge Inputs normalized the upstream source payloads',
          output: {
            merged: {
              trigger: configPayload.trigger || null,
              briefingConfig: configPayload.briefingConfig || null,
              calendar: {
                events: calendar.events || [],
                summary: calendar.summary || summarizeEvents(calendar.events),
                blocked: Boolean(calendar.blocked),
                unavailable: Boolean(calendar.unavailable),
                reason: calendar.reason || null,
              },
              weather: {
                forecast: weather.forecast || null,
                summary: weather.summary || weather.forecast?.summary || null,
                blocked: Boolean(weather.blocked),
                unavailable: Boolean(weather.unavailable),
                reason: weather.reason || null,
              },
              systemStatus: {
                statusItems: systemStatus.statusItems || [],
                summary: systemStatus.summary || null,
                blocked: Boolean(systemStatus.blocked),
                unavailable: Boolean(systemStatus.unavailable),
              },
              blockedSources,
              sourceSummaries: sources.map((item) => ({
                from: item.from,
                blocked: Boolean(item.output?.blocked),
                unavailable: Boolean(item.output?.unavailable),
                summary: item.output?.summary || null,
              })),
            },
            live: false,
            placeholder: false,
          },
        }
      }

      return {
        message: `Transform placeholder completed: ${node.toolId ?? 'unknown-transform'}`,
        output: {
          toolId: node.toolId,
          status: 'ok',
          placeholder: true,
        },
      }
    }
    case 'branch': {
      if (node.toolId === 'logic.prioritize') {
        const merged = context.lastOutput?.merged || {}
        const urgent = []
        const today = []
        const informational = []
        const ignore = []

        for (const event of merged.calendar?.events || []) {
          today.push(buildPriorityItem({
            label: event.title || 'Calendar event',
            summary: event.summary || 'Upcoming calendar event',
            source: 'calendar',
            severity: event.severity || 'today',
            startsAt: event.startsAt || null,
            live: event.live,
            placeholder: event.placeholder,
          }))
        }

        for (const statusItem of merged.systemStatus?.statusItems || []) {
          const bucket = inferPriorityFromItem(statusItem)
          const normalized = buildPriorityItem(statusItem, { source: statusItem.source || 'system-status' })
          if (bucket === 'urgent') urgent.push(normalized)
          else if (bucket === 'today') today.push(normalized)
          else informational.push(normalized)
        }

        if (merged.calendar?.blocked) {
          urgent.push(buildPriorityItem({
            label: 'Calendar source blocked',
            summary: merged.calendar.summary || 'Calendar data unavailable.',
            source: 'calendar',
            severity: 'high',
            blocked: true,
          }))
        }

        if (merged.weather?.summary) {
          informational.push(buildPriorityItem({
            label: 'Weather context',
            summary: merged.weather.summary,
            source: 'weather',
            severity: merged.weather.blocked ? 'warning' : 'info',
            blocked: merged.weather.blocked,
          }))
        }

        if (urgent.length === 0 && today.length === 0 && informational.length === 0) {
          informational.push(buildPriorityItem({
            label: 'No actionable items detected',
            summary: 'The workflow completed without urgent or scheduled items.',
            source: 'workflow',
            severity: 'info',
          }))
        }

        return {
          message: 'Prioritize / Classify organized merged context into briefing buckets',
          output: {
            priorities: {
              urgent,
              today,
              informational,
              ignore,
            },
            counts: {
              urgent: urgent.length,
              today: today.length,
              informational: informational.length,
              ignore: ignore.length,
            },
            blockedSources: merged.blockedSources || [],
            live: false,
            placeholder: false,
          },
        }
      }

      if (node.toolId === 'logic.urgency_branch') {
        const payload = context.lastOutput || {}
        const priorities = payload.priorities || {}
        const urgentItems = Array.isArray(priorities.urgent) ? priorities.urgent : []
        const route = urgentItems.length > 0 ? 'urgent' : 'normal'
        return {
          message: 'Urgency Branch evaluated the current route from classified priorities',
          output: {
            urgent: urgentItems.length > 0,
            route,
            live: false,
            placeholder: false,
            briefing: payload.briefing,
            recommendedNextAction: payload.recommendedNextAction || null,
            priorities,
          },
        }
      }

      return {
        message: `Branch node completed: ${node.toolId ?? 'unknown-branch'}`,
        output: {
          toolId: node.toolId,
          status: 'ok',
          placeholder: false,
        },
      }
    }
    case 'output': {
      if (node.toolId === 'integrations.google_drive.save_file') {
        return executeGoogleDriveSaveFile(node, context)
      }

      if (node.toolId === 'outputs.download_file') {
        return executeDownloadFile(node, context)
      }

      if (node.toolId === 'outputs.send_message') {
        const destination = node.config?.destination || 'Unconfigured destination'
        const payload = context.lastOutput || {}
        return {
          message: 'Send Briefing prepared a non-delivering delivery record',
          output: {
            delivered: false,
            destination,
            briefing: payload.briefing || '',
            route: payload.route || 'normal',
            recommendedNextAction: payload.recommendedNextAction || null,
            live: false,
            blocked: true,
            reason: 'delivery-not-yet-implemented',
          },
        }
      }

      if (node.toolId === 'storage.persist_run_record') {
        const delivery = context.lastOutput || {}
        const runRecord = {
          runId: `run-${Date.now()}`,
          stored: false,
          storedAt: getTimestamp(),
          briefing: delivery.briefing || '',
          destination: delivery.destination || null,
          delivered: Boolean(delivery.delivered),
          route: delivery.route || 'normal',
          recommendedNextAction: delivery.recommendedNextAction || null,
          live: false,
          reason: 'persistence-not-yet-implemented',
        }
        return {
          message: 'Persist Run Record created an in-memory run record payload',
          output: {
            stored: false,
            runRecord,
            live: false,
            placeholder: false,
          },
        }
      }

      if (node.toolId === 'outputs.return_result') {
        const prior = context.lastOutput || {}
        const runRecord = prior.runRecord || prior
        return {
          message: 'Return Result prepared the final in-app workflow summary',
          output: {
            resultSummary: {
              status: runRecord.delivered ? 'delivered' : 'ready',
              runRecord,
              nextAction: runRecord.recommendedNextAction || null,
            },
            live: false,
            placeholder: false,
          },
        }
      }

      return {
        message: 'Output node completed',
        output: {
          result: context.lastOutput ?? {},
          placeholder: true,
        },
      }
    }
    default:
      return { message: 'Unhandled node type', output: {} }
  }
}
