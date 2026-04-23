# Workflow Studio vNext

## Product thesis
Workflow Studio should become the operator-grade authoring and runtime cockpit for reusable OpenClaw workflows.

It should not primarily feel like:
- a graph demo
- a sample-runtime playground
- a node catalog browser

It should primarily feel like:
- the fastest way to create a useful workflow from a real starting point
- a trustworthy place to inspect whether a workflow is actually runnable
- an operator surface for scheduled and manual workflows
- a clean bridge between chat authoring and structured executable workflow definitions

## Core principles

### 1. Trust over breadth
Do not widen the node surface faster than the runtime path becomes real.

### 2. Template-first, not blank-canvas-first
Most users should start from a workflow starter or natural-language brief, then customize.

### 3. Honest runtime state everywhere
Every workflow and node should clearly show whether it is:
- live
- blocked
- fallback
- disabled
- simulated
- failed

### 4. Reusable primitives over workflow-specific node sprawl
The organizer should expose a small reusable primitive set, not app-specific one-off nodes.

### 5. Separate authored design from system state
User-authored config, system-managed runtime bindings, and run history must remain distinct.

## Product modes

## Author
Purpose:
- create and modify workflows

Primary surfaces:
- template picker
- Socrates authoring chat
- workflow canvas
- node inspector
- JSON editor
- validation panel

Primary actions:
- create from template
- add/remove nodes
- edit config
- patch with Socrates
- validate workflow

### Authoring stance
Blank-canvas graph editing should remain available, but it should not be the default front door.

## Operate
Purpose:
- run, inspect, and trust workflows

Primary surfaces:
- run now
- recent runs
- run timeline
- per-node inputs/outputs
- schedule health
- delivery result
- run summary
- failure surface

Primary questions answered:
- Did it run?
- What happened?
- What failed?
- What was delivered?
- What should the operator do next?

## Connect
Purpose:
- manage dependencies, auth, accounts, and bridge/runtime health

Primary surfaces:
- bridge status
- connected accounts
- provider tests
- required capabilities per workflow/node
- schedule bindings
- auth failures

Primary questions answered:
- What dependencies does this workflow need?
- Which are connected?
- Which are broken?
- What is blocking real execution?

## Recommended organizer-ready node surface
Keep the live organizer narrow.

### Triggers
- Manual Trigger
- Schedule Trigger

### AI
- Prompt
- Structured Prompt

### Logic
- Branch

### Data
- Transform

### Outputs
- Return Result
- Download File

### Integrations
- Send Message
- Google Drive Save File

## Nodes that should remain off-organizer until fully usable
These can exist in docs, internal workflows, and samples before they are promoted into the live organizer:
- Calendar Fetch
- Weather Fetch
- System / Project Status Fetch
- Merge Inputs
- Prioritize / Classify
- Urgency Branch
- Persist Run Record

Reason:
- they are useful and increasingly honest
- but they still lack at least one required property for organizer admission: reusable config UI, live runtime path, validation, or standalone honest failure handling

## Preferred authoring flow
Default flow:
1. choose a template
2. describe the desired workflow in plain language
3. let Socrates customize the workflow
4. review/edit nodes and config
5. connect missing accounts
6. run a test
7. save and schedule

This should be the primary path to usefulness.

## Runtime architecture target
Workflow Studio should separate five layers:

### 1. Author-time validation
- workflow schema validation
- node contract validation
- semantic validation
- missing dependency warnings

### 2. Execution engine
- graph execution
- dependency scheduling
- run state transitions
- event log

### 3. Node executors
- reusable execution units by toolId/node type
- live/fallback/blocked semantics
- typed outputs

### 4. Adapters
- OpenClaw bridge
- provider integrations
- account access
- cron binding
- persistence backends

### 5. Observability
- run records
- node logs
- trigger status
- delivery status
- recent history

## Runtime honesty requirement
Every executor and UI surface should preserve truthful status semantics. Nodes and workflows should expose whether the behavior was:
- live
- blocked
- fallback
- disabled
- simulated
- failed

This should become a first-class product language, not just an implementation detail.

## Recommended roadmap

### Phase A — harden the runtime spine
- split runtime core from node executors
- add node-specific config validation for active nodes
- strengthen runtime tests

### Phase B — make one operational workflow truly trustworthy
- schedule trigger
- one live source
- brief synthesis
- return result
- optionally one real delivery path

### Phase C — improve operator UX
- stronger Operate mode
- per-node status badges
- schedule observability
- recent runs and failure surfaces

### Phase D — make authoring faster
- template-first workflow creation
- stronger Socrates patching
- better config forms
- reusable presets

### Phase E — widen the node surface carefully
Promote additional nodes only after runtime path, validation, config UI, and failure handling are genuinely reusable.

## Product litmus test
A workflow is only truly useful when an operator can answer, at a glance:
- Is it valid?
- Is it runnable right now?
- What dependencies are missing?
- What happened last time it ran?
- What will happen next?
- What should I do next?
