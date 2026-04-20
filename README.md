# OpenClaw Workflow Studio

MVP app for chat-authored OpenClaw workflows.

## Product thesis
- Chat authors workflows.
- JSON is the canonical storage/runtime format.
- The app is a cockpit for viewing, editing, validating, and running workflows.
- Flagship use case: Content OS style idea-to-production pipelines.

## MVP capabilities
- sample workflow library
- canonical workflow JSON editor
- node inspector/editor
- validation against a v1 schema
- lightweight local runtime simulator
- run state/event log
- docs for architecture, schema, runtime, and Socrates authoring strategy

## Local development
```bash
npm install
npm run dev
npm test
npm run build
```

## Key files
- `src/data/workflows.js` — sample workflows
- `src/lib/schema.js` — v1 workflow schema + validation
- `src/lib/runtime.js` — local MVP runtime simulator
- `docs/mvp-plan.md` — MVP scope
- `docs/architecture.md` — architecture summary
- `docs/workflow-schema.md` — canonical schema decisions
- `docs/runtime.md` — execution model
- `docs/socrates-authoring.md` — how chat-driven authoring should work

## Next layers
- real OpenClaw runtime adapter
- natural-language workflow editing endpoint
- persistent workflow/run storage
- app-specific views over shared workflow state
- workflow retrieval and reuse from saved corpus
