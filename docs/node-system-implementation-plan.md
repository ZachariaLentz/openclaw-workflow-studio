# Node System Implementation Plan

## Goal
Strengthen Workflow Studio's node system before expanding workflow/app planning further.

The current bottleneck is not idea generation. The bottleneck is the quality of node primitives, node authoring ergonomics, runtime lookup, and node observability.

This plan aims to make node creation, validation, execution, and inspection faster, safer, and more reusable.

## Why do this first
Workflow Studio is already directionally correct:
- reusable node primitives over workflow-specific node sprawl
- honest runtime semantics
- local-first truthfulness
- chat + app authoring model

But code and product reality still have weaknesses:
- node knowledge is split across docs, workflow data, runtime, schema, and UI assumptions
- config validation is only partially tightened
- the node inspector is still partly hardcoded
- node creation is too manual
- runtime result shape is not normalized enough
- organizer readiness is described in docs but not encoded strongly enough in code

If this is not fixed first, bigger workflows such as the Affiliate Content Engine will be harder to build cleanly.

## Strategic objective
Move Workflow Studio toward a real node platform with:
- one node registry
- one source of truth for node metadata
- node-specific config validation
- default node creation helpers
- editor metadata for inspector rendering
- runtime executor lookup through the registry
- normalized node result envelopes

## Target architecture

## 1. Node registry
Introduce a central registry that contains one entry per reusable node/tool.

Suggested file:
- `src/lib/nodes/registry.js`

Suggested supporting structure:
- `src/lib/nodes/definitions/`
- `src/lib/nodes/createNode.js`
- `src/lib/nodes/result.js`

Each registry entry should define:
- `toolId`
- `title`
- `description`
- `nodeType`
- `toolKind`
- `defaultConfig`
- `configSchema`
- `editorFields`
- `accountRequirements`
- `organizer`
- `maturity`
- `executor`

This should become the main source of truth for active reusable nodes.

## 2. Node categories and status fields
Standardize four concepts.

### Node type
Execution role in graph:
- trigger
- input
- transform
- tool
- branch
- approval
- output

### Tool kind
Capability/system grouping:
- source
- ai
- data
- logic
- delivery
- storage
- integration
- ui
- system

### Organizer visibility
- live
- internal
- experimental
- hidden
- deprecated

### Runtime maturity
- real
- fallback-only
- scaffold
- simulated

This avoids confusion between execution role, product grouping, and readiness.

## 3. Node creation helpers
Node creation should stop depending on hand-built node objects.

Introduce helpers such as:
- `createNodeFromRegistry(toolId, overrides)`
- `getDefaultNodeConfig(toolId)`
- `getSuggestedNodeLabel(toolId)`
- `getEditorFields(toolId)`

This allows:
- faster UI node creation
- better Socrates patches
- reusable defaults
- safer blank workflow authoring

## 4. Editor metadata
Each node definition should include editor metadata for rendering forms.

Each field should describe:
- key
- label
- type
- required
- default
- placeholder
- help text
- options
- group/section

This can eventually drive a schema-aware node inspector rather than a hardcoded one.

## 5. Runtime executor lookup through registry
The runtime already improved by separating core/helpers/executors.

Next step:
- executor lookup should come from the node registry rather than growing conditional branches over time

This means adding:
- registry-driven executor resolution
- a stable executor contract

Suggested executor interface:
- input: `{ node, workflow, state, lastOutput, liveExecutors }`
- output: `{ message, output }`

## 6. Normalized node result envelope
Node execution results should become more standardized.

Current output shapes are improving, but they are still inconsistent.

Target envelope:
- `status`: completed | blocked | failed | skipped
- `mode`: live | fallback | simulated | disabled
- `summary`
- `output`
- `warnings`
- `errors`
- `metadata`

Even if the full transition is gradual, all active reusable nodes should converge toward this shape.

## 7. Stronger organizer readiness encoding
Organizer readiness should not only live in docs.

Registry entries should include something like:
- `organizer.visibility`
- `organizer.reason`
- `organizer.ready`

This lets the product decide what to show without relying on soft assumptions.

## First nodes to migrate
Start with nodes that are already closest to being reusable and organizer-worthy.

### Priority 1 nodes
- Schedule Trigger
- Prompt
- Structured Prompt
- Send Message
- Return Result
- Download File
- Google Drive Save File

### Priority 2 nodes
- Transform
- Branch

### Priority 3 nodes
- Calendar Fetch
- Weather Fetch
- System / Project Status Fetch
- Merge Inputs
- Prioritize / Classify
- Urgency Branch
- Persist Run Record

Reason:
- Priority 1 gives the biggest improvement to reusable building blocks
- Priority 2 strengthens core graph capability
- Priority 3 contains useful but not-yet-fully-reusable nodes

## Implementation phases

## Phase 1 — Registry foundation
### Goal
Create a node registry without changing visible behavior much.

### Deliverables
- `src/lib/nodes/registry.js`
- `src/lib/nodes/definitions/`
- registry entries for Priority 1 nodes
- helper functions for lookup by `toolId`

### Success criteria
- reusable node metadata exists in one place
- validation and runtime can reference registry entries

## Phase 2 — Node creation helpers
### Goal
Make node creation faster and less manual.

### Deliverables
- `createNodeFromRegistry(toolId, overrides)`
- default config generation
- suggested labels/titles
- stable ids later if needed

### Success criteria
- new nodes can be created from definitions rather than hand-built JSON fragments

## Phase 3 — Validation powered by registry
### Goal
Stop hardcoding active-node config validation in separate maps.

### Deliverables
- registry entries reference config schemas
- `validateWorkflow()` pulls node config schema from registry

### Success criteria
- config validation source of truth is the registry

## Phase 4 — Runtime lookup powered by registry
### Goal
Move executor binding behind the node registry.

### Deliverables
- executor reference stored in registry entries
- runtime resolves executor by `toolId`
- default fallback behavior when executor is absent

### Success criteria
- adding a new reusable node requires one registry definition + executor, not scattered changes

## Phase 5 — Editor metadata and inspector refactor
### Goal
Reduce hardcoded node-inspector behavior.

### Deliverables
- editor field definitions in registry entries
- inspector starts rendering common fields from metadata
- special-case UI only where truly necessary

### Success criteria
- at least Priority 1 nodes can render much of their config from definition metadata

## Phase 6 — Result envelope normalization
### Goal
Make runtime observability more consistent.

### Deliverables
- shared node result helper(s)
- gradual migration of active nodes to standardized result envelopes
- UI updates later to leverage status/mode/summary consistently

### Success criteria
- active nodes expose a more uniform shape for runtime inspection and testing

## Suggested file structure

```text
src/lib/nodes/
  registry.js
  createNode.js
  result.js
  definitions/
    trigger.schedule.js
    ai.prompt.js
    ai.structuredPrompt.js
    outputs.sendMessage.js
    outputs.returnResult.js
    outputs.downloadFile.js
    integrations.googleDriveSaveFile.js
```

Potential future expansion:

```text
src/lib/nodes/editors/
src/lib/nodes/contracts/
src/lib/nodes/presets/
```

## What to encode in each node definition
Suggested shape:

```js
{
  toolId: 'trigger.schedule',
  title: 'Schedule Trigger',
  description: 'Start a workflow on a real schedule.',
  nodeType: 'trigger',
  toolKind: 'system',
  defaultLabel: 'Schedule Trigger',
  defaultConfig: { ... },
  configSchema,
  editorFields: [ ... ],
  accountRequirements: null,
  organizer: {
    ready: true,
    visibility: 'live',
    reason: 'Reusable and close to fully supported',
  },
  maturity: 'fallback-only',
  executor: executeScheduleTrigger,
}
```

## Immediate coding priorities
If implementation starts now, do these in order:
1. add node registry foundation
2. move current node config validators into registry definitions
3. add `createNodeFromRegistry()`
4. wire `validateWorkflow()` to registry lookups
5. wire runtime executor lookup to registry entries
6. only then begin inspector rendering improvements

## Benefits to Workflow Studio overall
Doing this first strengthens:
- node creation speed
- node safety
- consistency across docs/runtime/UI
- Socrates authoring quality
- reuse of real primitives
- ability to build more complex workflows cleanly

## Why this matters for the Affiliate Content Engine
The affiliate workflow is not just another sample. It will pressure the system to support:
- research nodes
- ranking nodes
- packaging nodes
- creative nodes
- approval nodes
- publishing nodes
- review/analytics nodes

Those should not be added onto a weak node foundation.

By strengthening the node system first, the affiliate workflow can be designed against real reusable building blocks instead of one-off logic.

## Recommended next implementation slice
### Slice name
Node Registry Foundation

### Scope
- add registry structure
- migrate Priority 1 nodes into registry definitions
- update validation to use the registry
- keep visible app behavior mostly unchanged

### Verification
- schema tests still pass
- runtime tests still pass
- building existing sample workflows still works

## Litmus test
This work is succeeding when:
- adding a new reusable node no longer requires changes scattered across multiple unrelated files
- node creation uses defaults from a definition
- node validation comes from the same source as node metadata
- runtime executor selection is definition-driven
- inspector work becomes progressively more schema-driven instead of hardcoded
