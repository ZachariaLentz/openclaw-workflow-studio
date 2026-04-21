import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleWorkflows } from '../data/workflows'
import { sendToSocrates } from './socrates'

describe('sendToSocrates', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        reply: 'Applied a patch.',
        change: { type: 'patch_workflow', operations: [{ op: 'set', path: 'name', value: 'Renamed' }] },
      }),
    }))
  })

  it('sends the structured workflow payload and returns the normalized response', async () => {
    const result = await sendToSocrates('Rename it.', sampleWorkflows[0])
    const [, options] = fetch.mock.calls[0]
    const body = JSON.parse(options.body)

    expect(body.message).toBe('Rename it.')
    expect(body.workflow.id).toBe(sampleWorkflows[0].id)
    expect(result.change.type).toBe('patch_workflow')
    expect(result.reply).toBe('Applied a patch.')
  })
})
