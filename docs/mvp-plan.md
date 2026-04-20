# OpenClaw Workflow Studio MVP

## Product shape
Chat authors workflows. The app visualizes, inspects, edits, validates, and runs them.

## MVP goal
Ship a functional local-first app that can:
- load and render canonical workflow JSON
- show nodes, edges, metadata, tools, and run state
- edit workflow metadata and node JSON in-app
- validate workflow structure against a v1 schema
- simulate/run a workflow through a lightweight local runtime
- present a flagship Content OS workflow example
- provide docs for schema, runtime, tool model, and next layers

## Must haves
1. Canonical workflow JSON format
2. Schema validation
3. Visual graph/list workflow view
4. Node inspector/editor
5. Run button with runtime execution state
6. Sample workflows:
   - Content OS pipeline
   - minimal generic workflow
7. Documentation for:
   - architecture
   - schema
   - runtime semantics
   - tool registry model
   - roadmap

## Can wait
### Layer 2
- natural-language editing via Socrates/OpenClaw
- persistent database storage
- real OpenClaw execution adapter
- approval/resume flow
- workflow version history
- saved run history
- app/template binding model beyond examples

### Layer 3
- multi-user/auth
- remote workers
- tool registry management UI
- retrieval over saved workflows
- auto-improvement from workflow corpus
- production deployment controls

## Recommended immediate build order
1. docs + schema + sample data
2. app shell and graph/inspector UI
3. validation + runtime simulator
4. content-os flagship example
5. polish enough for usable local demo
6. then connect to real OpenClaw runtime in a later pass
