# Node Organizer Plan

## Goal
Create a sub-app inside Workflow Studio for creating, validating, testing, and promoting reusable node primitives one node at a time.

This is not a workflow editor replacement.
It is the factory for reusable nodes that Workflow Studio and Socrates can trust.

## Product thesis
Workflow Studio should not rely on loose JSON blobs or ad-hoc node invention.
The Node Organizer should become the source of truth for reusable node definitions, node maturity, authoring eligibility, and promotion readiness.

## Primary objective
Support this loop:
1. user describes a node in plain language
2. Socrates detects the node archetype
3. Socrates asks only the minimum required clarification questions
4. the system produces a structured node draft
5. the node draft is validated, tested, and reviewed
6. the node is promoted into the organizer-ready reusable catalog
7. Socrates can safely place the node into workflows

## Why now
Current Workflow Studio already has parts of a node system:
- node definitions
- config schemas
- editor field metadata
- executors
- validation
- Socrates patch normalization

But the system still lacks:
- a canonical node-definition contract
- a node lifecycle model
- structured clarification policy for node creation
- a dedicated organizer surface
- promotion gates for Socrates-safe reusable nodes

## What the Node Organizer is
A sub-app under Workflow Studio focused on reusable node primitives.

The organizer should also be operable from the built-in chat path, not only from a dedicated organizer screen.
The preferred experience is:
- user asks for a node in chat
- chat surfaces clarification questions
- answers produce a draft node
- the organizer/contract view remains available as a deeper inspection surface

Suggested routes:
- `/nodes`
- `/nodes/new`
- `/nodes/:toolId`

## Primary modes
### Catalog
List nodes by category, maturity, and organizer status.

### Draft
Create a node from plain language or a structured brief.

### Contract
Inspect identity, config schema, input/output contract, runtime semantics, editor fields, and authoring rules.

### Runtime
Inspect executor behavior, dependency requirements, fallback/blocked semantics, and side-effect level.

### Test
Run validation checks and node fixtures before promotion.

### Promote
Mark a node as authorable and organizer-ready only when it passes required gates.

## Core principles
### 1. One node at a time
Do not optimize for mass node generation before proving the single-node path.

### 2. Reusable primitives over workflow-specific hacks
Node definitions should represent reusable contracts, not one-off workflow behavior.

### 3. Honest runtime semantics
Each node must express whether behavior is live, blocked, fallback, simulated, or failed.

### 4. Clarification minimization
Socrates should ask the fewest questions required to produce a usable reusable node.

### 5. Promotion before placement
Socrates should place only organizer-approved reusable nodes into workflows.

### 6. Reuse before invention
When asked to create a workflow, Socrates should prefer existing organizer-approved nodes first and request a new node only when the workflow cannot be represented honestly with the current reusable node catalog.

### 7. Separate concerns cleanly
Socrates should distinguish between:
- creating a new reusable node
- creating a new reusable node type/archetype
- creating a workflow from existing nodes
These are separate actions and should not be conflated.

## Node lifecycle
### draft
Initial node concept or generated draft. Not authorable.

### scaffold
Shape exists but runtime or validation is incomplete. Not authorable.

### fallback-only
Usable with honest fallback behavior but not yet fully live.

### real
Backed by a real runtime path with honest blocked/failure handling.

### deprecated
No longer preferred for new authoring, but may remain for backward compatibility.

## Success criteria for the organizer
- a plain-language request can become a structured node draft
- the draft can be validated against a canonical node-definition contract
- the draft can be tested in isolation
- the organizer can clearly show what is missing before promotion
- Socrates can use only organizer-approved nodes in workflow authoring

## First implementation target
Do not start with multi-node authoring.
Prove the system with one reusable node.

Recommended first proof node:
- `logic.score_products`

Reason:
- clear reusable logic primitive
- forces a real input contract
- forces real clarification policy
- forces explainable scoring output
- useful for current affiliate direction without being affiliate-only

## First implementation slices
### Slice 1
- define node contract
- define node archetypes
- define clarification policy
- define promotion criteria

### Slice 2
- add Node Organizer sub-app shell
- add node catalog/status view
- add node detail contract view

### Slice 3
- support structured node-draft creation from plain language
- support clarification-needed response state
- support defaults preview

### Slice 4
- implement first proof node end-to-end
- validate, test, and promote it

## Non-goals for the first slice
- full multi-node generation
- dynamic node marketplace
- broad visual polish
- solving every current workflow issue first

## Key planning questions
1. What fields are mandatory for every node definition?
2. What makes a node authorable by Socrates?
3. What questions are required vs defaultable for each node archetype?
4. What tests are required before node promotion?
5. How should organizer state be represented in code and UI?
6. How should deprecated nodes be handled in existing workflows?
7. How should Socrates decide whether a request needs a new node, a new node archetype, or only a new workflow composed from existing nodes?
8. How should Socrates be scored on node-creation quality, speed, test success, and usability?

## Immediate next action
Implement the canonical node-definition contract and the Socrates clarification policy before building broad UI.