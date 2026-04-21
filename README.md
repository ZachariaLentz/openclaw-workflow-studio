# OpenClaw Workflow Studio

Workflow Studio for designing, connecting, and running OpenClaw workflows.

## Public target
- App target: `https://studio.zacharialentz.com`
- Secure bridge target: `https://bridge.zacharialentz.com`

## Product thesis
- Chat authors workflows.
- JSON is the canonical storage/runtime format.
- The app is a cockpit for viewing, editing, validating, and running workflows.
- Flagship use case: reusable connected-node workflows with account-backed integrations and OpenClaw runtime support.

## MVP capabilities
- sample workflow library
- canonical workflow JSON editor
- node inspector/editor
- validation against a v1 schema
- lightweight local/runtime-connected execution flow
- run state/event log
- Accounts system for connected integrations
- bridge URL targeting for remote OpenClaw runtime access
- docs for architecture, schema, runtime, accounts, and OAuth strategy

## Local development
```bash
npm install
npm run dev
npm test
npm run build
npm run bridge
```

## Deploy target
This repo is now intended to deploy as its own app at:
- `studio.zacharialentz.com`

The main site index lives separately in `zacharialentz-home`.

## Key files
- `src/data/workflows.js` — sample workflows
- `src/lib/schema.js` — v1 workflow schema + validation
- `src/lib/runtime.js` — runtime execution model
- `src/lib/bridge.js` — bridge API client
- `src/lib/bridgeConfig.js` — saved bridge target configuration
- `src/lib/accounts.js` — account/provider compatibility rules
- `bridge-server.mjs` — local/remote bridge server
- `docs/accounts-system-implementation-plan.md` — accounts plan
- `docs/google-oauth-standard-flow.md` — Google OAuth plan

## Current architecture
- public app at `studio.zacharialentz.com`
- secure Mac bridge at `bridge.zacharialentz.com`
- Google OAuth callback handled by the bridge
- OpenClaw-backed nodes and Socrates use the reachable bridge instead of localhost-only assumptions
