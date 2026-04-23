# Node Contracts v1

## Purpose
Define the minimum contract for each v1 node type before implementation.

Each node contract should specify:
- purpose
- required configuration
- inputs
- outputs
- failure behavior
- minimum bar for being considered fully usable

## 1. Manual Trigger

### Purpose
Start a workflow from an explicit user action in the app.

### Required configuration
- trigger label

### Inputs
- none

### Outputs
- run start event
- optional metadata such as trigger time and initiator

### Failure behavior
- If the workflow cannot start, the UI should show a visible run-start failure.

### Fully usable means
- user can start the workflow from the app
- run begins through the real runtime path
- state updates are visible in the UI

## 2. Prompt

### Purpose
Send prompt + context to a runtime and receive text output.

### Required configuration
- runtime target
- prompt template
- input mapping

### Optional configuration
- model/runtime mode
- temperature/style controls later
- timeout

### Inputs
- structured context object
- optional upstream text fields

### Outputs
- text result
- execution metadata

### Failure behavior
- runtime failures are surfaced
- invalid prompt configuration is blocked before run
- timeout/failure state is recorded clearly

### Fully usable means
- node executes against the real runtime
- prompt can consume upstream data
- text result appears in run state and UI
- failures are explicit, not simulated

## 3. Structured Prompt

### Purpose
Send prompt + context + expected schema to a runtime and receive structured output.

### Required configuration
- runtime target
- prompt template
- input mapping
- expected output schema

### Optional configuration
- validation strictness
- retry-on-parse-failure policy later
- timeout

### Inputs
- structured context object
- optional upstream fields

### Outputs
- structured object
- execution metadata

### Failure behavior
- parse/shape mismatch is surfaced clearly
- invalid schema blocks configuration or run
- runtime failure is recorded honestly

### Fully usable means
- structured output returns through the real runtime path
- returned object is validated
- downstream nodes can consume the result reliably
- bad output is surfaced as bad output, not silently coerced into success

## 4. Branch

### Purpose
Choose the next route based on a condition.

### Required configuration
- condition rule or expression
- route mapping

### Inputs
- structured data from upstream nodes

### Outputs
- branch decision
- route selection metadata

### Failure behavior
- invalid condition config blocks run
- evaluation errors are surfaced in run state

### Fully usable means
- node can route a real workflow deterministically
- downstream paths reflect the selected branch in UI and runtime state

## 5. Transform

### Purpose
Reshape, map, normalize, or template data for downstream nodes.

### Required configuration
- field mapping and/or transform definition

### Inputs
- upstream structured data

### Outputs
- transformed structured data

### Failure behavior
- invalid field references are surfaced
- invalid transform definitions block execution

### Fully usable means
- data can be remapped predictably
- downstream nodes receive the transformed payload
- configuration is understandable in the UI

## 6. Google Drive Save File

### Purpose
Save text or file output to Google Drive.

### Required configuration
- target account/credential
- destination path or folder
- file naming rule
- content mapping

### Inputs
- text or file payload
- metadata such as title or file name

### Outputs
- save result metadata
- destination info
- remote file identifier/link if available

### Failure behavior
- auth failure is surfaced clearly
- permission failure is surfaced clearly
- missing destination/content blocks run

### Fully usable means
- node performs a real write to Google Drive
- auth is handled through the actual intended path
- saved artifact metadata is returned to the workflow
- failure states are visible and actionable

## 7. Download File

### Purpose
Produce a browser/local download artifact for the user.

### Required configuration
- content mapping
- file name rule
- content type/format

### Inputs
- text or file payload

### Outputs
- downloadable artifact metadata
- local download action state

### Failure behavior
- missing content blocks output generation
- unsupported format is surfaced clearly

### Fully usable means
- user can download the generated artifact from the app
- file name and content are correct
- result is not a fake placeholder

## 8. Return Result

### Purpose
End the workflow with a visible in-app result.

### Required configuration
- result mapping
- display mode

### Inputs
- any final workflow data

### Outputs
- terminal visible result in the app

### Failure behavior
- missing mapped result is surfaced as a display/output configuration issue

### Fully usable means
- final result is visible and understandable in the app
- workflow can complete with this node as a valid terminal path

## 9. Schedule Trigger

### Purpose
Start a workflow from a real adjustable time-based schedule backed by an OpenClaw cron job.

### Required configuration
- schedule mode
- timezone
- enabled state

### Supported schedule modes
- once
- every interval
- cron expression

### Required mode-specific configuration
For `once`:
- absolute timestamp

For `every interval`:
- interval duration
- optional anchor/start time

For `cron expression`:
- cron expression string

### Optional configuration
- human-readable label
- run context payload
- quiet-hours policy later
- backend binding metadata stored by the system, not hand-edited by the user

### Inputs
- none

### Outputs
- run start event
- trigger metadata including:
  - trigger type
  - trigger time
  - schedule mode
  - timezone
  - cron job id
  - human-readable schedule summary

### Failure behavior
- invalid schedule config blocks save or activation
- cron creation/update failure is surfaced clearly
- disabled trigger does not fire and is visibly marked disabled
- deleted workflow or broken cron binding is surfaced honestly in the app

### Fully usable means
- node creates or updates a real OpenClaw cron job
- schedule changes in the app update the real backend schedule
- disabling the node disables the real cron job
- deleting the node or workflow removes or detaches the cron job appropriately
- a real scheduled event can start the workflow through the intended runtime path
- trigger metadata is visible in workflow run state

## 10. Calendar Fetch

### Purpose
Fetch upcoming calendar events for a configured window, or surface an honest blocked/unavailable state when calendar access is not actually available.

### Required configuration
- enabled state
- lookahead window
- target calendar account/provider when live integration exists

### Inputs
- briefing config

### Outputs
- events array
- window metadata
- blocked/unavailable status
- reason code when unavailable

### Failure behavior
- missing account must surface as blocked, not fake empty success
- disabled state must be explicit
- live integration errors must be visible in run state

### Fully usable means
- node can fetch real calendar events through the intended integration path
- account/config validation works before or during run
- blocked and unavailable states are understandable in the UI
- downstream nodes can consume the output shape reliably

## 11. Weather Fetch

### Purpose
Fetch weather context for a configured location, or surface an explicit fallback/disabled state honestly.

### Required configuration
- enabled state
- location

### Inputs
- briefing config

### Outputs
- forecast object or null
- enabled state
- blocked/unavailable state
- reason code

### Failure behavior
- disabled state must be explicit
- integration failure must surface clearly
- fallback summary must not pretend to be live weather

### Fully usable means
- node can fetch real weather through the intended path
- location/config validation works
- output clearly distinguishes live data from fallback/unavailable states

## 12. System / Project Status Fetch

### Purpose
Collect operational/project status inputs relevant to a workflow run.

### Required configuration
- enabled state
- source toggles such as repo/runtime health where applicable

### Inputs
- briefing config

### Outputs
- normalized status items
- summary
- blocked/unavailable state when live checks are not attached

### Failure behavior
- missing live executor path must surface honestly
- partial-source failures must remain visible rather than disappearing

### Fully usable means
- node can gather real configured status inputs
- result is normalized for downstream consumption
- blocked and partial-failure states are visible in UI and runtime state

## 13. Merge Inputs

### Purpose
Normalize multiple upstream source payloads into one predictable downstream object.

### Required configuration
- merge strategy or mapping definition

### Inputs
- two or more upstream source payloads

### Outputs
- merged normalized object
- blocked-source metadata where relevant

### Failure behavior
- missing required source references are surfaced
- incompatible payload assumptions are surfaced

### Fully usable means
- merged output is predictable and reusable beyond one workflow
- blocked-source metadata remains visible downstream
- config surface is understandable enough for reuse

## 14. Prioritize / Classify

### Purpose
Classify normalized workflow context into urgency/action buckets.

### Required configuration
- rule set or threshold config

### Inputs
- merged normalized payload

### Outputs
- urgent/today/informational/ignore buckets
- bucket counts

### Failure behavior
- invalid rule configuration must block or fail honestly
- unsupported input shape must surface clearly

### Fully usable means
- node performs real classification logic
- downstream nodes can rely on the bucketed output shape
- rules are reusable beyond one hard-coded workflow

## 15. Urgency Branch

### Purpose
Route workflow execution based on classified urgency.

### Required configuration
- route mapping or urgency condition definition

### Inputs
- classified priorities

### Outputs
- urgent boolean
- route string
- route metadata

### Failure behavior
- missing or invalid classification input must be surfaced
- invalid route mapping must not silently pass

### Fully usable means
- routing decision is deterministic and visible
- reusable route configuration exists in the UI

## 16. Send Briefing

### Purpose
Deliver a synthesized briefing to a configured destination.

### Required configuration
- destination type
- destination target

### Inputs
- briefing text
- optional route/urgency metadata

### Outputs
- delivery result metadata
- destination info
- failure reason when not delivered

### Failure behavior
- delivery-not-implemented must remain explicit
- destination/config problems must surface clearly
- failed sends must not be reported as success

### Fully usable means
- a real destination can receive the briefing
- delivery result is visible in workflow run state
- retry/failure behavior is honest and understandable

## 17. Persist Run Record

### Purpose
Store workflow run history for later inspection.

### Required configuration
- persistence target or store policy

### Inputs
- run summary
- delivery result
- final workflow context

### Outputs
- stored boolean
- run record metadata

### Failure behavior
- non-persistent/in-memory fallback must be clearly marked
- write failures must surface clearly

### Fully usable means
- run history is actually persisted through the intended path
- stored records are later observable in the app

## Contract design notes
- Workflow-specific behavior should be carried by configuration, prompt templates, and field mapping, not bespoke node types.
- Socrates should help author node configuration and output expectations.
- Daedalus or the runtime lane should execute the configured node behavior.
- New node behavior that Socrates depends on must be reflected in Socrates-facing docs during the same work block or before handoff.
- Future nodes can extend this document once the v1 surface is stable.
