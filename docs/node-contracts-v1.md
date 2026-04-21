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

## Contract design notes
- Workflow-specific behavior should be carried by configuration, prompt templates, and field mapping, not bespoke node types.
- Socrates should help author node configuration and output expectations.
- Daedalus or the runtime lane should execute the configured node behavior.
- Future nodes can extend this document once the v1 surface is stable.