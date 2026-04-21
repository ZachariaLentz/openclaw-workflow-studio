# Node System v1

## Purpose
Define the first durable node taxonomy, organizer admission rule, and v1 node catalog for Workflow Studio.

This document is the product-facing source of truth for what kinds of nodes exist, how they should be organized, and which ones are allowed to appear in the live node organizer.

## Guiding principles
- Prefer reusable node primitives over workflow-specific bespoke nodes.
- Do not add non-working or simulated nodes to the live organizer.
- Keep taxonomy flat for now; avoid nested category systems until they are clearly needed.
- Let Socrates configure reusable nodes for specific use cases rather than inventing one-off node types.
- Keep the initial system local-first and honest about runtime capability.

## Flat taxonomy for v1
Workflow Studio should use these top-level node categories for v1:

- Triggers
- AI
- Logic
- Data
- Integrations
- Outputs

No subcategories in the main organizer yet.

## Category meanings

### Triggers
Nodes that start a workflow or admit an external event into the workflow graph.

### AI
Reusable model/runtime nodes that use prompts, structured outputs, agent behavior, or other general AI execution patterns.

### Logic
Nodes that control routing, branching, or execution flow.

### Data
Nodes that normalize, reshape, map, or otherwise prepare data between steps.

### Integrations
Nodes that connect the workflow to outside systems or services.

### Outputs
Nodes that end the workflow for the user or package final results in a user-facing form.

## Organizer admission rule
A node should appear in the live node organizer only when it is fully usable.

### Fully usable means all of the following are true
- The node executes for real through the intended runtime path.
- The node configuration UI is usable.
- Input validation works.
- Output shape is defined and observable.
- Normal failure cases are handled honestly.
- The node is useful in a real workflow without hidden simulated behavior.

If any of those are missing, the node stays out of the organizer.

## Product rule: no workflow-specific node sprawl
Workflow Studio should not create reusable node types like:
- Story Idea
- Write Story
- Edit Story

Those are workflow-specific applications of more general capabilities.

Instead, those should be authored using reusable nodes such as:
- Structured Prompt
- Prompt
- Transform
- Google Drive Save File
- Download File

Socrates should help configure the specific prompt, expected output, and field mapping.

## V1 node catalog
These are the first node types worth standardizing.

### Triggers
#### Manual Trigger
- Purpose: start a workflow from an explicit user action.
- Reusable: yes.
- Organizer status rule: include once real in-app triggering is stable.

### AI
#### Prompt
- Purpose: send prompt + context to a runtime and receive text back.
- Reusable: yes.
- Example uses: write story, edit text, summarize, brainstorm, rewrite.

#### Structured Prompt
- Purpose: send prompt + context + required output shape and receive structured data back.
- Reusable: yes.
- Example uses: extract fields, generate typed metadata, classify, produce well-shaped objects.

### Logic
#### Branch
- Purpose: route execution based on a condition or decision.
- Reusable: yes.

### Data
#### Transform
- Purpose: reshape, map, normalize, or template data between nodes.
- Reusable: yes.

### Integrations
#### Google Drive Save File
- Purpose: save generated content into Google Drive.
- Reusable: yes.
- Reason for category: this is an external service integration, not merely an output type.

### Outputs
#### Download File
- Purpose: package workflow output as a downloadable artifact for the user.
- Reusable: yes.

#### Return Result
- Purpose: end the workflow with a visible in-app result.
- Reusable: yes.

## Why Drive belongs under Integrations
Google Drive is an external destination with its own auth, permissions, and service behavior.

It should live under Integrations so the system can later add peers such as:
- Notion Create Page
- Dropbox Upload
- Gmail Draft
- S3 Upload
- Slack Post Message

That keeps the mental model clean:
- Download File is an Output
- Google Drive Save File is an Integration

## Recommended first build order
For the general reusable node system, the recommended order is:
1. Structured Prompt
2. Prompt
3. Download File
4. Google Drive Save File
5. Transform
6. Branch

This gives Workflow Studio the fastest path to useful real workflows without prematurely widening the node surface.

## Future node ideas worth keeping on the roadmap
These are intentionally not in the immediate build set, but they are worth preserving as future node directions.

### Trigger candidates
- Webhook Trigger
- Schedule Trigger

## Roadmap change: Schedule Trigger is now promoted
Schedule Trigger should move from future-candidate status into the active next-build surface.

Reason:
- the scheduled mission briefing workflow now depends on it
- it pressures real runtime integration rather than fake local timing
- it is a better trigger-system test than adding more content-generation nodes first

Recommended updated build order for the next workflow phase:
1. Schedule Trigger
2. Merge Inputs / Aggregate
3. Send Message
4. Prioritize / Classify
5. Branch
6. Calendar Fetch
7. Weather Fetch
8. System / Project Status Fetch
9. Persist Run Record

Manual Trigger remains part of v1, but Schedule Trigger is now the next important trigger primitive.

### Output / response candidates
- Webhook Response
- Explicit Return / Response shaping node for API-style workflows

These should stay in the future plan until there is a real workflow need for them.
## Children’s story workflow mapping
The children’s story workflow should be expressed using reusable nodes, not bespoke story nodes.

Recommended shape:
- Manual Trigger
- Structured Prompt (idea generation)
- Prompt (story draft)
- Prompt or Structured Prompt (edit/polish)
- Google Drive Save File
- Download File
- Return Result

This allows Workflow Studio to prove the node system using one concrete workflow while keeping the node catalog reusable for future workflows.