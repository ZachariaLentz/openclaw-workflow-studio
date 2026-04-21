# Scheduled Mission Briefing Implementation Roadmap

## Purpose
Translate the scheduled mission briefing workflow into an execution order that is honest about dependencies.

The goal is not to build every node at once.
The goal is to establish the smallest real path that proves the workflow end-to-end while setting up the next reusable primitives cleanly.

## Core rule
Do not broaden the node surface faster than the runtime path becomes real.

If a node appears in the organizer, it must be fully usable by the existing product rule.
If a node is not yet fully usable, keep it documented and off-organizer until the runtime, UI, validation, and failure path are real.

## Recommended implementation phases

## Phase 1 — establish the trigger backbone
### Goal
Make a real cron-backed Schedule Trigger node possible.

### Deliverables
- Schedule Trigger node contract finalized
- workflow schema updated to support schedule trigger config
- UI surface for configuring schedule mode:
  - once
  - every interval
  - cron expression
- bridge/runtime path that creates and updates real OpenClaw cron jobs
- stored binding between workflow + node + backend cron job id
- delete/disable/update lifecycle defined honestly

### Must be true before calling this done
- editing schedule settings updates the real backend cron job
- disabling a trigger disables the real backend cron job
- deleting the trigger or workflow does not leave orphaned schedule behavior unnoticed
- app can display whether the trigger is active, disabled, broken, or unbound

## Phase 2 — create the smallest honest scheduled workflow
### Goal
Get one real scheduled workflow to fire and complete with minimal fake behavior.

### Recommended narrow version
- Schedule Trigger
- Weather Fetch or System Status Fetch
- Brief Synthesis
- Return Result

### Why this narrow slice
This proves:
- scheduled runs work
- trigger metadata enters runtime state
- the workflow can execute without a manual click
- the UI can represent scheduled execution honestly

This should happen before widening source count.

## Phase 3 — add multi-source aggregation
### Goal
Support more than one source feeding the briefing.

### Deliverables
- Merge Inputs / Aggregate node
- at least one more real source node
- normalized payload shape for downstream synthesis

### Recommended first source expansion
1. Calendar Fetch
2. Weather Fetch
3. System / Project Status Fetch

Email can follow later once the scheduling and aggregation model is proven.

## Phase 4 — add operational intelligence
### Goal
Make the briefing useful, not just descriptive.

### Deliverables
- Prioritize / Classify node
- improved Brief Synthesis behavior
- Urgency Branch behavior

### Output expectation
The workflow should be able to distinguish:
- urgent
- important today
- informational only
- no-action/noise

## Phase 5 — add real delivery
### Goal
Deliver the briefing somewhere real instead of only showing it in-app.

### Deliverables
- Send Message node or equivalent reusable delivery node
- destination config for at least one real channel
- delivery result metadata visible in run state

### Recommended first delivery target
- Telegram DM or current OpenClaw messaging path

This aligns naturally with mission-briefing behavior.

## Phase 6 — add run persistence/history
### Goal
Make scheduled runs observable over time.

### Deliverables
- Persist Run Record node or built-in workflow-run persistence behavior
- visible run history in the app
- last-run / next-run / last-success / last-failure surfaces for schedule-based workflows

## Missing reusable nodes prioritized

### Priority 1
- Schedule Trigger

### Priority 2
- Merge Inputs / Aggregate
- Send Message

### Priority 3
- Prioritize / Classify
- Calendar Fetch
- Weather Fetch
- System / Project Status Fetch

### Priority 4
- Persist Run Record
- richer condition/branch ergonomics
- workflow-level config loading abstraction

## Suggested runtime data model additions
The product likely needs durable workflow/runtime concepts for:
- workflow schedule bindings
- backend cron job ids
- trigger status
- last fired time
- next scheduled fire time
- last run result summary
- delivery result metadata

These should not be buried as ad-hoc node config only.
Some of them are system-managed runtime metadata and should be treated separately from user-authored config.

## Socrates documentation requirement
Because Schedule Trigger materially changes the authoring surface, Socrates-facing docs must be updated when implementation begins.

At minimum, Socrates should understand:
- what Schedule Trigger is
- how schedule modes differ
- what fields are required
- which parts are user-authored vs system-managed
- what downstream patterns are valid for scheduled workflows

Do not allow Socrates to lag behind the actual schedule-trigger surface.

## Recommended next concrete build step
The next concrete build step should be:
1. add Schedule Trigger to the documented active node surface
2. define the binding model between workflow node and OpenClaw cron job
3. implement basic create/update/delete/enable/disable lifecycle
4. create the first minimal scheduled workflow sample in the repo
5. only then widen into aggregation and delivery nodes
