# Socrates Workflow Authoring Strategy

## Role
Socrates/OpenClaw should be the primary workflow authoring layer.
The app is the view and control surface, not the primary manual builder.

## Authoring contract
Socrates should:
- generate valid workflow JSON
- edit existing workflows with minimal diffs
- preserve stable ids when possible
- only use documented node types
- only reference declared/registered tools
- prefer simple workflows first
- separate deterministic steps from agentic ones
- make side-effecting steps explicit
- ask clarifying questions when user intent is underspecified

## Preferred authoring flow
1. user describes desired app/workflow in natural language
2. Socrates drafts canonical workflow JSON
3. app displays workflow and validation state
4. user continues editing in chat
5. Socrates patches workflow JSON
6. runtime executes selected version

## Improvement path
Later, Socrates should learn from:
- saved successful workflows
- reusable workflow fragments
- app-specific templates
- prior edit histories

Use retrieval over workflow corpus before pursuing opaque self-improvement.

## Core documentation Socrates needs
- workflow schema spec
- node type catalog
- tool registry spec
- runtime semantics
- app binding rules
- example workflows
