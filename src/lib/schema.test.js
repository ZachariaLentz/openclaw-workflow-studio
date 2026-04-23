import { describe, expect, it } from 'vitest'
import { validateWorkflow } from './schema'
import { sampleWorkflows } from '../data/workflows'

describe('validateWorkflow', () => {
  it('accepts the scheduled mission briefing sample workflow', () => {
    const workflow = structuredClone(sampleWorkflows.find((item) => item.id === 'scheduled-mission-briefing'))
    const result = validateWorkflow(workflow)

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects invalid schedule trigger config', () => {
    const workflow = structuredClone(sampleWorkflows.find((item) => item.id === 'scheduled-mission-briefing'))
    const trigger = workflow.nodes.find((node) => node.id === 'schedule-trigger')
    trigger.config = {
      ...trigger.config,
      scheduleMode: 'cron',
      cronExpression: '',
    }

    const result = validateWorkflow(workflow)

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'nodes.schedule-trigger.config',
          message: 'cronExpression is required for cron schedule mode',
        }),
      ]),
    )
  })

  it('rejects invalid send message config', () => {
    const workflow = structuredClone(sampleWorkflows.find((item) => item.id === 'scheduled-mission-briefing'))
    const sendNode = workflow.nodes.find((node) => node.id === 'send-briefing')
    sendNode.config = {
      ...sendNode.config,
      destination: '',
    }

    const result = validateWorkflow(workflow)

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'nodes.send-briefing.config.destination',
        }),
      ]),
    )
  })
})
