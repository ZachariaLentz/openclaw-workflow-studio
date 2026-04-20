# Local Bridge Plan

## Product direction for this phase
OpenClaw Workflow Studio is currently a local-first app for Zacharia's own OpenClaw instance.
It is not yet being treated as generic hosted workflow software.

## Smallest safe bridge
The first bridge should be:
- localhost-only
- read-only
- explicit about what it exposes
- optional for the front end
- safe to leave unavailable in the public GitHub Pages deployment

## First contract
Base URL:
- `http://127.0.0.1:4318`

Endpoints:
- `GET /health`
- `GET /api/status`
- `GET /api/capabilities`

## Why this shape
This gives the website a real connection to Zacharia's local OpenClaw environment without immediately exposing tool execution, session writes, cron writes, or arbitrary shell access.

It creates a narrow bridge for:
- local connection detection
- real local OpenClaw status visibility
- capability-aware UI behavior

## Trust model
Phase 1 trust model:
- bind only to `127.0.0.1`
- do not expose write endpoints yet
- do not proxy arbitrary commands
- do not depend on browser-stored secrets for public-site mode

Future write actions should require a separate explicit auth step and a strict allowlist of supported operations.

## Next step after this phase
After the read-only bridge is stable, add one narrow real data path such as:
- list saved workflows from local disk
- list recent workflow runs
- fetch local tool/session metadata from curated OpenClaw calls

Do not jump straight to arbitrary command passthrough.
