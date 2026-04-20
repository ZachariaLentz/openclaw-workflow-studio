# Runtime Semantics v1

## Goal
Provide a simple, inspectable execution model for MVP workflows.

## Current MVP runtime
- local in-browser simulation
- directed graph execution
- node executes when all inbound dependencies are completed
- outputs are passed forward through in-memory run state
- run events are captured for UI display

## Node execution behavior
- `trigger`: starts run
- `input`: loads seed input/config into run state
- `transform`: reshapes prior output
- `tool`: simulates calling a registered tool and returns mock result
- `agent`: simulates an LLM/agent step with prompt + mock output
- `branch`: chooses boolean path
- `approval`: auto-approves in MVP runtime
- `output`: writes final result into run state

## Run lifecycle
1. validate workflow
2. initialize node states to pending
3. select runnable nodes
4. execute runnable nodes
5. write outputs and events
6. continue until complete or deadlock

## Not yet implemented
- real OpenClaw tool execution
- pause/resume approval flow
- retries/timeouts policies
- partial reruns
- persistent run storage
- artifact storage
- parallel execution scheduler

## Proper post-MVP runtime shape
- orchestrator service
- adapter layer for OpenClaw tools, local CLI tools, remote APIs
- run record store
- node execution log store
- artifact storage abstraction
- approval/resume mechanism
- app/event hooks for custom views
