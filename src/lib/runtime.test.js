import { describe, expect, it } from 'vitest'
import { sampleWorkflows } from '../data/workflows'
import { runWorkflow } from './runtime'

describe('runWorkflow', () => {
  const storyWorkflow = () => structuredClone(sampleWorkflows.find((workflow) => workflow.id === 'childrens-story-book'))
  const missionBriefingWorkflow = () => structuredClone(sampleWorkflows.find((workflow) => workflow.id === 'scheduled-mission-briefing'))
  const affiliateWorkflow = () => structuredClone(sampleWorkflows.find((workflow) => workflow.id === 'affiliate-build-content-pack'))

  it('completes the story flow and skips Google Drive when no account is connected', async () => {
    const workflow = storyWorkflow()
    const state = await runWorkflow(workflow)

    expect(state.status).toBe('completed')
    expect(state.nodeStatus['manual-trigger']).toBe('completed')
    expect(state.nodeStatus['structured-prompt-story-idea']).toBe('completed')
    expect(state.nodeStatus['prompt-write-story']).toBe('completed')
    expect(state.nodeStatus['prompt-edit-story']).toBe('completed')
    expect(state.nodeStatus['google-drive-save-file']).toBe('skipped')
    expect(state.nodeStatus['download-file']).toBe('completed')
    expect(state.nodeOutputs['download-file'].downloadUrl).toBeTruthy()
    expect(state.events.some((event) => event.type === 'node-skipped' && event.nodeId === 'google-drive-save-file')).toBe(true)
  })

  it('runs from the manual trigger node and produces downstream AI outputs', async () => {
    const workflow = storyWorkflow()
    const state = await runWorkflow(workflow, undefined, { triggerNodeId: 'manual-trigger' })

    expect(state.nodeOutputs['structured-prompt-story-idea']).toMatchObject({
      title: expect.any(String),
      nodeKind: 'structured_prompt',
    })
    expect(state.nodeOutputs['prompt-write-story']).toMatchObject({
      storyText: expect.any(String),
      nodeKind: 'prompt',
    })
    expect(state.nodeOutputs['prompt-edit-story']).toMatchObject({
      editedText: expect.any(String),
      nodeKind: 'prompt',
    })
  })

  it('runs the scheduled mission briefing workflow with honest blocked-source outputs and categorized downstream nodes', async () => {
    const workflow = missionBriefingWorkflow()
    const state = await runWorkflow(workflow)

    expect(state.status).toBe('completed')
    expect(state.nodeOutputs['calendar-fetch']).toMatchObject({
      source: 'calendar',
      blocked: true,
      reason: 'missing-account',
    })
    expect(state.nodeOutputs['merge-inputs']).toMatchObject({
      merged: {
        blockedSources: expect.arrayContaining(['calendar-fetch', 'weather-fetch', 'system-project-status-fetch']),
      },
    })
    expect(state.nodeOutputs['prioritize-classify'].counts.urgent).toBeGreaterThan(0)
    expect(state.nodeOutputs['urgency-branch']).toMatchObject({
      urgent: true,
      route: 'urgent',
    })
    expect(state.nodeOutputs['brief-synthesis']).toMatchObject({
      briefing: expect.stringContaining('Mission briefing'),
      nodeKind: 'brief_synthesis',
      placeholder: false,
    })
    expect(state.nodeOutputs['send-briefing']).toMatchObject({
      delivered: false,
      blocked: true,
      reason: 'delivery-not-yet-implemented',
    })
    expect(state.nodeOutputs['persist-run-record']).toMatchObject({
      stored: false,
      placeholder: false,
    })
    expect(state.nodeOutputs['return-result']).toMatchObject({
      resultSummary: {
        status: 'ready',
      },
    })
  })

  it('runs the affiliate build-content-pack workflow into a review-ready content pack', async () => {
    const workflow = affiliateWorkflow()
    const state = await runWorkflow(workflow)

    expect(state.status).toBe('completed')
    expect(state.nodeOutputs['select-theme']).toMatchObject({
      theme: {
        title: expect.stringContaining('pantry organization'),
      },
    })
    expect(state.nodeOutputs['load-product-candidates']).toMatchObject({
      products: expect.any(Array),
      count: expect.any(Number),
      placeholder: false,
    })
    expect(state.nodeOutputs['load-product-candidates'].products[0]).toMatchObject({
      affiliateUrl: expect.any(String),
      imageUrl: expect.any(String),
    })
    expect(state.nodeOutputs['review-candidates']).toBeDefined()
    expect(state.nodeOutputs['review-candidates']).toMatchObject({
      decision: {
        reviewMode: 'pre-score-candidate-gate',
        reviewedProducts: expect.any(Array),
        approvedCount: expect.any(Number),
      },
    })
    expect(state.nodeOutputs['filter-approved-candidates']).toMatchObject({
      approvedProducts: expect.any(Array),
      rejectedProducts: expect.any(Array),
      blocked: false,
    })
    expect(state.nodeOutputs['score-products'].scoredProducts.length).toBeGreaterThan(0)
    expect(state.nodeOutputs['select-roundup-set']).toMatchObject({
      selectedProducts: expect.any(Array),
      alternateProducts: expect.any(Array),
    })
    expect(state.nodeOutputs['generate-content-pack']).toMatchObject({
      contentPackDraft: {
        title: expect.any(String),
        pinTitleVariants: expect.any(Array),
      },
      nodeKind: 'affiliate_content_pack',
    })
    expect(state.nodeOutputs['generate-creative-briefs']).toMatchObject({
      creativeAssets: expect.any(Array),
      nodeKind: 'affiliate_creative_briefs',
    })
    expect(state.nodeOutputs['assemble-content-pack']).toMatchObject({
      contentPack: {
        reviewReady: true,
        selectedProducts: expect.any(Array),
        creativeAssets: expect.any(Array),
      },
    })
    expect(state.nodeOutputs['return-content-pack']).toMatchObject({
      resultSummary: {
        status: 'review-ready',
        contentPack: {
          reviewReady: true,
        },
      },
    })
  })

  it('uses a live affiliate research executor when the product source is set to research', async () => {
    const workflow = affiliateWorkflow()
    const productNode = workflow.nodes.find((node) => node.id === 'load-product-candidates')
    productNode.config = {
      ...productNode.config,
      sourceType: 'research',
      maxCandidates: 2,
    }

    const state = await runWorkflow(workflow, undefined, {
      liveExecutors: {
        researchAffiliateProducts: async () => ([
          {
            id: 'researched-1',
            title: 'Researched pantry riser',
            category: 'pantry-storage',
            price: 22.99,
            brand: 'Research Brand',
            rating: 4.7,
            reviewCount: 1200,
            tags: ['pantry', 'riser'],
            canonicalUrl: 'https://example.com/researched-pantry-riser',
            affiliateUrl: 'https://example.com/researched-pantry-riser?tag=affiliate-20',
            imageUrl: 'https://example.com/images/researched-pantry-riser.jpg',
            source: 'research',
            confidence: 0.93,
            rationale: 'Strong fit for pantry organization roundup',
          },
          {
            id: 'researched-2',
            title: 'Researched clear bin set',
            category: 'pantry-storage',
            price: 28.99,
            brand: 'Research Brand',
            rating: 4.6,
            reviewCount: 980,
            tags: ['pantry', 'clear bins'],
            canonicalUrl: 'https://example.com/researched-clear-bin-set',
            affiliateUrl: 'https://example.com/researched-clear-bin-set?tag=affiliate-20',
            imageUrl: 'https://example.com/images/researched-clear-bin-set.jpg',
            source: 'research',
            confidence: 0.91,
            rationale: 'Highly visual and practical candidate',
          },
        ]),
      },
    })

    expect(state.status).toBe('completed')
    expect(state.nodeOutputs['load-product-candidates']).toMatchObject({
      source: 'research',
      live: true,
      fallback: false,
      count: 2,
    })
    expect(state.nodeOutputs['filter-approved-candidates'].approvedProducts.length).toBeGreaterThan(0)
    expect(state.nodeOutputs['load-product-candidates'].products[0]).toMatchObject({
      source: 'research',
      confidence: 0.93,
      affiliateUrl: expect.stringContaining('tag=affiliate-20'),
      imageUrl: expect.stringContaining('.jpg'),
    })
  })
})
