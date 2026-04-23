# Node Catalog

Concise reference for Socrates and Pericles when authoring workflows.

## Status meanings
- `real`: produces live output through a real runtime/integration path
- `operator-fed`: uses real operator-supplied data/config, even if not fully automated
- `scaffold`: shape exists but runtime behavior is fallback/placeholder/non-production

## Core nodes

| toolId | type | status | purpose |
|---|---|---:|---|
| `trigger.schedule` | trigger | scaffold | Start a workflow on a real schedule surface |
| `ai.prompt` | tool | scaffold | General text prompt node |
| `ai.prompt.edit` | tool | scaffold | Editing/rewrite prompt node |
| `ai.structured_prompt` | tool | real | Structured prompt returning typed output |
| `integrations.google_drive.save_file` | output | real | Save file to Google Drive via bridge |
| `outputs.download_file` | output | real | Produce downloadable artifact in app |
| `outputs.send_message` | output | scaffold | Delivery/output node for messaging |
| `outputs.return_result` | output | scaffold | Final in-app result summary |

## Affiliate nodes

| toolId | type | status | purpose |
|---|---|---:|---|
| `logic.select_theme` | transform | scaffold | Choose roundup theme |
| `sources.product_candidates` | input | operator-fed / partial real | Load product candidates from paste/JSON or research path |
| `data.normalize_records` | transform | scaffold | Normalize product fields |
| `data.dedupe_records` | transform | scaffold | Dedupe/cluster product records |
| `approval.review_candidates` | approval | scaffold | Human approval gate before scoring |
| `logic.filter_approved_candidates` | transform | scaffold | Keep approved candidates only |
| `logic.score_products` | transform | scaffold | Score product candidates |
| `logic.select_roundup_set` | transform | scaffold | Choose final roundup set |
| `ai.generate_content_pack` | tool | scaffold | Generate roundup copy/content pack |
| `ai.generate_creative_briefs` | tool | scaffold | Generate creative directions |
| `data.assemble_content_pack` | transform | scaffold | Assemble content-pack artifact |
| `approval.review_content_pack` | approval | scaffold | Human review of content pack |
| `logic.approval_branch` | branch | scaffold | Route approval outcomes |
| `outputs.create_publish_job` | output | scaffold | Build publish/export job |
| `inputs.load_content_pack` | input | scaffold | Load stored content pack |
| `inputs.load_published_packs` | input | scaffold | Load published content packs |
| `inputs.fetch_channel_metrics` | input | scaffold | Load/fetch channel metrics |
| `logic.review_performance` | transform | scaffold | Review performance patterns |
| `ai.recommend_next_themes` | tool | scaffold | Recommend future themes |

## Mission/system nodes

| toolId | type | status | purpose |
|---|---|---:|---|
| `config.load_briefing` | tool | scaffold | Load workflow briefing config |
| `sources.calendar_fetch` | input | scaffold | Calendar source node |
| `sources.weather_fetch` | input | scaffold | Weather source node |
| `sources.system_status` | input | scaffold | System/project status source node |
| `data.merge_inputs` | transform | scaffold | Merge source payloads |
| `logic.prioritize` | branch | scaffold | Prioritize/classify payload |
| `logic.urgency_branch` | branch | scaffold | Route urgent vs normal |
| `storage.persist_run_record` | output | scaffold | Persist run metadata |
| `ai.brief_synthesis` | tool | scaffold | Produce briefing text |

## Authoring guidance
- Prefer existing nodes before requesting new ones.
- For money-path workflows, do not treat `scaffold` nodes as sufficient just because the JSON shape exists.
- If a required primitive is missing, request the node explicitly instead of hiding the gap in prompt text.
