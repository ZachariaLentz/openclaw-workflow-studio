# Workflow Schema v1

## Purpose
Canonical machine-readable representation for chat-authored workflows.

## Format choice
JSON is the canonical workflow language for v1 because it is:
- deterministic
- easy to validate
- easy to store and transport
- friendly to app rendering
- suitable for future natural-language generation/editing by Socrates/OpenClaw

Natural language is the preferred authoring interface. JSON is the canonical storage/runtime format.

## Top-level fields
- `id`: stable workflow id
- `name`: human-readable title
- `appId`: app/view binding id
- `version`: workflow version string
- `description`: concise summary
- `tags`: search/filter tags
- `tools`: declared tool references used by nodes
- `nodes`: node definitions
- `edges`: directed graph connections
- `entryNodeId`: optional explicit start node
- `outputs`: declared business outputs
- `metadata`: app-specific or authoring metadata

## Node fields
- `id`: stable node id
- `type`: one of trigger|input|transform|tool|agent|branch|approval|output
- `label`: display label
- `description`: optional purpose text
- `toolId`: required for tool nodes
- `prompt`: optional for agent nodes
- `config`: flexible typed config object
- `position`: UI rendering hint

## Edge fields
- `id`: stable edge id
- `from`: source node id
- `to`: target node id
- `label`: optional display label
- `condition`: optional branch label such as `true` or `false`

## Tool reference fields
- `id`
- `title`
- `kind`
- `description`
- `inputSchema`
- `outputSchema`
- `sideEffectLevel`

Supported v1 `kind` values:
- `openclaw`
- `local-cli`
- `api`
- `composite`
- `simulated`
- `system`
- `logic`
- `storage`
- `ui`
- `source`
- `data`
- `delivery`
- `approval`
- `integration`

## Validation rules
- referenced nodes must exist
- entry node must exist if provided
- node ids should be unique
- edge ids should be unique
- branch conditions are optional in v1 and loosely interpreted

## Notes
- v1 keeps `config` flexible so the system can move fast
- later versions should tighten node-type-specific schemas
- future work can add reusable subflows, artifacts, retries, approvals, and app entity bindings
