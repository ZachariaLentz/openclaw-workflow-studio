# Google OAuth Standard Flow for Workflow Studio

## Goal
Implement the normal product-grade Google sign-in flow for Workflow Studio:

1. user clicks **Connect Google**
2. browser opens Google sign-in
3. user signs in and approves Drive access
4. local bridge receives OAuth callback
5. Workflow Studio stores the connected Google account
6. Google-backed nodes can select that account

## Product rule
This is an integration-account flow, not app login.

The user is not signing into Workflow Studio with Google.
They are connecting a Google integration account for Google-backed nodes.

## Standard architecture

### Front end
Responsibilities:
- start connection flow
- show connecting state
- open returned auth URL in a new window/tab
- poll connection status or refresh accounts after callback completion
- show success/failure result

### Local bridge
Responsibilities:
- expose Google OAuth start endpoint
- generate OAuth state
- know configured redirect URI
- receive callback from Google
- exchange code for tokens
- store tokens locally
- create/update Workflow Studio Google account record
- expose connected account in `/api/accounts`

## Required Google setup
The bridge needs a Google OAuth client with:
- client ID
- client secret
- redirect URI

For local-first development, a standard local redirect URI is appropriate, for example:
- `http://127.0.0.1:4318/oauth/google/callback`

Scopes for v1:
- Drive access only

Recommended initial scope:
- `https://www.googleapis.com/auth/drive.file`

This is better than asking for full Drive scope unless broader access is explicitly needed.

## Recommended bridge endpoints

### Start auth
- `POST /api/accounts/google/connect`

Response:
```json
{
  "ok": true,
  "status": "pending",
  "connectionId": "conn_google_123",
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### Poll auth status
- `GET /api/accounts/google/connect/:connectionId`

Response states:
- pending
- connected
- failed

Example:
```json
{
  "ok": true,
  "connectionId": "conn_google_123",
  "status": "connected",
  "accountId": "acct_google_zacharia_personal"
}
```

### OAuth callback
- `GET /oauth/google/callback`

Bridge responsibilities there:
- validate state
- exchange auth code for tokens
- fetch Google account identity
- persist token/account record
- mark connection as connected or failed
- render a tiny success/failure HTML page for the popup/tab

## Suggested local bridge storage
Use local-only bridge-owned files outside tracked product state when possible.

Suggested local folder:
- `repos/openclaw-workflow-studio/.local/oauth/`

Possible files:
- `google-client.json` for local OAuth client config (gitignored)
- `google-tokens.json` for token/account storage (gitignored)
- transient in-memory connection state for active OAuth handshakes

## Front-end UX flow

### Accounts page
When user clicks **Connect Google**:
1. call `POST /api/accounts/google/connect`
2. receive `authUrl` + `connectionId`
3. open `authUrl` in a popup or new tab
4. show `Connecting Google…`
5. poll `GET /api/accounts/google/connect/:connectionId`
6. on success:
   - refresh accounts
   - show connected account
7. on failure:
   - show error state

### Node inspector shortcut
If Google Drive node has no account:
- **Connect Google account** should trigger the same Accounts flow
- after success, the dropdown should refresh and allow selection

## Minimal v1 callback page behavior
Success page should say something like:
- Google account connected.
- You can close this window.

Failure page should say:
- Google account connection failed.
- Return to Workflow Studio and try again.

## Implementation notes
For standard OAuth, the bridge will likely need:
- crypto-safe state generation
- token exchange over HTTPS to Google
- token persistence
- Google userinfo or token-introspection call to discover email/profile

## Immediate implementation target
For the first standard OAuth slice, build:
1. provider-specific Google connect endpoint
2. pending connection registry in bridge memory
3. callback endpoint
4. front-end popup + polling flow
5. account refresh after success

## Honest status rule
Do not mark Google as connected until:
- callback completed
- tokens stored
- account identity resolved
- account appears in `/api/accounts`
