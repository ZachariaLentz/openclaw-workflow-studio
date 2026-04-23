import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { BottomSheet } from './components/BottomSheet'
import { NodeConfigFields } from './components/NodeConfigFields'
import { RunPanel } from './components/RunPanel'
import { WorkflowLibraryScreen } from './components/WorkflowLibraryScreen'
import { WorkspaceHeader } from './components/WorkspaceHeader'
import { WorkspaceTabBar } from './components/WorkspaceTabBar'
import { validateWorkflow } from './lib/schema'
import { runWorkflow } from './lib/runtime'
import { loadLocalConnectionState } from './lib/liveWorkflow'
import { editStory, generateStoryIdea, saveFileToGoogleDrive, writeStory } from './lib/openclaw'
import { sendToSocrates } from './lib/socrates'
import { applySocratesChange } from './lib/socratesProtocol'
import { createBlankWorkflow } from './lib/newWorkflow'
import {
  connectGoogleAccount,
  connectProvider,
  createWorkflowSchedule,
  deleteWorkflowSchedule,
  getGoogleConnectionStatus,
  testAccount,
  testWorkflowSchedule,
  updateWorkflowSchedule,
} from './lib/bridge'
import { getCompatibleAccounts, getToolRequirements } from './lib/accounts'
import { clearBridgeUrl, getDefaultBridgeUrl, getSavedBridgeUrl, saveBridgeUrl } from './lib/bridgeConfig'
import { getNodeEditorFields } from './lib/nodes/registry'
import { buildWorkflowLibraryView, loadWorkflowLibrary, touchWorkflowOpened, upsertWorkflowInLibrary } from './lib/workflowLibrary'

const initialWorkflows = loadWorkflowLibrary()
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

function resetCanvasState(setZoom, setPan) {
  setZoom(1)
  setPan({ x: 40, y: 24 })
}

function GraphView({ workflow, selectedNodeId, onSelectNode, zoom, pan, onPanChange, onZoomChange }) {
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
    if (!dragRef.current) dragRef.current = { pointers: new Map() }
    dragRef.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (dragRef.current.pointers.size === 1) {
      dragRef.current = { ...dragRef.current, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
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
      }
    }
  }

  function movePan(event) {
    if (!dragRef.current?.pointers) return
    dragRef.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (dragRef.current.pointers.size === 2 && pinchRef.current) {
      const [first, second] = [...dragRef.current.pointers.values()]
      const distance = getDistance(first, second)
      const surface = surfaceRef.current
      if (!surface) return
      const rect = surface.getBoundingClientRect()
      const pointerX = (first.x + second.x) / 2 - rect.left
      const pointerY = (first.y + second.y) / 2 - rect.top
      const nextZoom = clampZoom(pinchRef.current.zoom * (distance / Math.max(1, pinchRef.current.distance)))
      const worldX = (pointerX - pinchRef.current.panX) / pinchRef.current.zoom
      const worldY = (pointerY - pinchRef.current.panY) / pinchRef.current.zoom
      onZoomChange(nextZoom)
      onPanChange({ x: pointerX - worldX * nextZoom, y: pointerY - worldY * nextZoom })
      return
    }

    if (dragRef.current.pointers.size !== 1 || pinchRef.current) return
    const deltaX = event.clientX - dragRef.current.x
    const deltaY = event.clientY - dragRef.current.y
    onPanChange({ x: dragRef.current.panX + deltaX, y: dragRef.current.panY + deltaY })
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
      dragRef.current = { pointers: dragRef.current.pointers, x: remaining.x, y: remaining.y, panX: pan.x, panY: pan.y }
      pinchRef.current = null
    }
  }

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return undefined
    const listener = (event) => {
      event.preventDefault()
      const rect = surface.getBoundingClientRect()
      const pointerX = event.clientX - rect.left
      const pointerY = event.clientY - rect.top
      const zoomFactor = event.deltaY < 0 ? 1.08 : 0.92
      const nextZoom = clampZoom(zoom * zoomFactor)
      if (nextZoom === zoom) return
      const worldX = (pointerX - pan.x) / zoom
      const worldY = (pointerY - pan.y) / zoom
      onZoomChange(nextZoom)
      onPanChange({ x: pointerX - worldX * nextZoom, y: pointerY - worldY * nextZoom })
    }
    surface.addEventListener('wheel', listener, { passive: false })
    return () => surface.removeEventListener('wheel', listener)
  }, [zoom, pan, onPanChange, onZoomChange])

  return (
    <div className="graph-phone-stage">
      <div className="graph-phone-topline row-between">
        <div className="hero-pills">
          <span className="pill">drag</span>
          <span className="pill">pinch</span>
          <span className="pill">{workflow.nodes.length} nodes</span>
        </div>
        <span className="muted small-copy">{Math.round(zoom * 100)}%</span>
      </div>
      <div
        ref={surfaceRef}
        className="diagram-surface graph-stage-surface pannable mobile-canvas"
        onPointerDown={beginPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onPointerLeave={endPan}
      >
        <div
          className="diagram-world"
          style={{ width: size.width, height: size.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
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
              return <path key={edge.id} d={getEdgePath(fromNode, toNode)} className="diagram-edge" markerEnd="url(#arrowhead)" />
            })}
          </svg>

          {workflow.nodes.map((node) => {
            const position = getNodePosition(node)
            return (
              <button
                key={node.id}
                className={`diagram-node ${selectedNodeId === node.id ? 'selected' : ''} ${node.type}`}
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
              {provider.id === 'google' && oauthStatus ? <div className="muted small-copy oauth-status-copy">{oauthStatus.status === 'pending' ? 'Waiting for Google sign-in to finish…' : oauthStatus.status === 'connected' ? 'Google account connected. Refreshing account list…' : oauthStatus.status === 'failed' ? `Google sign-in failed: ${oauthStatus.error || 'Unknown error'}` : oauthStatus.status === 'popup_blocked' ? 'Popup was blocked. Use the open link to continue Google sign-in.' : null}</div> : null}
              {provider.id === 'google' && oauthStatus?.authUrl && (oauthStatus.status === 'pending' || oauthStatus.status === 'popup_blocked') ? <a className="secondary-button inline-button" href={oauthStatus.authUrl} target="_blank" rel="noreferrer">Open Google sign-in</a> : null}
              {providerAccounts.length === 0 ? <div className="muted empty-state">No account connected.</div> : null}
              <div className="account-list">
                {providerAccounts.map((account) => (
                  <div key={account.id} className="account-item">
                    <div>
                      <strong>{account.label}</strong>
                      <div className="muted small-copy">{account.identity?.email || account.identity?.displayName || 'Local account'}</div>
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

function NodeDetailPanel({ node, tool, workflow, runState, onRunTrigger, onPatchNode, accounts, onConnectProvider, onSaveSchedule, onRunScheduleNow, onDeleteSchedule, scheduleBusy }) {
  if (!node) return null
  const incomingEdges = workflow.edges.filter((edge) => edge.to === node.id)
  const outgoingEdges = workflow.edges.filter((edge) => edge.from === node.id)
  const latestOutput = runState?.nodeOutputs?.[node.id]
  const latestStatus = runState?.nodeStatus?.[node.id] || 'idle'
  const requirements = getToolRequirements(node.toolId)
  const compatibleAccounts = getCompatibleAccounts(accounts, node.toolId)
  const registryFields = getNodeEditorFields(node.toolId)
  const latestEvent = [...(runState?.events || [])].reverse().find((event) => event.nodeId === node.id)
  const latestInputNodeId = incomingEdges[incomingEdges.length - 1]?.from
  const latestInput = latestInputNodeId ? runState?.nodeOutputs?.[latestInputNodeId] : null
  const canTrigger = node.type === 'trigger' && workflow.entryNodeId === node.id
  const isScheduleTrigger = node.toolId === 'trigger.schedule'

  return (
    <div className="n8n-like-popover mobile-inspector">
      <div className="node-detail-header compact">
        <div>
          <div className="node-kicker">{node.type}</div>
          <div className="section-title popover-title">{node.label}</div>
          <div className="muted">{tool?.description || node.description || 'No description yet.'}</div>
        </div>
        <div className="node-detail-meta stacked">
          <span className={`pill state-pill state-${latestStatus}`}>{latestStatus}</span>
        </div>
      </div>

      {canTrigger ? (
        <div className="node-action-card">
          <strong>Run from this node</strong>
          <button className="primary-button" onClick={() => onRunTrigger(node.id)}>{node.config?.triggerLabel ?? 'Start workflow'}</button>
        </div>
      ) : null}

      {isScheduleTrigger ? (
        <div className="node-info-card">
          <div className="section-title">Schedule</div>
          <NodeConfigFields node={node} fields={registryFields} accounts={accounts} onPatchNode={onPatchNode} />
          <div className="hero-pills">
            <span className="pill">{node.config?.cronJobId ? 'bound' : 'unbound'}</span>
            <span className="pill">{node.config?.scheduleSummary || 'No saved schedule yet'}</span>
          </div>
          <div className="provider-actions">
            <button className="primary-button" onClick={() => onSaveSchedule(node)} disabled={scheduleBusy}>{scheduleBusy ? 'Saving…' : node.config?.cronJobId ? 'Update schedule' : 'Create schedule'}</button>
            <button className="secondary-button" onClick={() => onRunScheduleNow(node)} disabled={scheduleBusy || !node.config?.cronJobId}>Run now</button>
            <button className="secondary-button" onClick={() => onDeleteSchedule(node)} disabled={scheduleBusy || !node.config?.cronJobId}>Delete</button>
          </div>
        </div>
      ) : null}

      <div className="node-info-card run-summary-card">
        <div className="section-title">Run Info</div>
        <div className="muted small-copy">Latest status: {latestStatus}</div>
        <div className="muted small-copy">Latest event: {latestEvent?.message || latestEvent?.type || 'none yet'}</div>
        <div className="muted small-copy">Incoming: {incomingEdges.length ? incomingEdges.map((edge) => edge.from).join(', ') : 'none'}</div>
        <div className="muted small-copy">Outgoing: {outgoingEdges.length ? outgoingEdges.map((edge) => edge.to).join(', ') : 'none'}</div>
      </div>

      <div className="node-info-card">
        <div className="section-title">Configuration</div>
        <div className="config-grid">
          <label className="field-label">
            Label
            <input className="text-input" value={node.label ?? ''} onChange={(event) => onPatchNode({ label: event.target.value })} />
          </label>
        </div>
        {!isScheduleTrigger && registryFields.length > 0 ? <NodeConfigFields node={node} fields={registryFields} accounts={accounts} onPatchNode={onPatchNode} /> : null}
      </div>

      {requirements?.provider === 'google' && compatibleAccounts.length === 0 ? (
        <div className="node-info-card">
          <div className="section-title">Connected Account</div>
          <div className="account-callout"><div className="muted">This node needs a Google account with Drive access.</div><button className="secondary-button" onClick={() => onConnectProvider('google')}>Connect Google account</button></div>
        </div>
      ) : null}

      {node.prompt ? <div className="node-info-card"><div className="section-title">Prompt</div><textarea className="chat-input compact-input" value={node.prompt} onChange={(event) => onPatchNode({ prompt: event.target.value })} spellCheck="false" /></div> : null}

      <div className="node-detail-grid">
        <div className="node-info-card"><div className="section-title">Input Data</div>{latestInput ? <pre>{JSON.stringify(latestInput, null, 2)}</pre> : <div className="muted small-copy">No upstream runtime input yet.</div>}</div>
        <div className="node-info-card"><div className="section-title">Output Data</div>{latestOutput ? <pre>{JSON.stringify(latestOutput, null, 2)}</pre> : <div className="muted small-copy">No runtime output yet.</div>}</div>
      </div>

      <div className="node-detail-grid">
        <div className="node-info-card"><div className="section-title">Schemas</div><SchemaBlock title="Input Schema" value={tool?.inputSchema} /><SchemaBlock title="Output Schema" value={tool?.outputSchema} /><SchemaBlock title="Expected Schema" value={node.config?.expectedSchema} /></div>
        <div className="node-info-card"><div className="section-title">Details</div><div className="muted small-copy">Tool: {node.toolId || 'none'}</div><div className="muted small-copy">Runtime target: {node.config?.runtimeTarget || 'default'}</div>{requirements ? <div className="muted small-copy">Needs: {requirements.provider} · {(requirements.requiredCapabilities || []).join(', ')}</div> : <div className="muted small-copy">No special external account requirement.</div>}<div className="muted small-copy">Node id: {node.id}</div></div>
      </div>
    </div>
  )
}

function NodeSelectionList({ workflow, selectedNodeId, onSelectNode }) {
  return (
    <div className="node-picker-list">
      {workflow.nodes.map((node) => (
        <button
          key={node.id}
          className={`workflow-phone-card node-picker-card ${selectedNodeId === node.id ? 'selected' : ''}`}
          onClick={() => onSelectNode(node.id)}
        >
          <div className="workflow-phone-card-top row-between">
            <span className="pill">{node.type}</span>
            <span className="muted small-copy">{node.toolId || 'no tool'}</span>
          </div>
          <div className="workflow-phone-title">{node.label}</div>
          <div className="muted small-copy">{node.description || 'No description yet.'}</div>
        </button>
      ))}
    </div>
  )
}

function WorkspaceCanvasScreen({ workflow, selectedNode, selectedNodeId, onSelectNode, onOpenNodeWorkspace, onOpenRunWorkspace, zoom, pan, onPanChange, onZoomChange, runState }) {
  return (
    <div className="workspace-screen-stack">
      <div className="panel workspace-summary-panel quiet-surface">
        <div className="workflow-phone-card-top row-between">
          <div className="section-title">Canvas</div>
          <div className="hero-pills">
            <span className="pill">{workflow.nodes.length} nodes</span>
            <span className="pill">{workflow.edges.length} edges</span>
          </div>
        </div>
        <div className="workspace-quick-actions compact-actions">
          <button className="secondary-button" onClick={onOpenNodeWorkspace}>{selectedNodeId ? 'Edit node' : 'Nodes'}</button>
          <button className="secondary-button" onClick={onOpenRunWorkspace}>Run</button>
        </div>
      </div>

      <GraphView workflow={workflow} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} zoom={zoom} pan={pan} onPanChange={onPanChange} onZoomChange={onZoomChange} />

      {selectedNode ? (
        <div className="panel canvas-selection-panel quiet-surface">
          <div className="workflow-phone-card-top row-between">
            <div>
              <div className="section-title">Selected node</div>
              <div className="muted small-copy">{selectedNode.type} · {selectedNode.toolId || 'No tool'}</div>
            </div>
            <button className="primary-button" onClick={onOpenNodeWorkspace}>Edit</button>
          </div>
          <div className="workflow-phone-title compact">{selectedNode.label}</div>
          <div className="muted small-copy">{selectedNode.description || 'No description yet.'}</div>
          {runState?.nodeStatus?.[selectedNode.id] ? <div className="hero-pills"><span className={`pill state-pill state-${runState.nodeStatus[selectedNode.id]}`}>{runState.nodeStatus[selectedNode.id]}</span></div> : null}
        </div>
      ) : null}
    </div>
  )
}

function WorkspaceNodeScreen({ workflow, selectedNode, selectedTool, selectedNodeId, onSelectNode, ...panelProps }) {
  return (
    <div className="workspace-screen-stack">
      <div className="panel workspace-section-intro quiet-surface">
        <div className="section-title">Node details</div>
      </div>

      {!selectedNode ? (
        <div className="panel empty-library-state">
          <div className="section-title">Pick a node</div>
        </div>
      ) : (
        <div className="panel workspace-node-panel">
          <NodeDetailPanel node={selectedNode} tool={selectedTool} workflow={workflow} {...panelProps} />
        </div>
      )}

      <NodeSelectionList workflow={workflow} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} />
    </div>
  )
}

function WorkspaceSocratesScreen({ connection, socratesMessages, socratesDraft, onSocratesDraftChange, onSendToSocrates, sendingToSocrates }) {
  const suggestionPrompts = [
    'Add error handling and a fallback branch.',
    'Rename the workflow and tighten every node label.',
    'Insert a review step before the final output.',
    'Turn this into a reusable template for another app.',
  ]

  return (
    <div className="workspace-screen-stack">
      <div className="panel workspace-section-intro quiet-surface">
        <div className="section-title">Socrates</div>
      </div>

      <div className="panel">
        <div className="socrates-panel workspace-socrates-panel">
          <div className="socrates-suggestion-row">
            {suggestionPrompts.map((prompt) => (
              <button key={prompt} className="secondary-button suggestion-chip" onClick={() => onSocratesDraftChange(prompt)}>{prompt}</button>
            ))}
          </div>
          <div className="chat-log">
            {socratesMessages.length === 0 ? <div className="muted">No messages yet.</div> : null}
            {socratesMessages.map((item, index) => <div key={`${item.role}-${index}`} className={`chat-bubble ${item.role}`}><strong>{item.role === 'user' ? 'You' : 'Socrates'}</strong><div>{item.text}</div></div>)}
          </div>
          <textarea className="chat-input" value={socratesDraft} onChange={(event) => onSocratesDraftChange(event.target.value)} placeholder="Ask Socrates…" spellCheck="false" />
          <div className="row-between workspace-footer-row"><span className="muted small-copy">{connection.connected ? 'Bridge connected' : 'Bridge required'}</span><button className="primary-button" disabled={sendingToSocrates || !connection.connected || !socratesDraft.trim()} onClick={onSendToSocrates}>{sendingToSocrates ? 'Sending…' : 'Send'}</button></div>
        </div>
      </div>
    </div>
  )
}

function EventTimeline({ events = [] }) {
  const recentEvents = [...events].slice(-8).reverse()
  if (recentEvents.length === 0) return <div className="muted small-copy">No events yet.</div>

  return (
    <div className="event-timeline">
      {recentEvents.map((event, index) => (
        <div key={`${event.type}-${event.nodeId || 'workflow'}-${index}`} className="event-item timeline-item">
          <div className="workflow-phone-card-top row-between">
            <strong>{event.label || event.nodeId || 'Workflow'}</strong>
            <span className="pill">{event.type}</span>
          </div>
          <div className="muted small-copy">{event.message || 'No extra detail.'}</div>
        </div>
      ))}
    </div>
  )
}

function WorkspaceSettingsScreen({ connection, bridgeUrlDraft, onBridgeUrlDraftChange, onSaveBridgeTarget, onResetBridgeTarget, onRefreshConnection, refreshingConnection, oauthStatus, accountsMessage, onConnectProvider, onTestAccount, onOpenJson }) {
  return (
    <div className="workspace-screen-stack">
      <div className="panel workspace-section-intro quiet-surface">
        <div className="section-title">Settings</div>
      </div>

      <div className="panel-section compact-panel-section panel">
        <div className={connection.connected ? 'success' : 'muted'}>{connection.connected ? 'Connected' : 'Unavailable'}</div>
        <div className="muted connection-copy">{connection.connected ? 'Bridge connected' : connection.error || 'Sample mode'}</div>
        <div className="hero-pills connection-pills">
          <span className="pill">{connection.bridgeUrl || 'bridge unknown'}</span>
          {connection.connected ? <span className="pill">live bridge</span> : <span className="pill">sample mode</span>}
        </div>
        <label className="field-label">Bridge URL<input className="text-input" value={bridgeUrlDraft} onChange={(event) => onBridgeUrlDraftChange(event.target.value)} /></label>
        <div className="provider-actions">
          <button className="primary-button" onClick={onSaveBridgeTarget}>Save</button>
          <button className="secondary-button" onClick={onResetBridgeTarget}>Reset</button>
          <button className="secondary-button" onClick={onRefreshConnection} disabled={refreshingConnection}>{refreshingConnection ? 'Refreshing…' : 'Refresh'}</button>
          <button className="secondary-button" onClick={onOpenJson}>Open workflow JSON</button>
        </div>
      </div>

      <AccountsPanel providers={connection.providers || []} accounts={connection.accounts || []} onRefresh={onRefreshConnection} onConnect={onConnectProvider} onTest={onTestAccount} refreshing={refreshingConnection} oauthStatus={oauthStatus} accountsMessage={accountsMessage} />
    </div>
  )
}

function App() {
  const [workflows, setWorkflows] = useState(initialWorkflows)
  const [activeWorkflowId, setActiveWorkflowId] = useState(initialWorkflows[0]?.id || '')
  const [workflowText, setWorkflowText] = useState(JSON.stringify(initialWorkflows[0], null, 2))
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [runState, setRunState] = useState(null)
  const [running, setRunning] = useState(false)
  const [activeView, setActiveView] = useState('library')
  const [workspaceTab, setWorkspaceTab] = useState('canvas')
  const [connection, setConnection] = useState({ connected: false, bridgeUrl: 'http://127.0.0.1:4318', providers: [], accounts: [] })
  const [refreshingConnection, setRefreshingConnection] = useState(false)
  const [socratesMessages, setSocratesMessages] = useState([])
  const [socratesDraft, setSocratesDraft] = useState('')
  const [sendingToSocrates, setSendingToSocrates] = useState(false)
  const [jsonPanelOpen, setJsonPanelOpen] = useState(false)
  const [nodeSheetOpen, setNodeSheetOpen] = useState(false)
  const [oauthStatus, setOauthStatus] = useState(null)
  const [accountsMessage, setAccountsMessage] = useState('')
  const [bridgeUrlDraft, setBridgeUrlDraft] = useState(getSavedBridgeUrl())
  const [libraryQuery, setLibraryQuery] = useState('')
  const [librarySort, setLibrarySort] = useState('updated')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 40, y: 24 })
  const [lastRouteByWorkflow, setLastRouteByWorkflow] = useState({})
  const [runningSchedule, setRunningSchedule] = useState(false)
  const workflowsRef = useRef(workflows)
  const deferredQuery = useDeferredValue(libraryQuery)

  useEffect(() => {
    workflowsRef.current = workflows
  }, [workflows])

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
    if (!parsedWorkflow) return { ok: false, errors: [{ path: 'workflow', message: parseErrorText || 'Invalid JSON' }], warnings: [] }
    const result = validateWorkflow(parsedWorkflow)
    const errors = [...result.errors]
    const warnings = []
    for (const node of parsedWorkflow.nodes || []) {
      if (node.toolId === 'integrations.google_drive.save_file' && !node.config?.accountId) {
        warnings.push({ path: `nodes.${node.id}.config.accountId`, message: 'Google Drive Save File will be skipped until a connected Google account is selected.' })
      }
    }
    return { ok: errors.length === 0, errors, warnings }
  }, [parsedWorkflow, parseErrorText])

  const selectedNode = parsedWorkflow?.nodes?.find((node) => node.id === selectedNodeId)
  const selectedTool = parsedWorkflow?.tools?.find((tool) => tool.id === selectedNode?.toolId)
  const defaultTriggerNodeId = parsedWorkflow?.entryNodeId ?? parsedWorkflow?.nodes?.find((node) => node.type === 'trigger')?.id
  const libraryView = useMemo(
    () => buildWorkflowLibraryView(workflows, { query: deferredQuery, sort: librarySort }),
    [workflows, deferredQuery, librarySort],
  )

  useEffect(() => {
    if (parsedWorkflow?.nodes?.length && !parsedWorkflow.nodes.some((node) => node.id === selectedNodeId)) setSelectedNodeId('')
  }, [parsedWorkflow, selectedNodeId])

  useEffect(() => {
    if (selectedNodeId) setNodeSheetOpen(true)
  }, [selectedNodeId])

  useEffect(() => {
    setBridgeUrlDraft(getSavedBridgeUrl())
    refreshConnection()
  }, [])

  useEffect(() => {
    if (!parsedWorkflow || !validation.ok || activeView !== 'canvas') return undefined
    const timeoutId = window.setTimeout(() => {
      persistWorkflow(parsedWorkflow, { syncText: false })
    }, 250)
    return () => window.clearTimeout(timeoutId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedWorkflow, validation.ok, activeView])

  function getWorkflowFromLibrary(workflowId, source = workflowsRef.current) {
    return source.find((workflow) => workflow.id === workflowId) || source[0] || null
  }

  function persistWorkflow(nextWorkflow, options = {}) {
    const nextLibrary = upsertWorkflowInLibrary(workflowsRef.current, nextWorkflow, { touchOpenedAt: options.touchOpenedAt })
    workflowsRef.current = nextLibrary
    setWorkflows(nextLibrary)
    const savedWorkflow = getWorkflowFromLibrary(nextWorkflow.id, nextLibrary)
    setActiveWorkflowId(savedWorkflow?.id || '')
    if (options.syncText !== false && savedWorkflow) {
      setWorkflowText(JSON.stringify(savedWorkflow, null, 2))
    }
    return savedWorkflow
  }

  async function refreshConnection() {
    setRefreshingConnection(true)
    try {
      setConnection(await loadLocalConnectionState())
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

  function rememberWorkspaceTab(tab) {
    const workflowId = parsedWorkflow?.id || activeWorkflowId
    if (!workflowId) return
    setLastRouteByWorkflow((current) => ({ ...current, [workflowId]: tab }))
  }

  function goToWorkspaceTab(tab) {
    setWorkspaceTab(tab)
    rememberWorkspaceTab(tab)
  }

  function loadWorkflow(workflowId) {
    const nextLibrary = touchWorkflowOpened(workflowsRef.current, workflowId)
    workflowsRef.current = nextLibrary
    setWorkflows(nextLibrary)
    const workflow = getWorkflowFromLibrary(workflowId, nextLibrary)
    if (!workflow) return
    setActiveWorkflowId(workflow.id)
    setWorkflowText(JSON.stringify(workflow, null, 2))
    setSelectedNodeId('')
    setRunState(null)
    setJsonPanelOpen(false)
    resetCanvasState(setZoom, setPan)
    setWorkspaceTab(lastRouteByWorkflow[workflow.id] || 'canvas')
    setActiveView('canvas')
  }

  function handleNewWorkflow() {
    const nextWorkflow = createBlankWorkflow()
    const savedWorkflow = persistWorkflow(nextWorkflow, { touchOpenedAt: true })
    if (!savedWorkflow) return
    setWorkflowText(JSON.stringify(savedWorkflow, null, 2))
    setSelectedNodeId('')
    setRunState(null)
    setSocratesMessages([{ role: 'assistant', text: 'New workflow created.' }])
    setJsonPanelOpen(false)
    resetCanvasState(setZoom, setPan)
    goToWorkspaceTab('socrates')
    setActiveView('canvas')
  }

  function handleSelectNode(nodeId) {
    setSelectedNodeId(nodeId)
    setNodeSheetOpen(true)
  }

  function openNodeWorkspace(nodeId = selectedNodeId) {
    if (nodeId) setSelectedNodeId(nodeId)
    setNodeSheetOpen(false)
    goToWorkspaceTab('node')
  }

  function patchSelectedNode(patch) {
    if (!parsedWorkflow || !selectedNodeId) return
    const currentNode = parsedWorkflow.nodes.find((node) => node.id === selectedNodeId)
    if (!currentNode) return
    const patchedNode = {
      ...currentNode,
      ...patch,
      config: patch.config ? { ...(currentNode.config || {}), ...patch.config } : currentNode.config,
    }
    const nextWorkflow = {
      ...parsedWorkflow,
      nodes: parsedWorkflow.nodes.map((node) => (node.id === selectedNodeId ? patchedNode : node)),
    }
    persistWorkflow(nextWorkflow, { syncText: false })
    setWorkflowText(JSON.stringify(nextWorkflow, null, 2))
  }

  async function handleSaveSchedule(node) {
    if (!parsedWorkflow || !node || node.toolId !== 'trigger.schedule') return
    setRunningSchedule(true)
    try {
      const payload = {
        workflowId: parsedWorkflow.id,
        nodeId: node.id,
        name: node.config?.triggerLabel || node.label,
        scheduleMode: node.config?.scheduleMode || 'cron',
        cronExpression: node.config?.cronExpression || null,
        every: node.config?.every || null,
        runAt: node.config?.runAt || null,
        timezone: node.config?.timezone || 'UTC',
        enabled: node.config?.enabled !== false,
        deliver: false,
        wakeMode: 'now',
        sessionTarget: 'isolated',
      }

      const response = node.config?.scheduleBindingId
        ? await updateWorkflowSchedule(node.config.scheduleBindingId, payload)
        : await createWorkflowSchedule(payload)

      const saved = response.schedule
      setAccountsMessage(`Schedule ${node.config?.scheduleBindingId ? 'updated' : 'created'}: ${saved.scheduleSummary}`)
      patchSelectedNode({
        config: {
          ...node.config,
          scheduleBindingId: saved.id,
          cronJobId: saved.cronJobId,
          scheduleMode: saved.scheduleMode,
          cronExpression: saved.cronExpression ?? node.config?.cronExpression ?? '',
          every: saved.every ?? '',
          runAt: saved.runAt ?? '',
          timezone: saved.timezone,
          enabled: saved.enabled,
          scheduleSummary: saved.scheduleSummary,
        },
      })
      await refreshConnection()
    } catch (error) {
      setAccountsMessage(`Schedule save failed: ${error.message}`)
    } finally {
      setRunningSchedule(false)
    }
  }

  async function handleRunScheduleNow(node) {
    if (!node?.config?.scheduleBindingId) return
    setRunningSchedule(true)
    try {
      const response = await testWorkflowSchedule(node.config.scheduleBindingId)
      setAccountsMessage(`Schedule run queued: ${response.cronJobId}`)
      if (node.id === defaultTriggerNodeId) {
        await handleRun(node.id)
      }
    } catch (error) {
      setAccountsMessage(`Schedule run failed: ${error.message}`)
    } finally {
      setRunningSchedule(false)
    }
  }

  async function handleDeleteSchedule(node) {
    if (!node?.config?.scheduleBindingId) return
    setRunningSchedule(true)
    try {
      await deleteWorkflowSchedule(node.config.scheduleBindingId)
      setAccountsMessage('Schedule deleted.')
      patchSelectedNode({
        config: {
          ...node.config,
          scheduleBindingId: null,
          cronJobId: null,
          scheduleSummary: 'No saved schedule yet',
        },
      })
    } catch (error) {
      setAccountsMessage(`Schedule delete failed: ${error.message}`)
    } finally {
      setRunningSchedule(false)
    }
  }

  async function handleRun(triggerNodeId = defaultTriggerNodeId) {
    if (!validation.ok || !parsedWorkflow || !triggerNodeId) return
    setRunning(true)
    setRunState(null)
    goToWorkspaceTab('run')
    try {
      await runWorkflow(parsedWorkflow, (nextState) => {
        setRunState(nextState)
        rememberWorkspaceTab('run')
      }, {
        triggerNodeId,
        liveExecutors: connection.connected ? { generateStoryIdea, writeStory, editStory, saveFileToGoogleDrive } : undefined,
      })
    } finally {
      setRunning(false)
    }
  }

  async function handleSendToSocrates() {
    const text = socratesDraft.trim()
    if (!text || !parsedWorkflow) return
    setSendingToSocrates(true)
    setSocratesMessages((current) => [...current, { role: 'user', text }])
    setSocratesDraft('')
    try {
      const result = await sendToSocrates(text, parsedWorkflow, {
        activeWorkflowId,
        libraryWorkflows: workflowsRef.current,
      })
      let assistantText = result.reply || 'Socrates responded without a summary.'
      if (result.change?.type && result.change.type !== 'none') {
        const nextWorkflow = applySocratesChange(parsedWorkflow, result.change)
        persistWorkflow(nextWorkflow, { touchOpenedAt: true })
        setWorkflowText(JSON.stringify(nextWorkflow, null, 2))
        assistantText = `${assistantText}\n\nApplied ${result.change.type === 'replace_workflow' ? 'a full workflow draft' : 'a structured patch'} and saved it to your workflow library.`
      }
      setSocratesMessages((current) => [...current, { role: 'assistant', text: assistantText }])
      goToWorkspaceTab('socrates')
    } catch (error) {
      setSocratesMessages((current) => [...current, { role: 'assistant', text: `Socrates unavailable: ${error.message}` }])
    } finally {
      setSendingToSocrates(false)
    }
  }

  async function handleConnectProvider(provider) {
    setAccountsMessage('')
    goToWorkspaceTab('settings')
    if (provider === 'google') {
      try {
        const result = await connectGoogleAccount()
        const popup = window.open(result.authUrl, 'workflow-studio-google-connect', 'width=560,height=720')
        const popupBlocked = !popup || popup.closed || typeof popup.closed === 'undefined'
        setOauthStatus({ provider: 'google', status: popupBlocked ? 'popup_blocked' : 'pending', connectionId: result.connectionId, error: null, authUrl: result.authUrl })
        const startedAt = Date.now()
        while (Date.now() - startedAt < 5 * 60 * 1000) {
          const status = await getGoogleConnectionStatus(result.connectionId)
          setOauthStatus({ provider: 'google', status: status.status, connectionId: result.connectionId, error: status.error || null, authUrl: result.authUrl })
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

  return (
    <div className="app-shell phone-app-shell">
      {activeView === 'library' ? (
        <WorkflowLibraryScreen
          libraryView={libraryView}
          activeWorkflowId={activeWorkflowId}
          onOpenWorkflow={loadWorkflow}
          onNewWorkflow={handleNewWorkflow}
          query={libraryQuery}
          onQueryChange={setLibraryQuery}
          sort={librarySort}
          onSortChange={setLibrarySort}
        />
      ) : (
        <div className="mobile-canvas-screen">
          <WorkspaceHeader workflow={parsedWorkflow} validation={validation} selectedNode={selectedNode} running={running} onBackToLibrary={() => setActiveView('library')} onRun={() => handleRun(defaultTriggerNodeId)} onOpenJson={() => setJsonPanelOpen(true)} onJumpToTab={goToWorkspaceTab} />

          <div className="workspace-tabbar-shell">
            <WorkspaceTabBar activeTab={workspaceTab} selectedNodeId={selectedNodeId} onChange={goToWorkspaceTab} />
          </div>

          {parsedWorkflow ? (
            <main className="workspace-main">
              {workspaceTab === 'canvas' ? <WorkspaceCanvasScreen workflow={parsedWorkflow} selectedNode={selectedNode} selectedNodeId={selectedNodeId} onSelectNode={handleSelectNode} onOpenNodeWorkspace={() => openNodeWorkspace()} onOpenRunWorkspace={() => goToWorkspaceTab('run')} zoom={zoom} pan={pan} onPanChange={setPan} onZoomChange={setZoom} runState={runState} /> : null}
              {workspaceTab === 'node' ? <WorkspaceNodeScreen workflow={parsedWorkflow} selectedNode={selectedNode} selectedTool={selectedTool} selectedNodeId={selectedNodeId} onSelectNode={openNodeWorkspace} runState={runState} onRunTrigger={handleRun} onPatchNode={patchSelectedNode} accounts={connection.accounts || []} onConnectProvider={handleConnectProvider} onSaveSchedule={handleSaveSchedule} onRunScheduleNow={handleRunScheduleNow} onDeleteSchedule={handleDeleteSchedule} scheduleBusy={runningSchedule} /> : null}
              {workspaceTab === 'run' ? <div className="workspace-screen-stack"><div className="panel workspace-section-intro quiet-surface"><div className="section-title">Run</div></div><div className="panel"><RunPanel runState={runState} running={running} onRun={handleRun} defaultTriggerNodeId={defaultTriggerNodeId} /><div className="event-panel"><div className="section-title">Events</div><EventTimeline events={runState?.events || []} /></div></div></div> : null}
              {workspaceTab === 'socrates' ? <WorkspaceSocratesScreen connection={connection} socratesMessages={socratesMessages} socratesDraft={socratesDraft} onSocratesDraftChange={setSocratesDraft} onSendToSocrates={handleSendToSocrates} sendingToSocrates={sendingToSocrates} /> : null}
              {workspaceTab === 'settings' ? <WorkspaceSettingsScreen connection={connection} bridgeUrlDraft={bridgeUrlDraft} onBridgeUrlDraftChange={setBridgeUrlDraft} onSaveBridgeTarget={saveBridgeTarget} onResetBridgeTarget={resetBridgeTarget} onRefreshConnection={refreshConnection} refreshingConnection={refreshingConnection} oauthStatus={oauthStatus} accountsMessage={accountsMessage} onConnectProvider={handleConnectProvider} onTestAccount={handleTestAccount} onOpenJson={() => setJsonPanelOpen(true)} /> : null}
            </main>
          ) : null}
        </div>
      )}

      <BottomSheet open={nodeSheetOpen && !!selectedNode} onClose={() => { setNodeSheetOpen(false); setSelectedNodeId('') }} title={selectedNode?.label || 'Node'} subtitle={selectedTool?.title || selectedNode?.type} tall>
        {selectedNode && parsedWorkflow ? (
          <div className="workspace-screen-stack">
            <div className="panel">
              <div className="row-between workspace-footer-row">
                <div>
                  <div className="section-title">Node</div>
                </div>
                <button className="primary-button" onClick={() => openNodeWorkspace(selectedNode.id)}>Edit</button>
              </div>
            </div>
            <NodeDetailPanel node={selectedNode} tool={selectedTool} workflow={parsedWorkflow} runState={runState} onRunTrigger={handleRun} onPatchNode={patchSelectedNode} accounts={connection.accounts || []} onConnectProvider={handleConnectProvider} onSaveSchedule={handleSaveSchedule} onRunScheduleNow={handleRunScheduleNow} onDeleteSchedule={handleDeleteSchedule} scheduleBusy={runningSchedule} />
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet open={jsonPanelOpen} onClose={() => setJsonPanelOpen(false)} title="JSON" subtitle={validation.ok ? 'Valid' : 'Issues'} tall>
        <div className="json-panel-content">
          <textarea className="json-editor large" value={workflowText} onChange={(event) => setWorkflowText(event.target.value)} spellCheck="false" />
          {!validation.ok ? <div className="validation-list">{validation.errors.map((issue) => <div key={`${issue.path}-${issue.message}`} className="validation-item error">{issue.path}: {issue.message}</div>)}</div> : null}
          {validation.warnings.length > 0 ? <div className="validation-list">{validation.warnings.map((issue) => <div key={`${issue.path}-${issue.message}`} className="validation-item warning">{issue.path}: {issue.message}</div>)}</div> : null}
        </div>
      </BottomSheet>
    </div>
  )
}

export default App
