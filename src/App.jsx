import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { validateWorkflow } from './lib/schema'
import { runWorkflow } from './lib/runtime'
import { getInitialWorkflows, loadLocalConnectionState } from './lib/liveWorkflow'
import { editStory, generateStoryIdea, saveFileToGoogleDrive, writeStory } from './lib/openclaw'
import { sendToSocrates } from './lib/socrates'
import { createBlankWorkflow } from './lib/newWorkflow'
import { connectGoogleAccount, connectProvider, getGoogleConnectionStatus, testAccount } from './lib/bridge'
import { getCompatibleAccounts, getToolRequirements } from './lib/accounts'
import { clearBridgeUrl, getDefaultBridgeUrl, getSavedBridgeUrl, saveBridgeUrl } from './lib/bridgeConfig'

const initialWorkflows = getInitialWorkflows()
const NODE_WIDTH = 180
const NODE_HEIGHT = 92
const GRID_X = 220
const GRID_Y = 132
const PADDING_X = 40
const PADDING_Y = 40
const MIN_ZOOM = 0.55
const MAX_ZOOM = 1.75

function getNodePosition(node) {
  return {
    left: PADDING_X + (node.position?.x ?? 0) * GRID_X,
    top: PADDING_Y + (node.position?.y ?? 0) * GRID_Y,
  }
}

function getCanvasSize(workflow) {
  const xs = workflow.nodes.map((node) => node.position?.x ?? 0)
  const ys = workflow.nodes.map((node) => node.position?.y ?? 0)
  const maxX = xs.length ? Math.max(...xs) : 0
  const maxY = ys.length ? Math.max(...ys) : 0

  return {
    width: PADDING_X * 2 + NODE_WIDTH + maxX * GRID_X,
    height: PADDING_Y * 2 + NODE_HEIGHT + maxY * GRID_Y,
  }
}

function getEdgePath(fromNode, toNode) {
  const from = getNodePosition(fromNode)
  const to = getNodePosition(toNode)

  const startX = from.left + NODE_WIDTH
  const startY = from.top + NODE_HEIGHT / 2
  const endX = to.left
  const endY = to.top + NODE_HEIGHT / 2
  const deltaX = Math.max(40, (endX - startX) / 2)

  return `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`
}

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function GraphView({ workflow, selectedNodeId, onSelectNode, zoom, pan, onPanChange, onZoomChange, nodePopover }) {
  const size = getCanvasSize(workflow)
  const nodeMap = new Map(workflow.nodes.map((node) => [node.id, node]))
  const surfaceRef = useRef(null)
  const dragRef = useRef(null)
  const pinchRef = useRef(null)

  function getDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  function beginPan(event) {
    if (event.target.closest('.diagram-node')) return

    const surface = surfaceRef.current
    if (!surface) return

    surface.setPointerCapture?.(event.pointerId)

    if (!dragRef.current) {
      dragRef.current = { pointers: new Map() }
    }

    dragRef.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (dragRef.current.pointers.size === 1) {
      dragRef.current = {
        ...dragRef.current,
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      }
      pinchRef.current = null
      return
    }

    if (dragRef.current.pointers.size === 2) {
      const [first, second] = [...dragRef.current.pointers.values()]
      pinchRef.current = {
        distance: getDistance(first, second),
        zoom,
        panX: pan.x,
        panY: pan.y,
        centerX: (first.x + second.x) / 2,
        centerY: (first.y + second.y) / 2,
      }
    }
  }

  function movePan(event) {
    if (!dragRef.current?.pointers) return
    dragRef.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (dragRef.current.pointers.size === 2 && pinchRef.current) {
      const [first, second] = [...dragRef.current.pointers.values()]
      const distance = getDistance(first, second)
      const centerX = (first.x + second.x) / 2
      const centerY = (first.y + second.y) / 2
      const surface = surfaceRef.current
      if (!surface) return
      const rect = surface.getBoundingClientRect()
      const pointerX = centerX - rect.left
      const pointerY = centerY - rect.top
      const nextZoom = clampZoom(pinchRef.current.zoom * (distance / Math.max(1, pinchRef.current.distance)))
      const worldX = (pointerX - pinchRef.current.panX) / pinchRef.current.zoom
      const worldY = (pointerY - pinchRef.current.panY) / pinchRef.current.zoom
      onZoomChange(nextZoom)
      onPanChange({
        x: pointerX - worldX * nextZoom,
        y: pointerY - worldY * nextZoom,
      })
      return
    }

    if (dragRef.current.pointers.size !== 1 || pinchRef.current) return

    const deltaX = event.clientX - dragRef.current.x
    const deltaY = event.clientY - dragRef.current.y
    onPanChange({
      x: dragRef.current.panX + deltaX,
      y: dragRef.current.panY + deltaY,
    })
  }

  function endPan(event) {
    const surface = surfaceRef.current
    surface?.releasePointerCapture?.(event.pointerId)

    if (!dragRef.current?.pointers) return
    dragRef.current.pointers.delete(event.pointerId)

    if (dragRef.current.pointers.size === 0) {
      dragRef.current = null
      pinchRef.current = null
      return
    }

    if (dragRef.current.pointers.size === 1) {
      const remaining = [...dragRef.current.pointers.values()][0]
      dragRef.current = {
        pointers: dragRef.current.pointers,
        x: remaining.x,
        y: remaining.y,
        panX: pan.x,
        panY: pan.y,
      }
      pinchRef.current = null
    }
  }

  function handleWheel(event) {
    event.preventDefault()
    event.stopPropagation()

    const surface = surfaceRef.current
    if (!surface) return

    const rect = surface.getBoundingClientRect()
    const pointerX = event.clientX - rect.left
    const pointerY = event.clientY - rect.top
    const zoomFactor = event.deltaY < 0 ? 1.08 : 0.92
    const nextZoom = clampZoom(zoom * zoomFactor)
    if (nextZoom === zoom) return

    const worldX = (pointerX - pan.x) / zoom
    const worldY = (pointerY - pan.y) / zoom
    const nextPan = {
      x: pointerX - worldX * nextZoom,
      y: pointerY - worldY * nextZoom,
    }

    onZoomChange(nextZoom)
    onPanChange(nextPan)
  }

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return undefined

    const listener = (event) => {
      event.preventDefault()
      handleWheel(event)
    }

    surface.addEventListener('wheel', listener, { passive: false })
    return () => surface.removeEventListener('wheel', listener)
  }, [zoom, pan, onPanChange, onZoomChange])

  return (
    <div className="graph-stage-wrap">
      <div className="diagram-explainer graph-stage-topline">
        <span className="pill">drag to pan</span>
        <span className="pill">scroll to zoom</span>
        <span className="muted">Click a node to open its details right on the graph.</span>
      </div>
      <div
        ref={surfaceRef}
        className="diagram-surface graph-stage-surface pannable"
        onPointerDown={beginPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerLeave={endPan}
      >
        <div
          className="diagram-world"
          style={{
            width: size.width,
            height: size.height,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <svg className="diagram-svg" width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`}>
            <defs>
              <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                <path d="M 0 0 L 12 6 L 0 12 z" fill="#7ea3ff" />
              </marker>
            </defs>
            {workflow.edges.map((edge) => {
              const fromNode = nodeMap.get(edge.from)
              const toNode = nodeMap.get(edge.to)
              if (!fromNode || !toNode) return null

              return (
                <g key={edge.id}>
                  <path d={getEdgePath(fromNode, toNode)} className="diagram-edge" markerEnd="url(#arrowhead)" />
                  {edge.condition ? (
                    <text
                      x={(getNodePosition(fromNode).left + NODE_WIDTH + getNodePosition(toNode).left) / 2}
                      y={(getNodePosition(fromNode).top + getNodePosition(toNode).top) / 2 + 8}
                      className="diagram-edge-label"
                    >
                      {edge.condition}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </svg>

          {workflow.nodes.map((node) => {
            const position = getNodePosition(node)
            const isSelected = selectedNodeId === node.id
            return (
              <button
                key={node.id}
                className={`diagram-node ${isSelected ? 'selected' : ''} ${node.type}`}
                style={{ left: position.left, top: position.top, width: NODE_WIDTH, height: NODE_HEIGHT }}
                onClick={(event) => {
                  event.stopPropagation()
                  onSelectNode(node.id)
                }}
              >
                <div className="node-type">{node.type}</div>
                <div className="node-label">{node.label}</div>
                <div className="node-id">{node.id}</div>
              </button>
            )
          })}

          {nodePopover ? (
            <div
              className="node-popover"
              style={{
                left: nodePopover.left,
                top: nodePopover.top,
                width: nodePopover.width,
              }}
            >
              {nodePopover.content}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ToolList({ workflow }) {
  return (
    <div className="panel-section">
      <div className="section-title">Tools</div>
      <div className="tool-list">
        {workflow.tools.length === 0 ? <div className="muted">No tools declared.</div> : null}
        {workflow.tools.map((tool) => (
          <div key={tool.id} className="tool-item">
            <div>
              <strong>{tool.title}</strong>
              <div className="muted">{tool.id}</div>
            </div>
            <span className="pill">{tool.kind}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ValidationPanel({ validation }) {
  return (
    <div className="panel-section">
      <div className="section-title">Status</div>
      {validation.ok ? <div className="success">Workflow looks ready.</div> : null}
      {!validation.ok ? (
        <div className="error-list">
          {validation.errors.map((error, index) => (
            <div key={`${error.path}-${index}`} className="error-item">
              <strong>{error.path || 'flow'}</strong>
              <span>{error.message}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ConnectionPanel({ connection, refreshing, onRefresh, bridgeUrlDraft, onBridgeUrlChange, onSaveBridgeUrl, onResetBridgeUrl }) {
  const status = connection.connected ? 'Connected to bridge' : 'Bridge unavailable'
  const detail = connection.connected
    ? 'Workflow Studio can reach your Mac bridge.'
    : connection.error || 'Using built-in sample data.'

  return (
    <div className="panel-section compact-panel-section">
      <div className="section-title row-between">
        <span>Bridge</span>
        <button className="secondary-button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className={connection.connected ? 'success' : 'muted'}>{status}</div>
      <div className="muted connection-copy">{detail}</div>
      <div className="hero-pills connection-pills">
        <span className="pill">{connection.bridgeUrl || 'bridge unknown'}</span>
        {connection.connected ? <span className="pill">live bridge</span> : <span className="pill">sample mode</span>}
      </div>
      <details className="inline-reveal bridge-reveal">
        <summary>Bridge target</summary>
        <div className="node-form-card bridge-config-card">
          <label className="field-label">
            Workflow Studio bridge target
            <input className="text-input" value={bridgeUrlDraft} onChange={(event) => onBridgeUrlChange(event.target.value)} />
          </label>
          <div className="provider-actions">
            <button className="primary-button" onClick={onSaveBridgeUrl}>Save bridge URL</button>
            <button className="secondary-button" onClick={onResetBridgeUrl}>Reset to default</button>
          </div>
          <div className="muted small-copy">Use this when the bridge runs on your OpenClaw machine somewhere other than this device’s localhost.</div>
        </div>
      </details>
    </div>
  )
}

function SocratesPanel({ connection, workflowText, messages, draftMessage, onDraftChange, onSend, sending, open, onClose }) {
  return (
    <div className={`chat-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="chat-drawer-backdrop" onClick={onClose} />
      <div className="chat-drawer-panel panel socrates-panel">
        <div className="section-title row-between">
          <div className="chat-drawer-title-wrap">
            <span>Socrates</span>
            <span className="pill">authoring chat</span>
          </div>
          <button className="secondary-button" onClick={onClose}>Close</button>
        </div>
        <div className="muted">Shape or revise the workflow in-app while keeping the authoring lane separate from runtime execution.</div>
        <div className="chat-log">
          {messages.length === 0 ? <div className="muted">Ask Socrates to help create or improve this workflow.</div> : null}
          {messages.map((item, index) => (
            <div key={`${item.role}-${index}`} className={`chat-bubble ${item.role}`}>
              <strong>{item.role === 'user' ? 'You' : 'Socrates'}</strong>
              <div>{item.text}</div>
            </div>
          ))}
        </div>
        <textarea
          className="chat-input"
          value={draftMessage}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Ask Socrates to create a workflow, adjust steps, or explain the next change."
          spellCheck="false"
        />
        <div className="row-between">
          <span className="muted small-copy">{connection.connected ? 'Uses reachable Mac bridge' : 'Bridge required for live Socrates chat'}</span>
          <button className="primary-button" disabled={sending || !connection.connected || !draftMessage.trim()} onClick={() => onSend(workflowText)}>
            {sending ? 'Sending…' : 'Send to Socrates'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AccountsPanel({ providers, accounts, onRefresh, onConnect, onTest, refreshing, oauthStatus, accountsMessage }) {
  return (
    <div className="accounts-page">
      <div className="panel">
        <div className="section-title">Accounts</div>
        <div className="muted">Connect the services your workflows use.</div>
        {accountsMessage ? <div className="account-banner">{accountsMessage}</div> : null}
      </div>

      <div className="accounts-grid">
        {providers.map((provider) => {
          const providerAccounts = accounts.filter((account) => account.provider === provider.id)
          return (
            <div key={provider.id} className="panel provider-card">
              <div className="row-between">
                <div>
                  <div className="section-title provider-title">{provider.label}</div>
                  <div className="muted">{provider.description}</div>
                </div>
                <span className="pill">{provider.status}</span>
              </div>

              <div className="provider-actions">
                <button className="primary-button" onClick={() => onConnect(provider.id)}>
                  {provider.id === 'google' && oauthStatus?.provider === 'google' && oauthStatus?.status === 'pending' ? 'Connecting…' : 'Connect'}
                </button>
                <button className="secondary-button" onClick={onRefresh} disabled={refreshing}>Refresh</button>
              </div>
              {provider.id === 'google' && oauthStatus ? (
                <div className="muted small-copy oauth-status-copy">
                  {oauthStatus.status === 'pending' ? 'Waiting for Google sign-in to finish…' : null}
                  {oauthStatus.status === 'connected' ? 'Google account connected. Refreshing account list…' : null}
                  {oauthStatus.status === 'failed' ? `Google sign-in failed: ${oauthStatus.error || 'Unknown error'}` : null}
                  {oauthStatus.status === 'popup_blocked' ? 'Popup was blocked. Use the open link to continue Google sign-in.' : null}
                </div>
              ) : null}
              {provider.id === 'google' && oauthStatus?.authUrl && (oauthStatus.status === 'pending' || oauthStatus.status === 'popup_blocked') ? (
                <a className="secondary-button inline-button" href={oauthStatus.authUrl} target="_blank" rel="noreferrer">
                  Open Google sign-in
                </a>
              ) : null}

              {providerAccounts.length === 0 ? <div className="muted empty-state">No account connected.</div> : null}
              <div className="account-list">
                {providerAccounts.map((account) => (
                  <div key={account.id} className="account-item">
                    <div>
                      <strong>{account.label}</strong>
                      <div className="muted small-copy">{account.identity?.email || account.identity?.displayName || 'Local account'}</div>
                      <div className="muted small-copy">Capabilities: {(account.capabilities || []).join(', ') || 'none'}</div>
                    </div>
                    <div className="account-actions">
                      <span className="pill">{account.status}</span>
                      <button className="secondary-button" onClick={() => onTest(account.id)}>Test</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SchemaBlock({ title, value, defaultOpen = false }) {
  if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) return null

  return (
    <details className="schema-block" open={defaultOpen}>
      <summary>{title}</summary>
      <pre>{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre>
    </details>
  )
}

function NodeDetailPanel({ node, tool, workflow, runState, onRunTrigger, onPatchNode, accounts, onConnectProvider, onClose }) {
  if (!node) return null

  const incomingEdges = workflow.edges.filter((edge) => edge.to === node.id)
  const outgoingEdges = workflow.edges.filter((edge) => edge.from === node.id)
  const incoming = incomingEdges.map((edge) => edge.from)
  const outgoing = outgoingEdges.map((edge) => edge.to)
  const latestOutput = runState?.nodeOutputs?.[node.id]
  const latestStatus = runState?.nodeStatus?.[node.id] || 'idle'
  const requirements = getToolRequirements(node.toolId)
  const compatibleAccounts = getCompatibleAccounts(accounts, node.toolId)
  const isTrigger = node.type === 'trigger'
  const canTrigger = isTrigger && workflow.entryNodeId === node.id
  const latestEvent = [...(runState?.events || [])].reverse().find((event) => event.nodeId === node.id)
  const latestInputNodeId = incomingEdges[incomingEdges.length - 1]?.from
  const latestInput = latestInputNodeId ? runState?.nodeOutputs?.[latestInputNodeId] : null

  return (
    <div className="panel-section grow node-detail-panel node-popover-panel n8n-like-popover">
      <div className="node-detail-header compact">
        <div>
          <div className="node-kicker">{node.type}</div>
          <div className="section-title popover-title">{node.label}</div>
          <div className="muted">{tool?.description || node.description || 'No description yet.'}</div>
        </div>
        <div className="node-detail-meta stacked">
          <span className={`pill state-pill state-${latestStatus}`}>{latestStatus}</span>
          <button className="secondary-button popover-close-button" onClick={onClose}>Close</button>
        </div>
      </div>

      {canTrigger ? (
        <div className="node-action-card">
          <div>
            <strong>Run from this node</strong>
            <div className="muted small-copy">Trigger this workflow directly from the node inspector.</div>
          </div>
          <button className="primary-button" onClick={() => onRunTrigger(node.id)}>{node.config?.triggerLabel ?? 'Start workflow'}</button>
        </div>
      ) : null}

      <div className="node-info-card run-summary-card">
        <div className="section-title">Run Info</div>
        <div className="muted small-copy">Latest status: {latestStatus}</div>
        <div className="muted small-copy">Latest event: {latestEvent?.message || latestEvent?.type || 'none yet'}</div>
        <div className="muted small-copy">Incoming routes: {incoming.length ? incoming.join(', ') : 'none'}</div>
        <div className="muted small-copy">Outgoing routes: {outgoing.length ? outgoing.join(', ') : 'none'}</div>
      </div>

      <div className="node-info-card">
        <div className="section-title">Configuration</div>
        <div className="config-grid">
          <label className="field-label">
            Label
            <input className="text-input" value={node.label ?? ''} onChange={(event) => onPatchNode({ label: event.target.value })} />
          </label>
          {node.config?.destination !== undefined ? (
            <label className="field-label">
              Destination
              <input className="text-input" value={node.config?.destination ?? ''} onChange={(event) => onPatchNode({ config: { ...node.config, destination: event.target.value } })} />
            </label>
          ) : null}
          {node.config?.fileNameTemplate !== undefined ? (
            <label className="field-label">
              File Name Template
              <input className="text-input" value={node.config?.fileNameTemplate ?? ''} onChange={(event) => onPatchNode({ config: { ...node.config, fileNameTemplate: event.target.value } })} />
            </label>
          ) : null}
          {node.config?.triggerLabel !== undefined ? (
            <label className="field-label">
              Trigger Label
              <input className="text-input" value={node.config?.triggerLabel ?? ''} onChange={(event) => onPatchNode({ config: { ...node.config, triggerLabel: event.target.value } })} />
            </label>
          ) : null}
          {node.config?.runtimeTarget !== undefined ? (
            <label className="field-label">
              Runtime Target
              <input className="text-input" value={node.config?.runtimeTarget ?? ''} onChange={(event) => onPatchNode({ config: { ...node.config, runtimeTarget: event.target.value } })} />
            </label>
          ) : null}
        </div>
      </div>

      {requirements?.provider === 'google' ? (
        <div className="node-info-card">
          <div className="section-title">Connected Account</div>
          {compatibleAccounts.length === 0 ? (
            <div className="account-callout">
              <div className="muted">This node needs a Google account with Drive access.</div>
              <button className="secondary-button" onClick={() => onConnectProvider('google')}>Connect Google account</button>
            </div>
          ) : null}
          <label className="field-label">
            Account
            <select
              value={node.config?.accountId ?? ''}
              onChange={(event) => onPatchNode({ config: { ...node.config, accountId: event.target.value } })}
            >
              <option value="">Select a connected Google account</option>
              {compatibleAccounts.map((account) => (
                <option key={account.id} value={account.id}>{account.label}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {node.prompt ? (
        <div className="node-info-card">
          <div className="section-title">Prompt</div>
          <textarea className="chat-input compact-input" value={node.prompt} onChange={(event) => onPatchNode({ prompt: event.target.value })} spellCheck="false" />
        </div>
      ) : null}

      <div className="node-detail-grid">
        <div className="node-info-card">
          <div className="section-title">Input Data</div>
          {latestInput ? <pre>{JSON.stringify(latestInput, null, 2)}</pre> : <div className="muted small-copy">No upstream runtime input yet.</div>}
        </div>
        <div className="node-info-card">
          <div className="section-title">Output Data</div>
          {latestOutput ? <pre>{JSON.stringify(latestOutput, null, 2)}</pre> : <div className="muted small-copy">No runtime output yet.</div>}
        </div>
      </div>

      <div className="node-detail-grid">
        <div className="node-info-card">
          <div className="section-title">Schemas</div>
          <SchemaBlock title="Input Schema" value={tool?.inputSchema} />
          <SchemaBlock title="Output Schema" value={tool?.outputSchema} />
          <SchemaBlock title="Expected Schema" value={node.config?.expectedSchema} />
        </div>
        <div className="node-info-card">
          <div className="section-title">Details</div>
          <div className="muted small-copy">Tool: {node.toolId || 'none'}</div>
          <div className="muted small-copy">Runtime target: {node.config?.runtimeTarget || 'default'}</div>
          {requirements ? (
            <div className="muted small-copy">Needs: {requirements.provider} · {(requirements.requiredCapabilities || []).join(', ')}</div>
          ) : (
            <div className="muted small-copy">No special external account requirement.</div>
          )}
          <div className="muted small-copy">Node id: {node.id}</div>
        </div>
      </div>
    </div>
  )
}

function RunPanel({ runState, running, onRun, defaultTriggerNodeId, open, onToggle }) {
  const downloadOutput = runState?.nodeOutputs?.['download-file']
  const storyOutput = runState?.nodeOutputs?.['prompt-edit-story'] || runState?.nodeOutputs?.['prompt-write-story']
  const failureEvent = runState?.events?.findLast?.((event) => event.type === 'node-failed' || event.type === 'error')

  return (
    <div className={`run-activity-shell ${open ? 'open' : ''}`}>
      <div className="panel run-activity-panel">
        <div className="section-title row-between">
          <span>Run Activity</span>
          <div className="run-activity-actions">
            <button className="primary-button" onClick={() => onRun(defaultTriggerNodeId)} disabled={running}>
              {running ? 'Running…' : 'Run workflow'}
            </button>
            <button className="secondary-button" onClick={onToggle}>{open ? 'Collapse' : 'Expand'}</button>
          </div>
        </div>
        <div className="muted">Run activity stays tucked away until needed, then rolls down when the workflow is active.</div>

        {failureEvent ? (
          <div className="run-result-card failure-surface">
            <div>
              <strong>Run failed</strong>
              <div className="muted small-copy">{failureEvent.message || 'Unknown workflow error'}</div>
            </div>
          </div>
        ) : null}

        {downloadOutput?.downloadUrl ? (
          <div className="run-result-card success-surface">
            <div>
              <strong>Your story is ready</strong>
              <div className="muted small-copy">{downloadOutput.fileName}</div>
            </div>
            <a className="primary-button inline-button" href={downloadOutput.downloadUrl} download={downloadOutput.fileName}>
              Download story
            </a>
          </div>
        ) : null}

        {storyOutput?.editedText || storyOutput?.storyText ? (
          <div className="story-preview">
            <div className="section-title">Story Preview</div>
            <pre>{storyOutput.editedText || storyOutput.storyText}</pre>
          </div>
        ) : null}

        <div className="run-status-grid">
          {runState
            ? Object.entries(runState.nodeStatus).map(([nodeId, status]) => (
                <div key={nodeId} className={`status-item status-${status}`}>
                  <span>{nodeId}</span>
                  <strong>{status}</strong>
                </div>
              ))
            : <div className="muted">No run yet.</div>}
        </div>
        <div className="event-log">
          {runState?.events?.map((event, index) => (
            <div key={`${event.type}-${index}`} className="event-item">
              <strong>{event.type}</strong>
              <span>{event.label || event.nodeId || event.message || event.because}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [workflows, setWorkflows] = useState(initialWorkflows)
  const [workflowIndex, setWorkflowIndex] = useState(0)
  const [workflowText, setWorkflowText] = useState(JSON.stringify(initialWorkflows[0], null, 2))
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [runState, setRunState] = useState(null)
  const [running, setRunning] = useState(false)
  const [runPanelOpen, setRunPanelOpen] = useState(false)
  const [activeView, setActiveView] = useState('workflows')
  const [connection, setConnection] = useState({ connected: false, bridgeUrl: 'http://127.0.0.1:4318', providers: [], accounts: [] })
  const [refreshingConnection, setRefreshingConnection] = useState(false)
  const [socratesMessages, setSocratesMessages] = useState([])
  const [socratesDraft, setSocratesDraft] = useState('')
  const [sendingToSocrates, setSendingToSocrates] = useState(false)
  const [socratesOpen, setSocratesOpen] = useState(false)
  const [jsonPanelOpen, setJsonPanelOpen] = useState(false)
  const [oauthStatus, setOauthStatus] = useState(null)
  const [accountsMessage, setAccountsMessage] = useState('')
  const [bridgeUrlDraft, setBridgeUrlDraft] = useState(getSavedBridgeUrl())
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 40, y: 24 })

  const parsedResult = useMemo(() => {
    try {
      return { workflow: JSON.parse(workflowText), error: '' }
    } catch (error) {
      return { workflow: null, error: error.message }
    }
  }, [workflowText])

  const parsedWorkflow = parsedResult.workflow
  const parseErrorText = parsedResult.error

  const validation = useMemo(() => {
    if (!parsedWorkflow) return { ok: false, errors: [{ path: 'workflow', message: parseErrorText || 'Invalid JSON' }] }

    const result = validateWorkflow(parsedWorkflow)
    const errors = [...result.errors]

    for (const node of parsedWorkflow.nodes || []) {
      if (node.toolId === 'integrations.google_drive.save_file' && !node.config?.accountId) {
        errors.push({
          path: `nodes.${node.id}.config.accountId`,
          message: 'Google Drive Save File requires a connected Google account.',
        })
      }
    }

    return {
      ok: errors.length === 0,
      errors,
    }
  }, [parsedWorkflow, parseErrorText])

  const selectedNode = parsedWorkflow?.nodes?.find((node) => node.id === selectedNodeId)
  const selectedTool = parsedWorkflow?.tools?.find((tool) => tool.id === selectedNode?.toolId)
  const defaultTriggerNodeId = parsedWorkflow?.entryNodeId ?? parsedWorkflow?.nodes?.find((node) => node.type === 'trigger')?.id

  useEffect(() => {
    if (parsedWorkflow?.nodes?.length) {
      const selectedStillExists = parsedWorkflow.nodes.some((node) => node.id === selectedNodeId)
      if (!selectedStillExists) {
        setSelectedNodeId('')
      }
    }
  }, [parsedWorkflow, selectedNodeId])

  useEffect(() => {
    setBridgeUrlDraft(getSavedBridgeUrl())
    refreshConnection()
  }, [])

  async function refreshConnection() {
    setRefreshingConnection(true)
    try {
      const next = await loadLocalConnectionState()
      setConnection(next)
    } finally {
      setRefreshingConnection(false)
    }
  }

  function saveBridgeTarget() {
    saveBridgeUrl(bridgeUrlDraft)
    setAccountsMessage(`Bridge URL saved: ${(bridgeUrlDraft || getDefaultBridgeUrl()).trim()}`)
    refreshConnection()
  }

  function resetBridgeTarget() {
    clearBridgeUrl()
    const nextUrl = getDefaultBridgeUrl()
    setBridgeUrlDraft(nextUrl)
    setAccountsMessage('Bridge URL reset to default localhost.')
    refreshConnection()
  }

  function loadWorkflow(index) {
    const workflow = workflows[index]
    setWorkflowIndex(index)
    setWorkflowText(JSON.stringify(workflow, null, 2))
    setSelectedNodeId('')
    setRunState(null)
    setRunPanelOpen(false)
    setSocratesMessages([])
    setJsonPanelOpen(false)
    setZoom(1)
    setPan({ x: 40, y: 24 })
  }

  function handleNewWorkflow() {
    const nextWorkflow = createBlankWorkflow()
    setWorkflows((current) => [...current, nextWorkflow])
    const nextIndex = workflows.length
    setWorkflowIndex(nextIndex)
    setWorkflowText(JSON.stringify(nextWorkflow, null, 2))
    setSelectedNodeId('')
    setRunState(null)
    setRunPanelOpen(false)
    setSocratesMessages([
      {
        role: 'assistant',
        text: 'New workflow created. Ask Socrates to shape the first real version.',
      },
    ])
    setSocratesOpen(true)
    setJsonPanelOpen(false)
    setZoom(1)
    setPan({ x: 40, y: 24 })
  }

  function handleSelectNode(nodeId) {
    setSelectedNodeId((current) => (current === nodeId ? '' : nodeId))
  }

  function patchSelectedNode(patch) {
    if (!parsedWorkflow || !selectedNodeId) return
    const currentNode = parsedWorkflow.nodes.find((node) => node.id === selectedNodeId)
    if (!currentNode) return

    const patchedNode = {
      ...currentNode,
      ...patch,
      config: patch.config ? patch.config : currentNode.config,
    }

    const nextWorkflow = {
      ...parsedWorkflow,
      nodes: parsedWorkflow.nodes.map((node) => (node.id === selectedNodeId ? patchedNode : node)),
    }

    setWorkflowText(JSON.stringify(nextWorkflow, null, 2))
  }

  async function handleRun(triggerNodeId = defaultTriggerNodeId) {
    if (!validation.ok || !parsedWorkflow || !triggerNodeId) return
    setRunning(true)
    setRunState(null)
    setRunPanelOpen(true)
    try {
      await runWorkflow(parsedWorkflow, (nextState) => {
        setRunState(nextState)
        setRunPanelOpen(true)
      }, {
        triggerNodeId,
        liveExecutors: connection.connected
          ? {
              generateStoryIdea,
              writeStory,
              editStory,
              saveFileToGoogleDrive,
            }
          : undefined,
      })
    } finally {
      setRunning(false)
    }
  }

  async function handleSendToSocrates(currentWorkflowText) {
    const text = socratesDraft.trim()
    if (!text) return

    setSendingToSocrates(true)
    setSocratesMessages((current) => [...current, { role: 'user', text }])
    setSocratesDraft('')

    try {
      const result = await sendToSocrates(text, currentWorkflowText)
      setSocratesMessages((current) => [...current, { role: 'assistant', text: result.reply }])
    } catch (error) {
      setSocratesMessages((current) => [...current, { role: 'assistant', text: `Socrates unavailable: ${error.message}` }])
    } finally {
      setSendingToSocrates(false)
    }
  }

  async function handleConnectProvider(provider) {
    setActiveView('accounts')
    setAccountsMessage('')

    if (provider === 'google') {
      try {
        const result = await connectGoogleAccount()
        const popup = window.open(result.authUrl, 'workflow-studio-google-connect', 'width=560,height=720')
        const popupBlocked = !popup || popup.closed || typeof popup.closed === 'undefined'
        setOauthStatus({
          provider: 'google',
          status: popupBlocked ? 'popup_blocked' : 'pending',
          connectionId: result.connectionId,
          error: null,
          authUrl: result.authUrl,
        })

        const startedAt = Date.now()
        while (Date.now() - startedAt < 5 * 60 * 1000) {
          const status = await getGoogleConnectionStatus(result.connectionId)
          setOauthStatus({
            provider: 'google',
            status: status.status,
            connectionId: result.connectionId,
            error: status.error || null,
            authUrl: result.authUrl,
          })

          if (status.status === 'connected') {
            popup?.close()
            setAccountsMessage('Google account connected.')
            await refreshConnection()
            return
          }

          if (status.status === 'failed') {
            popup?.close()
            setAccountsMessage(`Google sign-in failed: ${status.error || 'Unknown error'}`)
            return
          }

          await new Promise((resolve) => setTimeout(resolve, 1500))
        }

        setAccountsMessage('Google sign-in timed out. Use the open link to continue or try again.')
        return
      } catch (error) {
        setOauthStatus({ provider: 'google', status: 'failed', connectionId: null, error: error.message, authUrl: null })
        setAccountsMessage(`Google connect failed: ${error.message}`)
        return
      }
    }

    try {
      await connectProvider(provider)
    } catch (error) {
      setAccountsMessage(`${provider} connect failed: ${error.message}`)
    } finally {
      await refreshConnection()
    }
  }

  async function handleTestAccount(accountId) {
    await testAccount(accountId)
    await refreshConnection()
  }

  const nodePopover = useMemo(() => {
    if (!parsedWorkflow || !selectedNode) return null
    const position = getNodePosition(selectedNode)
    const left = position.left + NODE_WIDTH - 24
    const top = position.top + NODE_HEIGHT + 16

    return {
      left,
      top,
      width: 360,
      content: (
        <NodeDetailPanel
          node={selectedNode}
          tool={selectedTool}
          workflow={parsedWorkflow}
          runState={runState}
          onRunTrigger={handleRun}
          onPatchNode={patchSelectedNode}
          accounts={connection.accounts || []}
          onConnectProvider={handleConnectProvider}
          onClose={() => setSelectedNodeId('')}
        />
      ),
    }
  }, [parsedWorkflow, selectedNode, selectedTool, runState, connection.accounts])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Workflow Studio</h1>
          <p>Design, connect, and run connected workflows.</p>
        </div>
        <div className="topbar-actions topbar-action-row">
          <div className="view-switcher">
            <button className={activeView === 'workflows' ? 'primary-button' : 'secondary-button'} onClick={() => setActiveView('workflows')}>Workflows</button>
            <button className={activeView === 'accounts' ? 'primary-button' : 'secondary-button'} onClick={() => setActiveView('accounts')}>Accounts</button>
          </div>
          {activeView === 'workflows' ? (
            <>
              <button className="secondary-button" onClick={handleNewWorkflow}>New workflow</button>
              <label>
                Workflow
                <select value={workflowIndex} onChange={(event) => loadWorkflow(Number(event.target.value))}>
                  {workflows.map((workflow, index) => (
                    <option key={workflow.id} value={index}>
                      {workflow.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
        </div>
      </header>

      {activeView === 'accounts' ? (
        <AccountsPanel
          providers={connection.providers || []}
          accounts={connection.accounts || []}
          onRefresh={refreshConnection}
          onConnect={handleConnectProvider}
          onTest={handleTestAccount}
          refreshing={refreshingConnection}
          oauthStatus={oauthStatus}
          accountsMessage={accountsMessage}
        />
      ) : (
        <>
          <main className="workflow-redesign-layout">
            <section className="workflow-stage-column">
              <div className="panel workflow-stage-panel">
                <div className="workflow-stage-header row-between">
                  <div>
                    <h2>{parsedWorkflow?.name ?? 'Invalid workflow'}</h2>
                    <p>{parsedWorkflow?.description ?? 'Fix JSON to continue.'}</p>
                  </div>
                  <div className="hero-pills">
                    <span className="pill">{parsedWorkflow?.appId ?? 'unknown-app'}</span>
                    <span className="pill">v{parsedWorkflow?.version ?? '—'}</span>
                    <span className="pill">{connection.connected ? 'bridge live' : 'sample mode'}</span>
                  </div>
                </div>

                <div className="workflow-stage-toolbar">
                  <div className="workflow-stage-toolbar-left">
                    <button className="primary-button" onClick={() => handleRun(defaultTriggerNodeId)} disabled={running || !defaultTriggerNodeId || !validation.ok}>
                      {running ? 'Running…' : 'Run workflow'}
                    </button>
                    <button className="secondary-button" onClick={() => setSocratesOpen(true)}>Open Socrates</button>
                    <button className="secondary-button" onClick={() => setJsonPanelOpen((current) => !current)}>
                      {jsonPanelOpen ? 'Hide Workflow JSON' : 'Reveal Workflow JSON'}
                    </button>
                    <button className="secondary-button" onClick={() => { setZoom(1); setPan({ x: 40, y: 24 }) }}>Reset view</button>
                  </div>
                  <div className="workflow-stage-toolbar-right muted small-copy">
                    {selectedNode ? `Node open: ${selectedNode.label}` : `Zoom ${Math.round(zoom * 100)}% · click a node for details`}
                  </div>
                </div>

                {parsedWorkflow ? (
                  <GraphView
                    workflow={parsedWorkflow}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={handleSelectNode}
                    zoom={zoom}
                    pan={pan}
                    onPanChange={setPan}
                    onZoomChange={setZoom}
                    nodePopover={nodePopover}
                  />
                ) : null}
              </div>

              <RunPanel
                runState={runState}
                running={running}
                onRun={handleRun}
                defaultTriggerNodeId={defaultTriggerNodeId}
                open={runPanelOpen}
                onToggle={() => setRunPanelOpen((current) => !current)}
              />

              <div className="workflow-bottom-grid">
                <div className="panel secondary-info-panel">
                  <ConnectionPanel
                    connection={connection}
                    refreshing={refreshingConnection}
                    onRefresh={refreshConnection}
                    bridgeUrlDraft={bridgeUrlDraft}
                    onBridgeUrlChange={setBridgeUrlDraft}
                    onSaveBridgeUrl={saveBridgeTarget}
                    onResetBridgeUrl={resetBridgeTarget}
                  />
                  <ValidationPanel validation={validation} />
                  {parsedWorkflow ? <ToolList workflow={parsedWorkflow} /> : null}
                </div>
              </div>

              <div className={`panel workflow-json-panel ${jsonPanelOpen ? 'open' : ''}`}>
                <div className="section-title row-between">
                  <span>Workflow JSON</span>
                  <button className="secondary-button" onClick={() => setJsonPanelOpen(false)}>Hide</button>
                </div>
                <textarea className="json-editor large" value={workflowText} onChange={(event) => setWorkflowText(event.target.value)} spellCheck="false" />
              </div>
            </section>
          </main>

          <SocratesPanel
            connection={connection}
            workflowText={workflowText}
            messages={socratesMessages}
            draftMessage={socratesDraft}
            onDraftChange={setSocratesDraft}
            onSend={handleSendToSocrates}
            sending={sendingToSocrates}
            open={socratesOpen}
            onClose={() => setSocratesOpen(false)}
          />
        </>
      )}
    </div>
  )
}

export default App
