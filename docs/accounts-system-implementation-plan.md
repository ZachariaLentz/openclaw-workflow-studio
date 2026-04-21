# Accounts System Implementation Plan

## Purpose
Add a first-class Accounts system to Workflow Studio so integrations are connected centrally and reusable nodes can reference compatible connected accounts without storing secrets in workflow definitions.

This is the implementation plan for the first durable account-connection model.

## Product decision
Workflow Studio should manage integration accounts centrally.

Nodes should:
- reference connected accounts
- filter to compatible accounts
- surface missing-account states clearly
- offer a shortcut to connect the required provider

Nodes should not:
- own raw auth flows independently
- store secrets or tokens in workflow JSON
- duplicate provider connection logic per node

## Product principles
- Local-first for Zacharia’s own OpenClaw instance
- One canonical Accounts surface for integrations
- Workflow JSON stores account references only
- Secrets/tokens live only in the local bridge/backend layer
- Provider auth should be reusable across multiple nodes
- Missing account state should be understandable from inside the node inspector
- Keep v1 simple: no team/org credential model yet

## v1 product surface
Add a top-level app area for:
- Accounts

Keep the first navigation simple:
- Workflows
- Accounts
- later: Runs
- later: Settings

## v1 user experience

### Accounts page
The Accounts page should list providers and connected accounts.

Provider cards/rows for v1:
- Google
- OpenAI
- OpenClaw Local
- additional providers later

Each provider section should show:
- provider name
- short description
- connection status
- connected account list
- available capabilities/scopes
- actions:
  - Connect
  - Reconnect
  - Test
  - Disconnect

### Node inspector behavior
For any node that requires an integration account, show:
- Account selector
- only compatible accounts in the dropdown
- Connect account button when no compatible account exists
- clear missing-account message when required

Examples:

#### Google Drive Save File node
- Account: select connected Google account with Drive capability
- Button: Connect Google account
- Message when missing: This node needs a Google account with Drive access.

#### Future OpenAI / ChatGPT node
- Account: select connected OpenAI account
- Button: Connect OpenAI account
- Message when missing: This node needs an OpenAI account.

## Architecture rule
The front end manages:
- provider list
- account summaries
- connection status
- account selection per node
- account compatibility filtering

The local bridge manages:
- OAuth and API-key flows
- token/key storage
- refresh and revalidation
- provider capability discovery
- actual provider API calls

The workflow definition manages:
- only account references such as `accountId`

## Canonical data model

### Integration account record
Suggested shape:

```json
{
  "id": "acct_google_zacharia_personal",
  "provider": "google",
  "label": "Zacharia Personal Google",
  "status": "connected",
  "identity": {
    "email": "zach@example.com",
    "displayName": "Zacharia Lentz"
  },
  "capabilities": ["drive"],
  "scopes": ["drive.file"],
  "lastVerifiedAt": "2026-04-20T20:00:00Z",
  "createdAt": "2026-04-20T19:50:00Z",
  "updatedAt": "2026-04-20T20:00:00Z",
  "metadata": {
    "authType": "oauth"
  }
}
```

### Provider definition record
Suggested shape:

```json
{
  "id": "google",
  "label": "Google",
  "description": "Connect Google services like Drive.",
  "authType": "oauth",
  "capabilities": ["drive"],
  "status": "available"
}
```

### Node config rule
Node config should store only:

```json
{
  "accountId": "acct_google_zacharia_personal"
}
```

Never store:
- API keys
- OAuth client secrets
- access tokens
- refresh tokens

## Storage model
For v1, store account metadata in local bridge state on disk.

Suggested file path:
- `repos/openclaw-workflow-studio/.local/accounts.json` for local development state
- or a bridge-owned storage file outside the front-end bundle if preferred

Secrets/tokens should not be written into repo-tracked files.
They should live in a local-only bridge-owned secret store.

For v1 local-first implementation, acceptable storage options are:
- existing provider CLIs that already manage auth securely enough for local use
- bridge-managed local key/token storage outside git

## Provider auth model by type

### OAuth providers
Examples:
- Google
- Notion (if OAuth later)
- Slack (if OAuth later)

Flow:
1. user clicks Connect on Accounts page
2. bridge starts provider auth flow
3. browser auth completes locally
4. bridge stores/records connected account
5. app refreshes accounts list

### API key providers
Examples:
- OpenAI
- Anthropic

Flow:
1. user clicks Connect on Accounts page
2. app opens secure local form
3. bridge stores key locally
4. bridge validates connection
5. app refreshes accounts list

## v1 bridge contract
Add a narrow accounts API to the local bridge.

### Read endpoints
- `GET /api/accounts/providers`
- `GET /api/accounts`
- `GET /api/accounts/:id`

### Write/action endpoints
- `POST /api/accounts/connect`
- `POST /api/accounts/:id/test`
- `POST /api/accounts/:id/disconnect`
- `POST /api/accounts/:id/reconnect`

### Optional provider-specific action endpoints
For OAuth-based connect flows, a provider-specific path may be cleaner:
- `POST /api/accounts/google/connect`
- later `POST /api/accounts/openai/connect`

### Response requirements
Every account response should include:
- id
- provider
- label
- status
- identity summary
- capabilities
- scopes if known
- lastVerifiedAt if known
- actionable error state if broken

## Recommended v1 provider support order
1. OpenClaw Local account status surface
2. Google account connection for Drive
3. OpenAI account connection shape
4. additional providers later

This order fits the immediate workflow need while creating the general system.

## Recommended Google v1 implementation
For Google, use the bridge as the canonical account surface and let the bridge wrap the actual CLI/provider implementation.

Given current local tooling, the first practical implementation can use `gog` behind the bridge.

Bridge responsibilities for Google v1:
- detect whether Google auth exists
- enumerate available authenticated Google account(s)
- label them clearly
- expose Drive capability
- perform Drive writes using the selected account
- surface auth-required or expired-auth errors honestly

### Important Google v1 note
If the bridge is using `gog`, the bridge should still present Google as a Workflow Studio account concept.
The user should experience:
- Google account connected in Workflow Studio
not:
- weird hidden CLI state they must mentally manage

## Front-end implementation plan

### Phase 1: account foundations
Add:
- account types in front-end state model
- provider catalog model
- bridge client helpers for accounts endpoints
- app-level navigation state for Workflows vs Accounts

### Phase 2: Accounts page
Build:
- Accounts page shell
- provider cards
- connected account list
- Connect/Test/Disconnect actions
- empty state for no connected accounts

### Phase 3: node inspector integration
For nodes that require accounts:
- add `accountId` field to node config UI
- add provider-aware dropdown
- add missing-account callout
- add Connect account shortcut

### Phase 4: Google Drive node wiring
Update Google Drive Save File node to:
- require `accountId`
- block execution when missing
- pass `accountId` to bridge save endpoint
- show account-specific failure states

### Phase 5: account-aware workflow validation
Validation should flag integration nodes that require an account but have no `accountId` configured.

This should be a workflow validation error or at minimum a node readiness warning.

## Bridge implementation plan

### Phase 1: provider registry
Create bridge-side provider definitions for:
- google
- openai
- openclaw-local

### Phase 2: account registry
Create bridge-side account summary list built from local auth state.

### Phase 3: Google support
Implement:
- detect authenticated `gog` accounts
- expose them as Workflow Studio Google accounts
- test Drive capability
- use selected account in `google-drive/save-file`

### Phase 4: generic account actions
Implement:
- connect
- test
- disconnect/reconnect semantics

## Suggested UI details

### Accounts page copy
Title:
- Accounts

Subtitle:
- Connect the services your workflows use.

### Provider card copy example
Google
- Connect Google services like Drive.

Status states:
- No account connected
- Connected
- Needs attention
- Auth expired

### Node inspector copy example
Field:
- Account

Placeholder:
- Select a connected Google account

Missing state:
- This node needs a Google account with Drive access.

Action:
- Connect Google account

## Validation and execution rules

### Validation
A node that requires an account is not ready when:
- required `accountId` is missing
- referenced account does not exist
- referenced account is incompatible with the node provider/capability

### Runtime
A node should fail honestly when:
- account auth expired
- account capability is missing
- provider write fails

Do not silently substitute a different account.

## Compatibility model
Nodes should declare what they need.

Suggested node capability requirements:
- Google Drive Save File -> provider `google`, capability `drive`
- future OpenAI text node -> provider `openai`, capability `responses` or `chat`
- future Notion node -> provider `notion`, capability `pages`

The account selector should only show matching accounts.

## Recommended minimal schema additions

### Node config
For integration nodes and future provider-backed AI nodes:
- `accountId`

### Tool or node metadata
Add capability requirements in node/tool metadata, for example:

```json
{
  "provider": "google",
  "requiredCapabilities": ["drive"]
}
```

This can live either:
- in tool definitions
- or in node config metadata

Tool-definition metadata is cleaner for reuse.

## Execution order
1. add accounts product doc and lock the pattern
2. add front-end account/provider models
3. add bridge accounts endpoints
4. add Accounts page
5. wire Google Drive node to account selection and validation
6. connect real Google auth/account detection through bridge
7. verify real Drive save with selected account
8. use same pattern for future integrations

## Immediate next build step
The next concrete implementation step should be:
1. create the bridge-side accounts provider/account summary endpoints
2. add a minimal Accounts page in the app
3. wire the Google Drive Save File node inspector to use account selection from that account list

That gives the product the right durable integration shape before adding more provider-specific auth flows.
