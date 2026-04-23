import { describe, expect, it } from 'vitest'
import { createNodeFromRegistry } from './createNode'
import { executeNode } from '../runtime/executors'
import { getDefaultNodeConfig, getNodeDefinition, getNodeEditorFields, getNodeExecutor } from './registry'

describe('node registry', () => {
  it('returns a definition for schedule trigger', () => {
    const definition = getNodeDefinition('trigger.schedule')

    expect(definition).toMatchObject({
      toolId: 'trigger.schedule',
      nodeType: 'trigger',
      title: 'Schedule Trigger',
    })
  })

  it('returns cloned default config', () => {
    const config = getDefaultNodeConfig('outputs.send_message')
    config.destination = 'Changed'

    const config2 = getDefaultNodeConfig('outputs.send_message')
    expect(config2.destination).toBe('Unconfigured destination')
  })

  it('creates a node from registry defaults', () => {
    const node = createNodeFromRegistry('outputs.return_result', {
      position: { x: 2, y: 3 },
    })

    expect(node).toMatchObject({
      type: 'output',
      label: 'Return Result',
      toolId: 'outputs.return_result',
      position: { x: 2, y: 3 },
      config: { visibleInApp: true },
    })
  })

  it('exposes editor fields for active nodes', () => {
    const fields = getNodeEditorFields('ai.prompt')

    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'runtimeTarget', required: true }),
      ]),
    )
  })

  it('exposes an executor for registered nodes', () => {
    expect(getNodeExecutor('outputs.return_result')).toBe(executeNode)
  })
})
