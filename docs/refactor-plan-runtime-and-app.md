# Workflow Studio Refactor Plan: Runtime and App Structure

## Goal
Preserve the current product direction and honest runtime semantics while reducing architectural concentration.

This plan assumes the current behavioral direction is correct:
- more honest blocked/fallback/live semantics
- clearer reusable node contracts
- stronger schedule-trigger pressure testing
- stronger sample workflows

The problem is not direction.
The problem is shape.

## Current architectural pressure points

### 1. `src/App.jsx` is overloaded
It currently acts as:
- screen router
- state container
- workflow persistence controller
- schedule lifecycle controller
- account connection controller
- Socrates orchestration layer
- run orchestrator
- component module

This slows iteration and makes behavior harder to reason about.

### 2. `src/lib/runtime.js` is overloaded
It currently acts as:
- execution engine
- dependency scheduler
- node executor registry by conditionals
- workflow-specific business logic container
- helper library
- live/fallback behavior hub

This is the largest structural issue in the repo.

### 3. `src/data/workflows.js` mixes concerns
It currently acts as:
- sample workflow library
- product showcase
- starter template source
- test fixture set
- informal node/tool contract surface

These should not remain collapsed into one file long term.

### 4. Workflow validation is still too coarse
The current schema is useful for top-level shape and basic semantic checks, but active nodes still rely too heavily on free-form `config` objects.

### 5. Authored config and runtime-managed bindings are too close together
Schedule binding metadata should not remain mixed into hand-edited node config indefinitely.

## Refactor target
The repo should move toward five clearer domains:
- product screens/components
- workflow library and persistence
- runtime engine
- node executor modules
- node/tool contracts and validation

## Phase 1 — split runtime core from node implementations
Goal:
- keep behavior the same
- improve structure immediately

### Create
- `src/lib/runtime/core.js`
- `src/lib/runtime/helpers.js`
- `src/lib/runtime/registry.js`
- `src/lib/runtime/executors/`

### Move into `core.js`
- `runWorkflow`
- node dependency resolution
- runnable-node selection
- node state transitions
- event emission
- failure/deadlock handling

### Move into `helpers.js`
- `delay`
- `getTimestamp`
- `formatScheduleSummary`
- `inferPriorityFromItem`
- `summarizeEvents`
- `buildPriorityItem`
- other pure utility helpers

### Add executor modules by toolId or capability
Suggested executor files:
- `executors/trigger.manual.js`
- `executors/trigger.schedule.js`
- `executors/ai.structuredPrompt.js`
- `executors/ai.prompt.js`
- `executors/ai.briefSynthesis.js`
- `executors/sources.calendarFetch.js`
- `executors/sources.weatherFetch.js`
- `executors/sources.systemStatus.js`
- `executors/data.mergeInputs.js`
- `executors/logic.prioritize.js`
- `executors/logic.urgencyBranch.js`
- `executors/integrations.googleDriveSaveFile.js`
- `executors/outputs.downloadFile.js`
- `executors/outputs.sendBriefing.js`
- `executors/storage.persistRunRecord.js`
- `executors/outputs.returnResult.js`

### Registry shape
The registry should:
- resolve executor by `toolId` first
- optionally fall back by node `type`
- expose one consistent execution interface

Example executor interface:
- input: `{ node, workflow, state, lastOutput, liveExecutors }`
- output: `{ message, output }`

### Success criteria
- `runWorkflow` no longer contains per-node business logic branches
- node behavior lives in small, testable executor files
- test behavior remains unchanged

## Phase 2 — separate examples, templates, and fixtures
Goal:
- stop using one file for too many product roles

### Create
- `src/examples/workflows/`
- `src/templates/workflows/`
- `src/fixtures/workflows/`

### Intended responsibilities
#### examples
Documented showcase workflows used for demos/docs.

#### templates
Workflows intended as reusable authoring starting points.

#### fixtures
Stable test fixtures used by runtime and UI tests.

### Initial move
- move scheduled mission briefing into `examples/`
- move children’s story into `templates/` or `examples/`
- create a minimal fixture set for tests

### Success criteria
- tests do not depend on the same library source used for product seeding unless intentional
- product starters and test fixtures are clearly distinct

## Phase 3 — introduce node-specific config validation
Goal:
- preserve flexibility while improving correctness and UI quality

### Create
- `src/lib/schema/nodeSchemas/`

### Initial schemas to add
- `scheduleTriggerSchema.js`
- `promptSchema.js`
- `structuredPromptSchema.js`
- `transformSchema.js`
- `sendMessageSchema.js`
- `returnResultSchema.js`
- `googleDriveSaveFileSchema.js`

### Validation layers
#### Layer 1
Workflow-level schema validation
- top-level fields
- nodes/edges/tools arrays
- basic shape

#### Layer 2
Semantic validation
- node id uniqueness
- edge reference validity
- entry node validity

#### Layer 3
Node contract validation
- validate active-node config by `toolId`
- return typed, inspectable config errors

### Success criteria
- active nodes no longer depend entirely on `config: any`
- inspector forms can rely on stronger config expectations
- Socrates can target better-structured node updates

## Phase 4 — separate authored config from runtime-managed metadata
Goal:
- prevent long-term confusion between what users design and what the system attaches

### Recommended split
#### user-authored config
Stored in node config:
- schedule mode
- cron expression
- every interval
- runAt
- timezone
- enabled
- trigger label
- destination config
- mapping rules
- prompt/config fields

#### system-managed runtime metadata
Stored outside editable config:
- schedule binding id
- cron job id
- last fired at
- next run at
- binding status
- sync error
- delivery health metadata

### Recommended location options
- workflow-level runtime metadata object
- dedicated binding store
- system-managed metadata section not editable as normal user config

### Success criteria
- node config remains user-authored and portable
- backend/runtime bindings are clearly system state

## Phase 5 — split `src/App.jsx`
Goal:
- reduce file scope and isolate responsibilities

### Create screen modules
- `src/screens/WorkflowLibraryScreen.jsx`
- `src/screens/WorkspaceCanvasScreen.jsx`
- `src/screens/WorkspaceNodeScreen.jsx`
- `src/screens/WorkspaceRunScreen.jsx`
- `src/screens/WorkspaceSocratesScreen.jsx`
- `src/screens/WorkspaceSettingsScreen.jsx`

### Create component modules
- `src/components/WorkspaceHeader.jsx`
- `src/components/WorkspaceTabBar.jsx`
- `src/components/GraphView.jsx`
- `src/components/NodeDetailPanel.jsx`
- `src/components/RunPanel.jsx`
- `src/components/AccountsPanel.jsx`
- `src/components/BottomSheet.jsx`
- `src/components/EventTimeline.jsx`

### Create hooks
- `src/hooks/useWorkflowLibrary.js`
- `src/hooks/useWorkflowSelection.js`
- `src/hooks/useWorkflowRunner.js`
- `src/hooks/useBridgeConnection.js`
- `src/hooks/useSocrates.js`
- `src/hooks/useCanvasViewport.js`

### Create small controllers/services as needed
- `src/controllers/workflowPersistence.js`
- `src/controllers/scheduleActions.js`
- `src/controllers/accountActions.js`

### Success criteria
- `App.jsx` becomes a composition root, not a giant controller
- stateful behaviors live in focused hooks/controllers

## Phase 6 — improve tests to match architecture
Goal:
- make the honest runtime semantics durable

### Add tests for
- blocked vs disabled vs fallback source-node outputs
- route changes when urgency changes
- delivery-not-implemented semantics
- persistence-not-yet-implemented semantics
- schedule-trigger binding and state mapping
- executor-level behavior in isolation

### Success criteria
- runtime truthfulness is enforced in tests
- executors can be tested separately from full workflow runs

## Suggested execution order
1. split runtime into core + helpers + executors without changing behavior
2. move workflow examples/templates/fixtures into separate folders
3. add node-specific config validation for the currently active surface
4. split App into screens/components/hooks
5. separate runtime-managed binding metadata from user config
6. expand tests around runtime honesty and node contracts

## Recommended first small PR-sized slices

### Slice 1
Runtime extraction only:
- create runtime folder structure
- move helpers
- move one or two executors
- keep public API stable

### Slice 2
Complete runtime executor split:
- all current mission briefing + story executors extracted
- registry added
- tests green

### Slice 3
Node validation tightening:
- schedule trigger + prompt-family + send/result nodes

### Slice 4
Workflow source split:
- examples/templates/fixtures separated
- library seed logic updated

### Slice 5
App shell split:
- screens/components/hooks extracted with minimal behavioral change

## Litmus test for success
After this refactor, the repo should make these statements true:
- runtime core is generic and reusable
- node behavior is modular and testable
- examples are not mistaken for fixtures
- config validation is meaningfully stronger
- UI state orchestration is understandable without reading one giant file
- the product can safely deepen without collapsing under its own demo code
