# Affiliate Content Engine MVP

## Purpose
Build Workflow Studio's first strong flagship workflow/app for affiliate publishing: a niche recommendation system that researches products, scores them, assembles themed roundup content, generates Pinterest-first creative and copy, routes through human approval, schedules publishing, and closes the loop with performance review.

This should be opinionated, practical, and narrow enough to ship.

---

## 1. Exact MVP niche

## Recommendation
Start with **practical home organization finds**.

### Why this niche
- strong Pinterest fit
- highly visual before/after and roundup potential
- broad product surface area
- practical buyer intent rather than novelty-only browsing
- easy to produce recurring themed lists
- relatively low expertise barrier compared with supplements, skincare, finance, or tools requiring deep technical authority
- clean bridge into adjacent niches later: kitchen organization, small-space living, family organization, cleaning systems, pantry storage, garage organization

### Audience
Primary audience:
- women 25-44
- family/home oriented
- wants a calmer, less cluttered home
- price sensitive but willing to buy practical upgrades
- responds to “worth it,” “under $X,” “small-space,” “easy fix,” and “Amazon favorite” framing

### Positioning
Not “viral junk.”
Position as:
- practical finds
- useful upgrades
- clutter-reducing systems
- realistic household improvements
- roundup recommendations that solve a real problem

### Sample content lanes
- small kitchen organization finds
- pantry storage products worth buying
- under-sink organizers that actually help
- closet organization for small spaces
- mudroom / entryway problem-solvers
- laundry room upgrades
- realistic Amazon finds for busy moms

### Non-goals for MVP
Do **not** start with:
- multiple niches
- Instagram-first strategy
- automated posting to many networks
- full multi-tenant creator platform
- autonomous approval-free publishing
- broad arbitrary product scraping from everywhere

---

## 2. End-to-end MVP workflow graph

## Core user outcome
A user chooses or confirms a niche/theme, reviews a shortlisted set of product recommendations and creative/copy outputs, approves a content pack, and schedules a Pinterest-ready roundup package.

## MVP graph overview

```text
Trigger / Brief
  -> Theme Generator
  -> Product Candidate Ingest
  -> Normalize Candidates
  -> Dedupe + Cluster
  -> Score Candidates
  -> Select Roundup Set
  -> Generate Content Brief
  -> Generate Pin Copy Variants
  -> Generate Disclosure Block
  -> Generate Creative Briefs / Assets
  -> Assemble Content Pack
  -> Human Approval
      -> Approved -> Schedule Publish
      -> Rework -> Regenerate selected step
      -> Rejected -> Archive / learn
  -> Log Published Asset
  -> Performance Review Ingest
  -> Review / Learnings Summary
```

## Detailed MVP graph

### A. Brief / trigger stage
Inputs:
- niche = home organization
- content lane or prompt (optional)
- cadence target
- post objective
- constraints (price cap, room type, tone)

Outputs:
- structured campaign brief
- suggested theme candidates

Example trigger prompts:
- “Create this week’s pantry organization roundup”
- “Find 10 practical small-space closet products under $50”
- scheduled weekly content batch

### B. Theme generation stage
Purpose:
Turn broad niche direction into a specific roundup angle.

Inputs:
- niche
- seasonality
- prior winning themes
- recent published themes
- constraints

Outputs:
- 3-10 theme candidates
- one selected theme

Example themes:
- 12 pantry organization finds that make small kitchens easier
- 9 under-sink organizers worth buying for cluttered bathrooms
- Amazon closet finds for small spaces that actually help

### C. Product ingest stage
Purpose:
Gather candidate products for the chosen theme.

MVP acceptable sources:
- curated manual import
- CSV import
- pasted product lists
- structured affiliate/source feed later

Outputs:
- raw product candidate set

Candidate fields:
- title
- url
- image
- category
- price
- rating / review count when available
- brand
- notes/source

### D. Normalize / dedupe / cluster stage
Purpose:
Prepare usable candidate records.

Operations:
- normalize titles/categories/prices
- remove exact duplicates
- cluster near-duplicate items
- infer use case tags
- infer room / problem-solved tags

Outputs:
- clean candidate pool
- duplicate groups / preferred representative item

### E. Scoring stage
Purpose:
Rank candidates for Pinterest-friendly roundup inclusion.

Scoring rubric for MVP:
- usefulness / problem-solving value
- niche fit
- visual appeal for Pinterest
- affordability / value perception
- roundup compatibility
- novelty / freshness
- confidence in source data
- compliance / risk flags

Outputs:
- total score
- component scores
- rationale
- warning flags

### F. Roundup selection stage
Purpose:
Choose the final content set.

Rules:
- target 8-12 items per roundup
- avoid redundant products
- ensure category spread where useful
- maintain price diversity but mostly accessible
- preserve a coherent theme

Outputs:
- final product set
- alternates / backups
- roundup title candidates

### G. Content generation stage
Purpose:
Create the written package.

Generate:
- roundup title options
- Pinterest pin titles
- pin descriptions
- short hook lines
- per-product blurbs
- roundup intro
- roundup outro / CTA
- optional landing page copy
- affiliate disclosure block

Outputs:
- structured content pack text

### H. Creative generation stage
Purpose:
Create Pinterest-ready visual directions/assets.

MVP outputs:
- 3-5 creative directions
- pin overlay text variants
- image prompts or asset compositions
- optional generated pin mockups

Outputs:
- creative brief(s)
- asset references
- text overlay variants

### I. Approval stage
Purpose:
Keep a human in control before publishing.

Reviewer sees:
- selected theme
- chosen products
- scores and rationale
- copy variants
- disclosures
- creative previews/prompts
- publish destination and timing

Approval actions:
- approve all
- reject all
- regenerate copy
- regenerate visuals
- swap a product
- edit title
- defer scheduling

Outputs:
- approval decision
- optional revision instructions

### J. Scheduling / publishing stage
Purpose:
Queue the approved package.

MVP target:
- Pinterest-first scheduling artifact

MVP acceptable outputs:
- scheduled publish record in Workflow Studio
- export-ready content package if direct platform integration is not ready
- future: direct Pinterest integration

Outputs:
- publish job record
- publish date/time
- board assignment
- destination URL

### K. Review loop stage
Purpose:
Learn what works.

Performance metrics for MVP:
- impressions
- saves
- outbound clicks
- CTR
- top-performing themes
- top-performing product attributes

Outputs:
- simple performance summary
- theme/product learnings
- candidate adjustments for next run

---

## 3. Data entities and state transitions

## Core entities

### NicheProfile
Purpose:
Defines the persistent strategy for a niche.

Fields:
- id
- name
- slug
- audienceSummary
- positioning
- toneProfile
- allowedChannels
- bannedClaims
- disclosurePolicy
- scoringWeights
- visualStyleNotes
- active

### ThemeCandidate
Fields:
- id
- nicheId
- title
- angle
- roomType
- problemSolved
- seasonality
- status (`candidate`, `selected`, `rejected`, `used`)
- rationale

### ProductCandidate
Fields:
- id
- sourceType
- sourceRef
- nicheId
- themeId
- title
- canonicalUrl
- imageUrl
- price
- category
- brand
- rating
- reviewCount
- tags
- normalizedAttributes
- dedupeKey
- status (`raw`, `normalized`, `deduped`, `scored`, `selected`, `rejected`, `archived`)

### ProductScore
Fields:
- id
- productId
- themeId
- usefulnessScore
- nicheFitScore
- visualScore
- valueScore
- roundupFitScore
- noveltyScore
- confidenceScore
- complianceRiskScore
- totalScore
- rationale
- warnings
- createdAt

### ContentPack
Purpose:
The main approval and publishing unit.

Fields:
- id
- nicheId
- themeId
- title
- status (`draft`, `review`, `approved`, `scheduled`, `published`, `archived`, `needs_revision`)
- selectedProductIds
- alternateProductIds
- pinTitleVariants
- pinDescriptionVariants
- roundupIntro
- roundupOutro
- productBlurbs
- disclosureText
- creativeBriefIds
- destinationUrl
- notes

### CreativeAsset
Fields:
- id
- contentPackId
- type (`brief`, `generated_mockup`, `template_render`, `image_prompt`)
- prompt
- overlayText
- assetPath
- status (`draft`, `ready`, `rejected`, `approved`)

### ApprovalDecision
Fields:
- id
- contentPackId
- reviewer
- decision (`approved`, `rework`, `rejected`, `deferred`)
- comments
- requestedChanges
- createdAt

### PublishJob
Fields:
- id
- contentPackId
- channel (`pinterest`)
- board
- scheduledFor
- destinationUrl
- status (`queued`, `scheduled`, `published`, `failed`, `canceled`)
- providerRef

### PerformanceRecord
Fields:
- id
- contentPackId
- publishJobId
- capturedAt
- impressions
- saves
- outboundClicks
- ctr
- notes

## State transitions

### ProductCandidate lifecycle
`raw -> normalized -> deduped -> scored -> selected`
Possible exits:
- `rejected`
- `archived`

### ThemeCandidate lifecycle
`candidate -> selected -> used`
Possible exit:
- `rejected`

### ContentPack lifecycle
`draft -> review -> approved -> scheduled -> published`
Alternative transitions:
- `review -> needs_revision`
- `needs_revision -> review`
- `review -> rejected`
- `approved -> archived`

### CreativeAsset lifecycle
`draft -> ready -> approved`
Alternative exits:
- `rejected`

### PublishJob lifecycle
`queued -> scheduled -> published`
Alternative exits:
- `failed`
- `canceled`

---

## 4. Missing node types / platform gaps

This flagship workflow is useful partly because it exposes what Workflow Studio still needs.

## Likely missing or weak platform capabilities

### A. Structured dataset / record store primitives
Need:
- first-class records/tables for products, themes, content packs, approvals, and performance

Current gap:
- workflows can pass data, but flagship app UX needs durable collections with status, filters, history, and references

Recommended capability:
- dataset nodes + app-level collections UI

### B. Ranking / scoring nodes
Need:
- weighted scorecards
- deterministic ranking
- explainable scoring output

Current gap:
- probably doable with generic logic/code nodes, but not ergonomic or visible enough

Recommended node types:
- `Score Records`
- `Rank / Sort`
- `Filter by Threshold`

### C. Dedupe / cluster nodes
Need:
- exact dedupe
- fuzzy dedupe
- similarity grouping

Recommended node types:
- `Normalize Records`
- `Dedupe Records`
- `Cluster Similar Items`

### D. Human approval node
Need:
- rich review packet with approve/reject/rework actions
- persistent approval state
- editable revisions

Current gap:
- human approval likely exists only as ad hoc UI/state

Recommended node/app capability:
- first-class `Approval Gate` node with structured outputs

### E. Content-pack assembly node
Need:
- map structured records into a reusable publishing package object

Recommended node:
- `Assemble Content Pack`

### F. Creative workflow nodes
Need:
- prompt templating
- asset generation
- asset selection / acceptance

Recommended node types:
- `Generate Creative Brief`
- `Generate Image Assets`
- `Select Asset Variant`

### G. Channel scheduling / publishing integration
Need:
- Pinterest-specific scheduling or at least export-ready publish jobs

Current gap:
- channel-specific publishing likely incomplete

Recommended path:
- MVP can start with `Create Publish Job` + export bundle
- direct Pinterest integration can follow

### H. Metrics ingestion / review nodes
Need:
- fetch performance metrics
- compare across themes / content packs
- summarize learnings

Recommended node types:
- `Fetch Channel Metrics`
- `Review Performance`
- `Update Scoring Weights`

### I. Rework loops with partial regeneration
Need:
- regenerate just copy, or just creative, or swap one product without rerunning whole graph

Recommended platform behavior:
- branch-level reruns / node-level replay from saved artifact state

### J. App-facing work queue UI
Need:
- review queue
- scheduled queue
- published archive
- top winners dashboard

This is more than nodes; it is app UX infrastructure.

---

## 5. Flagship app UX inside Workflow Studio

## Product name
Recommended internal/flagship name:
**Affiliate Content Engine**

Alternative names:
- Practical Finds Engine
- Pinterest Roundup Engine
- Affiliate Publisher Studio

## Primary app promise
Go from niche strategy to approved, schedulable Pinterest-ready affiliate content packs in one place.

## Core app screens

### A. Overview dashboard
Purpose:
Give the operator a high-signal snapshot.

Sections:
- next scheduled posts
- content packs awaiting approval
- recently published packs
- top winning themes
- candidate product pool count
- blocked integrations / missing accounts

### B. Niche strategy screen
Purpose:
Configure the persistent niche profile.

Controls:
- niche name
- audience summary
- positioning
- tone / voice
- disclosure defaults
- scoring weights
- price guardrails
- board/channel defaults

### C. Theme planner screen
Purpose:
Create and manage roundup opportunities.

Features:
- theme suggestions
- recent themes
- seasonal opportunities
- avoid-repeat guidance
- choose next theme to build

### D. Product research screen
Purpose:
Review candidate products.

Features:
- import list / feed / pasted items
- candidate table
- dedupe clusters
- score breakdown
- filters by category, price, score, room, problem solved
- shortlist builder

### E. Content pack builder screen
Purpose:
Assemble the package.

Features:
- selected products list
- title and angle options
- per-product blurbs
- disclosure preview
- pin title/description variants
- destination URL
- alternates

### F. Creative studio screen
Purpose:
Preview and refine visual direction.

Features:
- pin concept variants
- overlay text options
- prompt/template editing
- generated mockups / uploaded assets
- asset accept/reject controls

### G. Approval queue screen
Purpose:
Central review inbox.

Features:
- pending review items
- approve/rework/reject controls
- reviewer notes
- diff/history of revisions

### H. Scheduling screen
Purpose:
Manage outgoing publish jobs.

Features:
- calendar/list view
- board assignment
- scheduled timestamp
- status
- export package / publish action

### I. Review & learnings screen
Purpose:
Close the loop.

Features:
- performance table
- best themes
- best score patterns
- weak performers
- recommendations for next batch

## Primary UX loop
1. choose niche strategy
2. pick or generate theme
3. review shortlisted products
4. assemble content pack
5. approve or request changes
6. schedule publish
7. review performance later

## MVP interaction principles
- operator-first, not fully autonomous
- structured data over blob text
- obvious status transitions
- strong review/approval UX
- easy partial regeneration
- clear artifact trail from product pool to published pack

## Suggested first flagship workflow bundle

### Workflow 1: Build Content Pack
Input:
- niche + selected theme

Output:
- content pack in `review` state

### Workflow 2: Approve and Schedule
Input:
- reviewed content pack

Output:
- scheduled publish job

### Workflow 3: Review Performance
Input:
- published content packs

Output:
- learnings summary + suggested next themes

---

## Recommendation for immediate next build step
Translate this document into implementation artifacts:
1. app entity schema for the flagship app
2. starter workflow JSON(s) for the three workflow families
3. required new node definitions and editor metadata
4. app wireframe/component plan for the flagship UI

## Strong opinion
Do not build this flagship as a vague “AI affiliate agent.”
Build it as a **human-supervised content operating system** for one niche and one channel first. That is much more likely to become real, testable, and extensible.
