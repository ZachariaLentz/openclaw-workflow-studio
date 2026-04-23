# Affiliate Content Engine Implementation Plan

This document translates the MVP spec into concrete Workflow Studio artifacts:
- app entity schema
- starter workflow definitions
- required node additions
- flagship UI/component build plan

Related:
- `docs/affiliate-content-engine-mvp.md`

---

## 1. App entity schema

## App id
`affiliate-content-engine`

## App metadata
```json
{
  "id": "affiliate-content-engine",
  "name": "Affiliate Content Engine",
  "description": "Pinterest-first affiliate roundup planning, approval, scheduling, and performance review.",
  "primaryChannel": "pinterest",
  "primaryNiche": "home-organization",
  "status": "design-target"
}
```

## Entity model

### NicheProfile
```json
{
  "id": "niche-home-organization",
  "entityType": "NicheProfile",
  "name": "Practical Home Organization Finds",
  "slug": "home-organization",
  "audienceSummary": "Women 25-44 looking for practical, affordable ways to reduce clutter and improve home organization.",
  "positioning": "Practical, useful Amazon finds that solve real home clutter and storage problems.",
  "toneProfile": "clear, practical, non-hype, Pinterest-friendly",
  "allowedChannels": ["pinterest"],
  "disclosurePolicy": {
    "requiresAffiliateDisclosure": true,
    "shortDisclosure": "This post contains affiliate links. I may earn a commission if you buy through these links.",
    "placement": ["pin-description", "landing-page"]
  },
  "scoringWeights": {
    "usefulness": 0.22,
    "nicheFit": 0.18,
    "visualAppeal": 0.18,
    "value": 0.14,
    "roundupFit": 0.12,
    "novelty": 0.08,
    "confidence": 0.05,
    "complianceRisk": -0.03
  },
  "visualStyleNotes": [
    "bright, clean, organized scenes",
    "practical household contexts",
    "easy-to-read text overlays",
    "avoid cluttered compositions"
  ],
  "active": true
}
```

### ThemeCandidate
```json
{
  "id": "theme-pantry-small-kitchen-001",
  "entityType": "ThemeCandidate",
  "nicheId": "niche-home-organization",
  "title": "12 pantry organization finds that make small kitchens easier",
  "angle": "small-space pantry improvement",
  "roomType": "kitchen",
  "problemSolved": "pantry clutter",
  "seasonality": "evergreen",
  "status": "candidate",
  "rationale": "High Pinterest fit, practical need, clear roundup cohesion."
}
```

### ProductCandidate
```json
{
  "id": "product-001",
  "entityType": "ProductCandidate",
  "sourceType": "manual-import",
  "sourceRef": "csv:2026-04-home-org.csv",
  "nicheId": "niche-home-organization",
  "themeId": "theme-pantry-small-kitchen-001",
  "title": "Clear stackable pantry bin set",
  "canonicalUrl": "https://example.com/product-001",
  "imageUrl": "https://example.com/product-001.jpg",
  "price": 24.99,
  "category": "pantry-storage",
  "brand": "Example Brand",
  "rating": 4.6,
  "reviewCount": 18542,
  "tags": ["clear bins", "small kitchen", "pantry"],
  "normalizedAttributes": {
    "roomType": "kitchen",
    "problemSolved": "visibility and binning",
    "priceBand": "mid"
  },
  "dedupeKey": "clear-stackable-pantry-bin-set",
  "status": "raw"
}
```

### ProductScore
```json
{
  "id": "score-001",
  "entityType": "ProductScore",
  "productId": "product-001",
  "themeId": "theme-pantry-small-kitchen-001",
  "usefulnessScore": 9,
  "nicheFitScore": 9,
  "visualScore": 8,
  "valueScore": 7,
  "roundupFitScore": 9,
  "noveltyScore": 6,
  "confidenceScore": 8,
  "complianceRiskScore": 1,
  "totalScore": 8.21,
  "rationale": "Strong pantry relevance, easy to visualize, broad usefulness, competitive price point.",
  "warnings": [],
  "createdAt": "2026-04-23T10:30:00Z"
}
```

### ContentPack
```json
{
  "id": "content-pack-001",
  "entityType": "ContentPack",
  "nicheId": "niche-home-organization",
  "themeId": "theme-pantry-small-kitchen-001",
  "title": "12 pantry organization finds that make small kitchens easier",
  "status": "draft",
  "selectedProductIds": ["product-001", "product-002"],
  "alternateProductIds": ["product-010", "product-014"],
  "pinTitleVariants": [
    "12 Pantry Organization Finds for Small Kitchens",
    "Amazon Pantry Finds That Make Small Kitchens Easier"
  ],
  "pinDescriptionVariants": [
    "Practical pantry organization finds for small kitchens, including bins, risers, and storage upgrades that actually help."
  ],
  "roundupIntro": "If your pantry feels cramped, these practical organization finds can make a small kitchen easier to manage.",
  "roundupOutro": "A few well-chosen storage upgrades can make everyday kitchen life a lot less chaotic.",
  "productBlurbs": [],
  "disclosureText": "This post contains affiliate links. I may earn a commission if you buy through these links.",
  "creativeBriefIds": ["creative-001"],
  "destinationUrl": "https://example.com/pantry-roundup",
  "notes": "Draft content pack awaiting review"
}
```

### CreativeAsset
```json
{
  "id": "creative-001",
  "entityType": "CreativeAsset",
  "contentPackId": "content-pack-001",
  "type": "brief",
  "prompt": "Create a Pinterest pin concept for practical pantry organization finds in a bright, clean small-kitchen setting with readable overlay text.",
  "overlayText": "12 Pantry Organization Finds for Small Kitchens",
  "assetPath": null,
  "status": "draft"
}
```

### ApprovalDecision
```json
{
  "id": "approval-001",
  "entityType": "ApprovalDecision",
  "contentPackId": "content-pack-001",
  "reviewer": "zacharia",
  "decision": "rework",
  "comments": "Swap one item and tighten the title.",
  "requestedChanges": [
    "replace one redundant bin product",
    "make title more direct"
  ],
  "createdAt": "2026-04-23T10:40:00Z"
}
```

### PublishJob
```json
{
  "id": "publish-job-001",
  "entityType": "PublishJob",
  "contentPackId": "content-pack-001",
  "channel": "pinterest",
  "board": "Home Organization",
  "scheduledFor": "2026-04-25T16:00:00Z",
  "destinationUrl": "https://example.com/pantry-roundup",
  "status": "queued",
  "providerRef": null
}
```

### PerformanceRecord
```json
{
  "id": "performance-001",
  "entityType": "PerformanceRecord",
  "contentPackId": "content-pack-001",
  "publishJobId": "publish-job-001",
  "capturedAt": "2026-04-28T16:00:00Z",
  "impressions": 12034,
  "saves": 412,
  "outboundClicks": 188,
  "ctr": 0.0156,
  "notes": "Strong saves, decent clickthrough. Pantry angle performing well."
}
```

---

## 2. Starter workflow definitions

These are design-target canonical workflow definitions following the current v1 schema.

## Workflow A: Build Content Pack
Purpose:
Go from theme/brief to a review-ready content pack.

```json
{
  "id": "affiliate-build-content-pack",
  "name": "Affiliate Content Engine: Build Content Pack",
  "appId": "affiliate-content-engine",
  "version": "0.1.0",
  "description": "Create a review-ready affiliate content pack from a niche/theme brief.",
  "tags": ["affiliate", "pinterest", "content-pack", "roundup"],
  "outputs": ["theme", "rankedProducts", "contentPack", "creativeAssets"],
  "metadata": {
    "owner": "Zacharia",
    "appView": "affiliate-content-engine",
    "mode": "design-target",
    "primaryChannel": "pinterest"
  },
  "tools": [
    {
      "id": "trigger.manual",
      "title": "Manual Trigger",
      "kind": "local-cli",
      "description": "Start a workflow from an explicit user action in the app.",
      "inputSchema": {},
      "outputSchema": { "started": "boolean", "triggeredAt": "string", "initiator": "string" },
      "sideEffectLevel": "read"
    },
    {
      "id": "logic.select_theme",
      "title": "Select Theme",
      "kind": "logic",
      "description": "Select or generate the working roundup theme.",
      "inputSchema": { "brief": "object" },
      "outputSchema": { "theme": "object", "alternates": "array<object>" },
      "sideEffectLevel": "read"
    },
    {
      "id": "sources.product_candidates",
      "title": "Load Product Candidates",
      "kind": "source",
      "description": "Load candidate products for the selected niche/theme.",
      "inputSchema": { "theme": "object" },
      "outputSchema": { "products": "array<object>" },
      "sideEffectLevel": "read"
    },
    {
      "id": "data.normalize_records",
      "title": "Normalize Records",
      "kind": "data",
      "description": "Normalize product candidate fields.",
      "inputSchema": { "products": "array<object>" },
      "outputSchema": { "products": "array<object>" },
      "sideEffectLevel": "read"
    },
    {
      "id": "data.dedupe_records",
      "title": "Dedupe Records",
      "kind": "data",
      "description": "Remove duplicates and cluster similar products.",
      "inputSchema": { "products": "array<object>" },
      "outputSchema": { "products": "array<object>", "clusters": "array<object>" },
      "sideEffectLevel": "read"
    },
    {
      "id": "logic.score_products",
      "title": "Score Products",
      "kind": "logic",
      "description": "Apply weighted scoring to product candidates.",
      "inputSchema": { "products": "array<object>", "theme": "object" },
      "outputSchema": { "scoredProducts": "array<object>" },
      "sideEffectLevel": "read"
    },
    {
      "id": "logic.select_roundup_set",
      "title": "Select Roundup Set",
      "kind": "logic",
      "description": "Choose the final product set for the roundup.",
      "inputSchema": { "scoredProducts": "array<object>" },
      "outputSchema": { "selectedProducts": "array<object>", "alternateProducts": "array<object>" },
      "sideEffectLevel": "read"
    },
    {
      "id": "ai.generate_content_pack",
      "title": "Generate Content Pack",
      "kind": "openclaw",
      "description": "Generate titles, descriptions, blurbs, intro/outro, and disclosure placement.",
      "inputSchema": { "theme": "object", "selectedProducts": "array<object>" },
      "outputSchema": { "contentPackDraft": "object" },
      "sideEffectLevel": "read"
    },
    {
      "id": "ai.generate_creative_briefs",
      "title": "Generate Creative Briefs",
      "kind": "openclaw",
      "description": "Generate Pinterest-first creative directions and text overlays.",
      "inputSchema": { "contentPackDraft": "object" },
      "outputSchema": { "creativeAssets": "array<object>" },
      "sideEffectLevel": "read"
    },
    {
      "id": "data.assemble_content_pack",
      "title": "Assemble Content Pack",
      "kind": "data",
      "description": "Combine selected products, copy, and creative references into the review-ready content pack artifact.",
      "inputSchema": { "contentPackDraft": "object", "creativeAssets": "array<object>" },
      "outputSchema": { "contentPack": "object" },
      "sideEffectLevel": "write"
    },
    {
      "id": "outputs.return_result",
      "title": "Return Result",
      "kind": "ui",
      "description": "Return the review-ready content pack in the app.",
      "inputSchema": { "contentPack": "object" },
      "outputSchema": { "resultSummary": "object" },
      "sideEffectLevel": "read"
    }
  ],
  "entryNodeId": "manual-trigger",
  "nodes": [
    {
      "id": "manual-trigger",
      "type": "trigger",
      "label": "Manual Trigger",
      "description": "Start building a new affiliate content pack.",
      "toolId": "trigger.manual",
      "config": {
        "triggerMode": "manual",
        "triggerLabel": "Build content pack",
        "initiator": "zacharia"
      },
      "position": { "x": 0, "y": 0 }
    },
    {
      "id": "select-theme",
      "type": "transform",
      "label": "Select Theme",
      "description": "Select or generate the working roundup theme.",
      "toolId": "logic.select_theme",
      "config": {
        "nicheId": "niche-home-organization",
        "selectionMode": "guided",
        "allowThemeGeneration": true
      },
      "position": { "x": 1, "y": 0 }
    },
    {
      "id": "load-product-candidates",
      "type": "input",
      "label": "Load Product Candidates",
      "description": "Load product candidates for the theme.",
      "toolId": "sources.product_candidates",
      "config": {
        "sourceType": "manual-import",
        "maxCandidates": 50
      },
      "position": { "x": 2, "y": 0 }
    },
    {
      "id": "normalize-records",
      "type": "transform",
      "label": "Normalize Records",
      "description": "Normalize product candidate data.",
      "toolId": "data.normalize_records",
      "config": {
        "normalizeFields": ["title", "price", "category", "tags"]
      },
      "position": { "x": 3, "y": 0 }
    },
    {
      "id": "dedupe-records",
      "type": "transform",
      "label": "Dedupe Records",
      "description": "Remove duplicates and cluster similar products.",
      "toolId": "data.dedupe_records",
      "config": {
        "dedupeStrategy": "exact-plus-fuzzy",
        "fuzzyThreshold": 0.9
      },
      "position": { "x": 4, "y": 0 }
    },
    {
      "id": "score-products",
      "type": "transform",
      "label": "Score Products",
      "description": "Apply weighted ranking to products.",
      "toolId": "logic.score_products",
      "config": {
        "weightsProfile": "home-organization-default",
        "topK": 20
      },
      "position": { "x": 5, "y": 0 }
    },
    {
      "id": "select-roundup-set",
      "type": "transform",
      "label": "Select Roundup Set",
      "description": "Choose final products and alternates.",
      "toolId": "logic.select_roundup_set",
      "config": {
        "targetCount": 10,
        "alternateCount": 4,
        "enforceThemeCoherence": true
      },
      "position": { "x": 6, "y": 0 }
    },
    {
      "id": "generate-content-pack",
      "type": "tool",
      "label": "Generate Content Pack",
      "description": "Generate roundup copy and disclosure-aware text package.",
      "toolId": "ai.generate_content_pack",
      "prompt": "Generate a Pinterest-first affiliate roundup package for the selected theme and products. Keep it practical, clear, and non-hype. Return title variants, pin descriptions, product blurbs, intro/outro, and disclosure text.",
      "config": {
        "runtimeTarget": "daedalus",
        "channel": "pinterest",
        "nicheTone": "practical-home-organization"
      },
      "position": { "x": 7, "y": 0 }
    },
    {
      "id": "generate-creative-briefs",
      "type": "tool",
      "label": "Generate Creative Briefs",
      "description": "Generate creative directions and overlays.",
      "toolId": "ai.generate_creative_briefs",
      "prompt": "Generate 3-5 Pinterest creative directions for this content pack, including overlay text and visual framing guidance.",
      "config": {
        "runtimeTarget": "daedalus",
        "assetCount": 4,
        "channel": "pinterest"
      },
      "position": { "x": 8, "y": 0 }
    },
    {
      "id": "assemble-content-pack",
      "type": "transform",
      "label": "Assemble Content Pack",
      "description": "Assemble the review-ready content pack artifact.",
      "toolId": "data.assemble_content_pack",
      "config": {
        "initialStatus": "review",
        "includeAlternates": true
      },
      "position": { "x": 9, "y": 0 }
    },
    {
      "id": "return-content-pack",
      "type": "output",
      "label": "Return Result",
      "description": "Show the generated content pack in the app.",
      "toolId": "outputs.return_result",
      "config": {
        "visibleInApp": true,
        "displayMode": "content-pack-review"
      },
      "position": { "x": 10, "y": 0 }
    }
  ],
  "edges": [
    { "id": "ac1", "from": "manual-trigger", "to": "select-theme" },
    { "id": "ac2", "from": "select-theme", "to": "load-product-candidates" },
    { "id": "ac3", "from": "load-product-candidates", "to": "normalize-records" },
    { "id": "ac4", "from": "normalize-records", "to": "dedupe-records" },
    { "id": "ac5", "from": "dedupe-records", "to": "score-products" },
    { "id": "ac6", "from": "score-products", "to": "select-roundup-set" },
    { "id": "ac7", "from": "select-roundup-set", "to": "generate-content-pack" },
    { "id": "ac8", "from": "generate-content-pack", "to": "generate-creative-briefs" },
    { "id": "ac9", "from": "generate-creative-briefs", "to": "assemble-content-pack" },
    { "id": "ac10", "from": "assemble-content-pack", "to": "return-content-pack" }
  ]
}
```

## Workflow B: Approve and Schedule
Purpose:
Move a review-ready content pack through approval and scheduling.

```json
{
  "id": "affiliate-approve-and-schedule",
  "name": "Affiliate Content Engine: Approve and Schedule",
  "appId": "affiliate-content-engine",
  "version": "0.1.0",
  "description": "Review a generated content pack, approve or rework it, and schedule a publish job.",
  "tags": ["affiliate", "approval", "schedule", "pinterest"],
  "outputs": ["approvalDecision", "publishJob", "resultSummary"],
  "metadata": {
    "owner": "Zacharia",
    "appView": "affiliate-content-engine",
    "mode": "design-target"
  },
  "tools": [
    {
      "id": "trigger.manual",
      "title": "Manual Trigger",
      "kind": "local-cli",
      "description": "Start approval for a selected content pack.",
      "inputSchema": {},
      "outputSchema": { "started": "boolean", "triggeredAt": "string", "initiator": "string" },
      "sideEffectLevel": "read"
    },
    {
      "id": "inputs.load_content_pack",
      "title": "Load Content Pack",
      "kind": "storage",
      "description": "Load a selected content pack for review.",
      "inputSchema": { "contentPackId": "string" },
      "outputSchema": { "contentPack": "object" },
      "sideEffectLevel": "read"
    },
    {
      "id": "approval.review_content_pack",
      "title": "Review Content Pack",
      "kind": "approval",
      "description": "Present the content pack for human approval or rework.",
      "inputSchema": { "contentPack": "object" },
      "outputSchema": { "decision": "object" },
      "sideEffectLevel": "write"
    },
    {
      "id": "logic.approval_branch",
      "title": "Approval Branch",
      "kind": "logic",
      "description": "Route approved packs to scheduling and rework requests back to editing.",
      "inputSchema": { "decision": "object" },
      "outputSchema": { "approved": "boolean", "route": "string" },
      "sideEffectLevel": "read"
    },
    {
      "id": "outputs.create_publish_job",
      "title": "Create Publish Job",
      "kind": "delivery",
      "description": "Create a Pinterest publish job or export-ready scheduling artifact.",
      "inputSchema": { "contentPack": "object" },
      "outputSchema": { "publishJob": "object" },
      "sideEffectLevel": "write"
    },
    {
      "id": "outputs.return_result",
      "title": "Return Result",
      "kind": "ui",
      "description": "Return the review/scheduling result.",
      "inputSchema": { "decision": "object", "publishJob": "object" },
      "outputSchema": { "resultSummary": "object" },
      "sideEffectLevel": "read"
    }
  ],
  "entryNodeId": "manual-trigger",
  "nodes": [
    {
      "id": "manual-trigger",
      "type": "trigger",
      "label": "Manual Trigger",
      "description": "Start approval for a selected content pack.",
      "toolId": "trigger.manual",
      "config": {
        "triggerMode": "manual",
        "triggerLabel": "Review content pack",
        "initiator": "zacharia"
      },
      "position": { "x": 0, "y": 0 }
    },
    {
      "id": "load-content-pack",
      "type": "input",
      "label": "Load Content Pack",
      "description": "Load a review-ready content pack.",
      "toolId": "inputs.load_content_pack",
      "config": {
        "contentPackStatus": "review"
      },
      "position": { "x": 1, "y": 0 }
    },
    {
      "id": "review-content-pack",
      "type": "approval",
      "label": "Review Content Pack",
      "description": "Human approval gate for the content pack.",
      "toolId": "approval.review_content_pack",
      "config": {
        "allowedDecisions": ["approved", "rework", "rejected", "deferred"],
        "editableFields": ["title", "selectedProducts", "copy", "creative"]
      },
      "position": { "x": 2, "y": 0 }
    },
    {
      "id": "approval-branch",
      "type": "branch",
      "label": "Approval Branch",
      "description": "Route approval outcomes.",
      "toolId": "logic.approval_branch",
      "config": {
        "approvedRoute": "schedule",
        "reworkRoute": "return"
      },
      "position": { "x": 3, "y": 0 }
    },
    {
      "id": "create-publish-job",
      "type": "output",
      "label": "Create Publish Job",
      "description": "Create the scheduled Pinterest publish record.",
      "toolId": "outputs.create_publish_job",
      "config": {
        "channel": "pinterest",
        "board": "Home Organization",
        "mode": "export-or-direct"
      },
      "position": { "x": 4, "y": -1 }
    },
    {
      "id": "return-result",
      "type": "output",
      "label": "Return Result",
      "description": "Show approval or scheduling result in the app.",
      "toolId": "outputs.return_result",
      "config": {
        "visibleInApp": true,
        "displayMode": "approval-result"
      },
      "position": { "x": 5, "y": 0 }
    }
  ],
  "edges": [
    { "id": "aa1", "from": "manual-trigger", "to": "load-content-pack" },
    { "id": "aa2", "from": "load-content-pack", "to": "review-content-pack" },
    { "id": "aa3", "from": "review-content-pack", "to": "approval-branch" },
    { "id": "aa4", "from": "approval-branch", "to": "create-publish-job", "condition": "approved" },
    { "id": "aa5", "from": "approval-branch", "to": "return-result", "condition": "rework" },
    { "id": "aa6", "from": "create-publish-job", "to": "return-result" }
  ]
}
```

## Workflow C: Review Performance
Purpose:
Summarize how published content performed and inform the next batch.

```json
{
  "id": "affiliate-review-performance",
  "name": "Affiliate Content Engine: Review Performance",
  "appId": "affiliate-content-engine",
  "version": "0.1.0",
  "description": "Review content performance and summarize learnings for future roundups.",
  "tags": ["affiliate", "analytics", "review", "pinterest"],
  "outputs": ["performanceSummary", "recommendedThemes", "resultSummary"],
  "metadata": {
    "owner": "Zacharia",
    "appView": "affiliate-content-engine",
    "mode": "design-target"
  },
  "tools": [
    {
      "id": "trigger.manual",
      "title": "Manual Trigger",
      "kind": "local-cli",
      "description": "Start a performance review run.",
      "inputSchema": {},
      "outputSchema": { "started": "boolean", "triggeredAt": "string", "initiator": "string" },
      "sideEffectLevel": "read"
    },
    {
      "id": "inputs.load_published_packs",
      "title": "Load Published Content Packs",
      "kind": "storage",
      "description": "Load recently published content packs and related publish jobs.",
      "inputSchema": { "windowDays": "number" },
      "outputSchema": { "contentPacks": "array<object>" },
      "sideEffectLevel": "read"
    },
    {
      "id": "inputs.fetch_channel_metrics",
      "title": "Fetch Channel Metrics",
      "kind": "integration",
      "description": "Fetch Pinterest metrics or equivalent imported metrics.",
      "inputSchema": { "contentPacks": "array<object>" },
      "outputSchema": { "performanceRecords": "array<object>" },
      "sideEffectLevel": "read"
    },
    {
      "id": "logic.review_performance",
      "title": "Review Performance",
      "kind": "logic",
      "description": "Compare content packs and summarize what worked.",
      "inputSchema": { "performanceRecords": "array<object>" },
      "outputSchema": { "performanceSummary": "object" },
      "sideEffectLevel": "read"
    },
    {
      "id": "ai.recommend_next_themes",
      "title": "Recommend Next Themes",
      "kind": "openclaw",
      "description": "Recommend the next best content directions based on recent performance.",
      "inputSchema": { "performanceSummary": "object" },
      "outputSchema": { "recommendedThemes": "array<object>" },
      "sideEffectLevel": "read"
    },
    {
      "id": "outputs.return_result",
      "title": "Return Result",
      "kind": "ui",
      "description": "Return the review summary in the app.",
      "inputSchema": { "performanceSummary": "object", "recommendedThemes": "array<object>" },
      "outputSchema": { "resultSummary": "object" },
      "sideEffectLevel": "read"
    }
  ],
  "entryNodeId": "manual-trigger",
  "nodes": [
    {
      "id": "manual-trigger",
      "type": "trigger",
      "label": "Manual Trigger",
      "description": "Start the performance review run.",
      "toolId": "trigger.manual",
      "config": {
        "triggerMode": "manual",
        "triggerLabel": "Review performance",
        "initiator": "zacharia"
      },
      "position": { "x": 0, "y": 0 }
    },
    {
      "id": "load-published-packs",
      "type": "input",
      "label": "Load Published Content Packs",
      "description": "Load recent published content packs.",
      "toolId": "inputs.load_published_packs",
      "config": {
        "windowDays": 30,
        "channel": "pinterest"
      },
      "position": { "x": 1, "y": 0 }
    },
    {
      "id": "fetch-channel-metrics",
      "type": "input",
      "label": "Fetch Channel Metrics",
      "description": "Fetch or import recent Pinterest performance metrics.",
      "toolId": "inputs.fetch_channel_metrics",
      "config": {
        "provider": "pinterest",
        "mode": "import-or-direct"
      },
      "position": { "x": 2, "y": 0 }
    },
    {
      "id": "review-performance",
      "type": "transform",
      "label": "Review Performance",
      "description": "Summarize winners, losers, and patterns.",
      "toolId": "logic.review_performance",
      "config": {
        "groupBy": ["theme", "roomType", "problemSolved"],
        "primaryMetrics": ["impressions", "saves", "outboundClicks", "ctr"]
      },
      "position": { "x": 3, "y": 0 }
    },
    {
      "id": "recommend-next-themes",
      "type": "tool",
      "label": "Recommend Next Themes",
      "description": "Recommend future content directions from performance learnings.",
      "toolId": "ai.recommend_next_themes",
      "prompt": "Based on the recent performance summary, recommend the next five practical Pinterest roundup themes for the home organization niche. Favor themes with strong saves and clicks while avoiding obvious repetition.",
      "config": {
        "runtimeTarget": "daedalus",
        "recommendationCount": 5
      },
      "position": { "x": 4, "y": 0 }
    },
    {
      "id": "return-performance-result",
      "type": "output",
      "label": "Return Result",
      "description": "Show the performance review and recommendations in the app.",
      "toolId": "outputs.return_result",
      "config": {
        "visibleInApp": true,
        "displayMode": "performance-review"
      },
      "position": { "x": 5, "y": 0 }
    }
  ],
  "edges": [
    { "id": "ap1", "from": "manual-trigger", "to": "load-published-packs" },
    { "id": "ap2", "from": "load-published-packs", "to": "fetch-channel-metrics" },
    { "id": "ap3", "from": "fetch-channel-metrics", "to": "review-performance" },
    { "id": "ap4", "from": "review-performance", "to": "recommend-next-themes" },
    { "id": "ap5", "from": "recommend-next-themes", "to": "return-performance-result" }
  ]
}
```

---

## 3. Required new node definitions and editor metadata

These should be added as design-target reusable nodes rather than one-off workflow hacks.

## First-priority node additions

### 1. `logic.select_theme`
Purpose:
- select or generate a theme candidate from a niche profile

Suggested editor fields:
- `nicheId` (text/select)
- `selectionMode` (select: manual|guided|generate)
- `allowThemeGeneration` (boolean)

### 2. `sources.product_candidates`
Purpose:
- load candidate products from import/feed/manual source

Suggested editor fields:
- `sourceType` (select)
- `maxCandidates` (text/number)
- `sourceRef` (text)

### 3. `data.normalize_records`
Purpose:
- normalize structured records to predictable fields

Suggested editor fields:
- `normalizeFields` (schema)
- `mappingProfile` (text)

### 4. `data.dedupe_records`
Purpose:
- dedupe and cluster similar records

Suggested editor fields:
- `dedupeStrategy` (select)
- `fuzzyThreshold` (text)

### 5. `logic.score_products`
Purpose:
- apply weighted scoring across candidate products

Suggested editor fields:
- `weightsProfile` (text)
- `topK` (text)
- `minimumScore` (text)

### 6. `logic.select_roundup_set`
Purpose:
- choose final products and alternates for the pack

Suggested editor fields:
- `targetCount` (text)
- `alternateCount` (text)
- `enforceThemeCoherence` (boolean)

### 7. `ai.generate_content_pack`
Purpose:
- generate disclosure-aware copy package

Suggested editor fields:
- `runtimeTarget` (text)
- `channel` (text)
- `nicheTone` (text)

### 8. `ai.generate_creative_briefs`
Purpose:
- generate Pinterest creative directions

Suggested editor fields:
- `runtimeTarget` (text)
- `assetCount` (text)
- `channel` (text)

### 9. `data.assemble_content_pack`
Purpose:
- package structured content artifacts into a review-ready object

Suggested editor fields:
- `initialStatus` (select)
- `includeAlternates` (boolean)

### 10. `approval.review_content_pack`
Purpose:
- first-class approval gate with structured decisions

Suggested editor fields:
- `allowedDecisions` (schema)
- `editableFields` (schema)

### 11. `logic.approval_branch`
Purpose:
- deterministic branch for approval decisions

Suggested editor fields:
- `approvedRoute` (text)
- `reworkRoute` (text)

### 12. `outputs.create_publish_job`
Purpose:
- create a publish/schedule artifact for Pinterest

Suggested editor fields:
- `channel` (text)
- `board` (text)
- `mode` (select: export|direct|export-or-direct)

### 13. `inputs.load_content_pack`
Purpose:
- load a content pack by id/status

Suggested editor fields:
- `contentPackId` (text)
- `contentPackStatus` (text)

### 14. `inputs.load_published_packs`
Purpose:
- load recent published packs

Suggested editor fields:
- `windowDays` (text)
- `channel` (text)

### 15. `inputs.fetch_channel_metrics`
Purpose:
- fetch/import metrics from Pinterest or imported analytics

Suggested editor fields:
- `provider` (text)
- `mode` (select: import|direct|import-or-direct)

### 16. `logic.review_performance`
Purpose:
- summarize patterns across published content

Suggested editor fields:
- `groupBy` (schema)
- `primaryMetrics` (schema)

### 17. `ai.recommend_next_themes`
Purpose:
- recommend next themes from performance learnings

Suggested editor fields:
- `runtimeTarget` (text)
- `recommendationCount` (text)

---

## 4. Flagship UI / component build plan

## Proposed app shell
Create an app-specific experience inside Workflow Studio for `affiliate-content-engine` instead of relying only on the generic graph canvas.

## Screen/component plan

### A. `AffiliateEngineDashboard`
Purpose:
- top-level operational summary

Sections:
- draft content packs
- awaiting approval
- scheduled posts
- recent winners
- blocked integrations

### B. `NicheProfileEditor`
Purpose:
- edit niche strategy, scoring weights, disclosures, and defaults

### C. `ThemePlannerScreen`
Purpose:
- browse generated themes and pick next content direction

### D. `ProductResearchTable`
Purpose:
- review imported candidates, scores, tags, price, and dedupe groups

### E. `ContentPackBuilder`
Purpose:
- view/edit title variants, selected products, blurbs, disclosures, and destination URL

### F. `CreativeStudioPanel`
Purpose:
- preview/edit creative directions, overlays, prompt variants, and chosen assets

### G. `ApprovalQueueScreen`
Purpose:
- central inbox for content packs in review state

### H. `PublishCalendarScreen`
Purpose:
- list/calendar view of queued and scheduled publish jobs

### I. `PerformanceReviewScreen`
Purpose:
- analytics + recommendations

## Suggested build order
1. `AffiliateEngineDashboard`
2. `ContentPackBuilder`
3. `ApprovalQueueScreen`
4. `ProductResearchTable`
5. `ThemePlannerScreen`
6. `PublishCalendarScreen`
7. `PerformanceReviewScreen`
8. `NicheProfileEditor`
9. `CreativeStudioPanel`

## Why this order
- content pack + approval are the core operator loop
- research and theme planning matter next
- scheduling and analytics come after the content artifact is real
- niche editing and creative polish can follow once the main object model is stable

---

## 5. Concrete near-term implementation sequence

### Slice 1: Canonical artifacts
- add Affiliate Content Engine workflow definitions to `src/data/workflows.js`
- keep them marked `design-target`
- preserve existing sample workflows

### Slice 2: Node registry groundwork
- add design-target node definitions for the new affiliate nodes in `src/lib/nodes/definitions.js`
- include editor field metadata and config schema placeholders where useful

### Slice 3: App surfacing
- make the affiliate workflows visible in the workflow library
- add app label / category metadata for flagship workflows

### Slice 4: Content-pack-focused UI
- implement `ContentPackBuilder` + `ApprovalQueueScreen` scaffold
- use local mock entities first, then connect to runtime/state model

### Slice 5: Record-store primitive design
- define how app entities are persisted, queried, and filtered inside Workflow Studio
- this becomes shared infrastructure for more than the affiliate app

---

## Strong implementation opinion
Do not try to make all of these nodes fully real before exposing the flagship app shape.

Better path:
1. make the flagship app visible and concrete
2. make the object model explicit
3. make the workflows navigable in the studio
4. then harden the reusable runtime and persistence primitives underneath

That keeps Workflow Studio pointed at a real product instead of drifting into abstract infrastructure work.
