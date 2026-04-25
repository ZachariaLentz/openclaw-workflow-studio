# Node Definition Contract

## Purpose
Define the canonical reusable-node contract for Workflow Studio and the Node Organizer.

This contract is for reusable node definitions.
It is distinct from workflow node instances that are placed on a canvas.

## Distinction
### Node definition
A reusable primitive such as `logic.score_products`.

### Workflow node instance
A placed usage of a node definition inside a workflow.
A workflow node instance may override label, config, prompt, and position, but it should still conform to the reusable node definition.

## Canonical node definition domains
Every node definition should include these domains.

### 1. Identity
- `toolId`: stable canonical id
- `title`: human-readable name
- `description`: concise purpose
- `nodeType`: trigger|input|transform|tool|agent|branch|approval|output
- `toolKind`: openclaw|local-cli|api|composite|simulated|system|logic|storage|ui|source|data|delivery|approval|integration
- `version`: semantic or contract version string

### 2. Organizer state
- `maturity`: draft|scaffold|fallback-only|real|deprecated
- `organizer.ready`: boolean
- `organizer.visibility`: hidden|internal|live
- `organizer.reason`: explanation for current organizer state
- `authoring.allowed`: boolean
- `authoring.reason`: explanation for whether Socrates may place it

### 3. Defaults and editor metadata
- `defaultLabel`
- `defaultDescription` optional
- `defaultConfig`
- `editorFields`

### 4. Input contract
- `inputSchema`
- `inputMode`: single|collection|none|mixed
- `requiredInputs`
- `optionalInputs`
- `consumesUpstream`: boolean

### 5. Output contract
- `outputSchema`
- `producesArtifacts`: boolean optional
- `statusEnvelope`: required runtime status shape

### 6. Config contract
- `configSchema`
- `configQuestions`: required clarification questions for node creation
- `configDefaultsPolicy`: default assumptions allowed when the user does not specify advanced behavior

### 7. Runtime contract
- `sideEffectLevel`: read|write|external
- `executor`
- `runtimeCapabilities`: optional dependency/capability list
- `supportsLive`: boolean
- `supportsFallback`: boolean
- `supportsBlocked`: boolean
- `failureModes`: array of documented failure/blocked cases

### 8. Testing contract
- `testFixtures`: example input/output fixtures
- `promotionChecks`: required checks before organizer promotion

## Standard runtime return shape
Every executor should return a standardized envelope.

```json
{
  "status": "live | blocked | fallback | simulated | failed",
  "message": "human-readable execution summary",
  "output": {},
  "diagnostics": {},
  "artifacts": []
}
```

## Standard node creation policy
When the user asks to create a node, the system should:
1. determine whether the request is for:
   - a new workflow from existing nodes
   - a new reusable node
   - a new node archetype/type
2. prefer existing organizer-approved nodes before inventing a new node
3. infer safe defaults where appropriate
4. ask only the minimum blocking questions
5. support the clarification loop directly in chat as the primary front door
6. produce a structured node draft when a new node is truly needed
7. validate the node draft
8. attach executor/test requirements
9. require promotion checks before authorable placement

## Socrates authoring hierarchy
Socrates should follow this order:
1. compose a workflow from existing organizer-approved nodes if possible
2. create a new reusable node only when the workflow cannot be represented honestly with the current node catalog
3. create a new node archetype/type only when the requested node does not fit an existing archetype without distortion

This keeps reusable-node growth deliberate and prevents workflow-specific node sprawl.

## Node archetypes
Initial archetypes:
- trigger
- source/fetch
- transform
- scoring/ranking
- approval
- branch
- output/delivery
- ai generation
- validation
- aggregation

## Clarification policy
For each archetype, classify missing information as:
- required
- defaultable
- advanced
- inferable

### Rule
Socrates should ask only required questions unless the user explicitly requests more control.

## Example: scoring/ranking node
Example request:
- "make a node that scores product candidates by weighted ranking"

### Likely required questions
- which fields should be scored?
- what weight should each field get?
- for each field, is higher or lower better?

### Usually defaultable
- normalization strategy
- tie handling
- missing-data behavior
- output shape
- determinism
- explainability verbosity

### Default policy recommendation
- min-max normalization
- deterministic stable ranking
- return full pass-through ranked items with `score`, `rank`, and `scoreBreakdown`
- validation error when required fields are entirely missing

## Authorable-node requirements
A node should be authorable by Socrates only when:
- it has a canonical `toolId`
- it has a valid config schema
- it has editor fields
- it has defined input/output contracts
- it has an executor bound
- it has promotion checks defined
- it is not in `draft` or `scaffold` status
- organizer visibility is `live`
- `authoring.allowed = true`

## Workflow node instance contract
A workflow node instance should include:
- `id`
- `toolId`
- `type`
- `label`
- `description`
- `prompt` optional
- `config`
- `position`

Longer-term, workflow node instances should also support explicit named input bindings rather than relying only on implicit `lastOutput` flow.

## Promotion gate
Before a node becomes organizer-live and authorable, require at minimum:
1. config schema validation
2. node normalization validation
3. executor happy-path test
4. blocked/failure-path test
5. output contract test
6. organizer metadata present

## Socrates node-creation scoring
To improve node creation over time, score Socrates on:
- correctness of node contract
- reuse of existing nodes before invention
- number of clarification questions asked relative to what was truly required
- speed to usable node draft
- test pass rate
- usability of resulting node in real workflows

Lower score when Socrates:
- invents unnecessary new nodes
- invents new node types when an existing archetype fits
- asks excessive questions
- produces failing or misleading node behavior
- produces nodes that are not actually reusable

## Immediate implementation direction
- add a canonical contract helper layer in code
- represent node archetypes explicitly
- represent clarification policy explicitly
- add scoring for Socrates node-creation outcomes
- use the organizer and Socrates against this contract, not against free-form node objects
