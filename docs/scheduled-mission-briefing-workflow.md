# Scheduled Mission Briefing Workflow

## Purpose
Define the next flagship workflow for Workflow Studio after the children’s story proof-of-concept.

This workflow is meant to pressure the reusable node system in a way that is:
- personally useful
- operationally honest
- broad enough to reveal the next high-value missing nodes
- grounded in real OpenClaw runtime behavior instead of fake demo logic

The core job of the workflow is simple:

> At a chosen time, gather selected real-world inputs, identify what actually matters, synthesize it into a concise actionable briefing, and deliver it through a real destination.

## Why this is the right next workflow
The children’s story workflow proved parts of the reusable node direction, but it still leaned heavily on linear AI generation and file output.

The scheduled mission briefing workflow forces Workflow Studio to support a much more realistic operational pattern:
- real time-based triggering
- real workflow configuration
- multi-source input gathering
- data merging
- prioritization/classification
- conditional routing
- delivery behavior
- run history and traceability

It is a better test of whether Workflow Studio is becoming a real automation product rather than a node-shaped demo.

## Product goals
Version 1 should prove all of the following:
1. a workflow can be triggered by a real adjustable OpenClaw cron-backed schedule
2. the run can carry trigger metadata into the workflow
3. multiple input nodes can feed one downstream synthesis path
4. the workflow can distinguish urgent from non-urgent outcomes
5. the final result can be delivered to a real destination
6. the workflow run remains understandable in the app UI

## User story
A user configures a mission briefing workflow to run on a real schedule, such as:
- every weekday at 7:00 AM
- every evening at 5:30 PM
- every 4 hours
- once later today

When the schedule fires, the workflow should:
1. collect selected inputs
2. normalize and merge them
3. identify what matters
4. synthesize a short briefing
5. branch if an urgent condition exists
6. send the briefing to the chosen destination

## Version 1 briefing shape
A successful version 1 briefing should produce something like:
- top priorities
- upcoming time-sensitive events
- blockers
- useful context
- recommended next action
- optional urgent section

The briefing should be concise and operational, not verbose or essay-like.

## Version 1 recommended sources
Start with a narrow but real source set.

Recommended first source candidates:
- Calendar events in the next 24-48 hours
- Weather summary if enabled
- OpenClaw/system/project state summary
- optional manually-provided context or pinned notes later

Email can be added soon after, but it does not need to block the first end-to-end proof if it slows trigger and orchestration work.

## Workflow shape
Recommended version 1 graph:

1. Scheduled Trigger
2. Load Briefing Config
3. Calendar Fetch
4. Weather Fetch
5. System / Project Status Fetch
6. Merge Inputs
7. Prioritize / Classify
8. Brief Synthesis
9. Urgency Branch
10. Send Briefing
11. Persist Run Record
12. Return Result

This should remain configurable so later variants can add or remove source nodes without changing the core architecture.

## Node-by-node intent

### 1. Scheduled Trigger
Starts the workflow on a real OpenClaw cron-backed schedule.

### 2. Load Briefing Config
Loads workflow-level configuration such as:
- source enablement
- urgency thresholds
- quiet hours
- delivery target
- briefing style

This may initially be implemented as workflow config directly rather than a separate fully surfaced node, but the runtime concept should exist.

### 3. Calendar Fetch
Fetches upcoming events within a configured time window.

### 4. Weather Fetch
Fetches a concise weather summary if weather is enabled.

### 5. System / Project Status Fetch
Fetches relevant operational state, such as:
- project blockers
- active repo state
- runtime health
- other local mission-control signals

### 6. Merge Inputs
Combines outputs from multiple source nodes into one normalized payload.

### 7. Prioritize / Classify
Sorts the merged payload into categories such as:
- urgent
- needs attention today
- informational
- ignore

### 8. Brief Synthesis
Produces the final briefing in a concise user-facing form.

### 9. Urgency Branch
Routes the workflow depending on whether urgent conditions were detected.

### 10. Send Briefing
Delivers the result to a real destination.

### 11. Persist Run Record
Stores a run summary/history artifact so the app can show what happened.

### 12. Return Result
Provides an in-app visible final result.

## Version 1 success criteria
The workflow should be considered successful only if all of these are true:
- the trigger is backed by a real OpenClaw cron job
- a scheduled run actually starts through the intended runtime path
- trigger metadata is visible in the run
- at least two real source nodes can feed a merged downstream path
- final output is generated and delivered for real
- run state is visible and understandable in the app
- failure states are honest and actionable

## What this workflow should reveal
This workflow is intentionally designed to expose the next missing reusable primitives.

Expected pressure areas:
- Schedule Trigger node
- source/integration fetch nodes
- merge/aggregate node
- classify/prioritize node
- branch/condition node improvements
- message/output delivery node
- run history persistence
- workflow-level config handling

## Future follow-on workflow connection
This workflow pairs naturally with a later planning workflow where the user supplies goals/tasks and the system:
- structures them
- turns them into calendar/reminder objects
- creates actionable scheduling artifacts
- feeds those artifacts back into the scheduled briefing workflow

That later workflow should be treated as a distinct next-stage design target, not folded prematurely into this one.
