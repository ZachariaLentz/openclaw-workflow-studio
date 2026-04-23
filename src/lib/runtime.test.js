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

  it('blocks the affiliate workflow when no real products are provided', async () => {
    const workflow = affiliateWorkflow()
    const state = await runWorkflow(workflow)

    expect(state.nodeOutputs['load-product-candidates']).toMatchObject({
      products: [],
      count: 0,
      blocked: true,
      reason: 'missing-real-product-input',
    })
  })

  it('runs the affiliate build-content-pack workflow into a review-ready content pack with explicit approvals and real setup context', async () => {
    const workflow = affiliateWorkflow()
    const productNode = workflow.nodes.find((node) => node.id === 'load-product-candidates')
    productNode.config = {
      ...productNode.config,
      productLines: [
        'Clear pantry bin set | 24.99 | pantry-storage | pantry,clear bins | HomeNest | https://amazon.com/bin-set?tag=zach0lentz04-20 | https://example.com/bin-set.jpg',
        'Tiered can rack | 19.99 | pantry-storage | pantry,cans | OrderlyCo | https://amazon.com/can-rack?tag=zach0lentz04-20 | https://example.com/can-rack.jpg',
        'Acrylic lazy Susan | 18.99 | cabinet-organization | pantry,turntable | BrightHome | https://amazon.com/lazy-susan?tag=zach0lentz04-20 | https://example.com/lazy-susan.jpg',
      ].join('\n'),
    }
    const reviewNode = workflow.nodes.find((node) => node.id === 'review-candidates')
    reviewNode.config = {
      ...reviewNode.config,
      reviewDecisions: [
        { productId: 'product-line-1', decision: 'approved', rationale: 'Strong pantry fit.' },
        { productId: 'product-line-2', decision: 'approved', rationale: 'Useful supporting product.' },
        { productId: 'product-line-3', decision: 'approved', rationale: 'Visual and practical.' },
      ],
    }

    const state = await runWorkflow(workflow)

    expect(state.status).toBe('completed')
    expect(state.nodeOutputs['load-product-candidates']).toMatchObject({
      count: 3,
      fallback: false,
    })
    expect(state.nodeOutputs['review-candidates']).toMatchObject({
      decision: {
        reviewMode: 'pre-score-candidate-gate',
        approvedCount: 3,
        requireExplicitApproval: true,
      },
    })
    expect(state.nodeOutputs['filter-approved-candidates']).toMatchObject({
      approvedProducts: expect.any(Array),
      blocked: false,
    })
    expect(state.nodeOutputs['validate-affiliate-links']).toMatchObject({
      validationSummary: {
        validProductCount: 3,
        invalidProductCount: 0,
      },
      blocked: false,
    })
    expect(state.nodeOutputs['collect-pinterest-publishing-setup']).toMatchObject({
      pinterestPublishingSetup: {
        username: 'zach0lentz',
      },
    })
    expect(state.nodeOutputs['collect-amazon-affiliate-setup']).toMatchObject({
      amazonAffiliateSetup: {
        associatesTag: 'zach0lentz04-20',
        marketplace: 'amazon.com',
        directLinkFallbackAllowed: true,
      },
    })
    expect(state.nodeOutputs['generate-content-pack']).toMatchObject({
      contentPackDraft: {
        title: expect.any(String),
        pinTitleVariants: expect.any(Array),
        pinterestPublishingSetup: {
          username: 'zach0lentz',
        },
        amazonAffiliateSetup: {
          associatesTag: 'zach0lentz04-20',
        },
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
        disclosurePolicy: {
          channel: 'pinterest',
        },
      },
    })
    expect(state.nodeOutputs['return-content-pack']).toMatchObject({
      resultSummary: {
        status: 'review-ready',
        contentPack: {
          reviewReady: true,
        },
        pinterestPublishingSetup: {
          username: 'zach0lentz',
        },
        amazonAffiliateSetup: {
          associatesTag: 'zach0lentz04-20',
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
    const reviewNode = workflow.nodes.find((node) => node.id === 'review-candidates')
    reviewNode.config = {
      ...reviewNode.config,
      reviewDecisions: [
        { productId: 'researched-1', decision: 'approved', rationale: 'High fit.' },
        { productId: 'researched-2', decision: 'approved', rationale: 'Good visual candidate.' },
      ],
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
    expect(state.nodeOutputs['validate-affiliate-links'].validationSummary.validProductCount).toBe(2)
    expect(state.nodeOutputs['load-product-candidates'].products[0]).toMatchObject({
      source: 'research',
      confidence: 0.93,
      affiliateUrl: expect.stringContaining('tag=affiliate-20'),
      imageUrl: expect.stringContaining('.jpg'),
    })
  })
})
