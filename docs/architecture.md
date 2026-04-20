# Architecture

## Core principle
- Canonical truth is workflow JSON.
- Chat is the primary authoring interface.
- The web app is the operational cockpit.

## MVP architecture
- Frontend: React/Vite single-page app
- Data source: local JSON workflow definitions
- Validation: Zod schema in app runtime
- Execution: local in-browser runtime simulator
- Example domain: Content OS

## Canonical objects
- Workflow definition
- Node definition
- Edge definition
- Tool reference
- Run record
- Node execution record
- Artifact reference

## Node classes in MVP
- trigger
- input
- transform
- tool
- agent
- branch
- approval
- output

## Tool classes in MVP
- openclaw-native (documented only in MVP)
- local-cli (documented only in MVP)
- simulated/composite tools used by runtime demo

## Runtime model for MVP
- topological execution over directed graph
- run starts from trigger nodes or explicit manual start
- nodes execute when dependencies complete
- branch nodes decide next path using simple conditions
- outputs are written into in-memory run state
- logs captured per node

## Post-MVP extension points
- real OpenClaw tool adapter
- persistent workflow storage
- natural-language workflow editing
- app-specific entity views built atop workflows
