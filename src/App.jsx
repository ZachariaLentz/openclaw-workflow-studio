import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { validateWorkflow } from './lib/schema'
import { runWorkflow } from './lib/runtime'
import { loadLocalConnectionState } from './lib/liveWorkflow'
import { editStory, generateStoryIdea, saveFileToGoogleDrive, writeStory } from './lib/openclaw'
import { sendToSocrates } from './lib/socrates'
import { applySocratesChange } from './lib/socratesProtocol'
import { createBlankWorkflow } from './lib/newWorkflow'
import { connectGoogleAccount, connectProvider, getGoogleConnectionStatus, testAccount } from './lib/bridge'
import { getCompatibleAccounts, getToolRequirements } from './lib/accounts'
import { clearBridgeUrl, getDefaultBridgeUrl, getSavedBridgeUrl, saveBridgeUrl } from './lib/bridgeConfig'
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

function formatRelativeTime(value) {
  if (!value) return 'Never'
  const diff = new Date(value).getTime() - Date.now()
  const minutes = Math.round(diff / 60000)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour')
  const days = Math.round(hours / 24)
  return formatter.format(days, 'day')
}

function BottomSheet({ open, title, subtitle, onClose, children, tall = false }) {
  return (
    <div className={`sheet-shell ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className={`sheet-panel ${tall ? 'tall' : ''}`}>
        <div className="sheet-handle" />
        <div className="sheet-header row-between">
          <div>
            <div className="sheet-title">{title}</div>
            {subtitle ? <div className="muted small-copy">{subtitle}</div> : null}
          </div>
          <button className="secondary-button" onClick={onClose}>Close</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

function WorkflowLibraryScreen({ libraryView, activeWorkflowId, onOpenWorkflow, onNewWorkflow, query, onQueryChange, sort, onSortChange }) {
  return (
    <div className="workflow-library-screen">
      <div className="hero-phone-card">
        <div className="eyebrow">Workflow Studio</div>
        <h1>Organize every saved workflow before you drop into the canvas.</h1>
        <p>Search, sort, and reopen drafts instantly. Every valid edit persists locally, and Socrates can save updates straight into the library.</p>
      </div>

      <div className="library-toolbar panel">
        <div className="library-toolbar-row">
          <label className="field-label">
            Search workflows
            <input
              className="text-input"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Name, app, tag, or node label"
            />
          </label>
          <label className="field-label">
            Sort
            <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
              <option value="updated">Recently updated</option>
              <option value="opened">Recently opened</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
        <div className="library-toolbar-row">
          <div className="hero-pills">
            <span className="pill">{libraryView.stats.totalWorkflows} saved</span>
            <span className="pill">{libraryView.stats.visibleWorkflows} visible</span>
            <span className="pill">{libraryView.stats.totalNodes} total nodes</span>
            <span className="pill">{libraryView.stats.uniqueTagCount} tags</span>
          </div>
          <button className="primary-button" onClick={onNewWorkflow}>New workflow</button>
        </div>
      </div>

      <div className="workflow-phone-list">
        {libraryView.items.map((workflow) => (
          <button
            key={workflow.id}
            className={`workflow-phone-card workflow-library-card ${activeWorkflowId === workflow.id ? 'selected' : ''}`}
            onClick={() => onOpenWorkflow(workflow.id)}
          >
            <div className="workflow-phone-card-top row-between">
              <span className="pill">{workflow.appId}</span>
              <span className="muted small-copy">v{workflow.version}</span>
            </div>
            <div className="workflow-phone-title">{workflow.name}</div>
            <div className="muted small-copy">{workflow.description}</div>
            <div className="workflow-card-meta">
              <span>{workflow.nodes.length} nodes</span>
              <span>{workflow.edges.length} edges</span>
              <span>Updated {formatRelativeTime(workflow.metadata?.library?.updatedAt)}</span>
            </div>
            <div className="workflow-card-meta">
              <span>Opened {formatRelativeTime(workflow.metadata?.library?.lastOpenedAt)}</span>
              <span>{workflow.tags?.slice(0, 3).join(' · ') || 'No tags yet'}</span>
            </div>
          </button>
        ))}
      </div>

      {libraryView.items.length === 0 ? (
        <div className="panel empty-library-state">
          <div className="section-title">No matching workflows</div>
          <div className="muted">Try a broader search or create a new workflow draft.</div>
        </div>
      ) : null}
    </div>
  )
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

  function handleWheel(event) {
    event.preventDefault()
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
    onZoomChange(nextZoom)
    onPanChange({ x: pointerX - worldX * nextZoom, y: pointerY - worldY * nextZoom })
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
  }, [zoom, pan])

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

function NodeDetailPanel({ node, tool, workflow, runState, onRunTrigger, onPatchNode, accounts, onConnectProvider }) {
  if (!node) return null
  const incomingEdges = workflow.edges.filter((edge) => edge.to === node.id)
  const outgoingEdges = workflow.edges.filter((edge) => edge.from === node.id)
  const latestOutput = runState?.nodeOutputs?.[node.id]
  const latestStatus = runState?.nodeStatus?.[node.id] || 'idle'
  const requirements = getToolRequirements(node.toolId)
  const compatibleAccounts = getCompatibleAccounts(accounts, node.toolId)
  const latestEvent = [...(runState?.events || [])].reverse().find((event) => event.nodeId === node.id)
  const latestInputNodeId = incomingEdges[incomingEdges.length - 1]?.from
  const latestInput = latestInputNodeId ? runState?.nodeOutputs?.[latestInputNodeId] : null
  const canTrigger = node.type === 'trigger' && workflow.entryNodeId === node.id

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
          <div>
            <strong>Run from this node</strong>
            <div className="muted small-copy">Trigger directly from the inspector.</div>
          </div>
          <button className="primary-button" onClick={() => onRunTrigger(node.id)}>{node.config?.triggerLabel ?? 'Start workflow'}</button>
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
          {node.config?.destination !== undefined ? <label className="field-label">Destination<input className="text-input" value={node.config?.destination ?? ''} onChange={(event) => onPatchNode({ config: { ...node.config, destination: event.target.value } })} /></label> : null}
          {node.config?.fileNameTemplate !== undefined ? <label className="field-label">File Name Template<input className="text-input" value={node.config?.fileNameTemplate ?? ''} onChange={(event) => onPatchNode({ config: { ...node.config, fileNameTemplate: event.target.value } })} /></label> : null}
          {node.config?.triggerLabel !== undefined ? <label className="field-label">Trigger Label<input className="text-input" value={node.config?.triggerLabel ?? ''} onChange={(event) => onPatchNode({ config: { ...node.config, triggerLabel: event.target.value } })} /></label> : null}
          {node.config?.runtimeTarget !== undefined ? <label className="field-label">Runtime Target<input className="text-input" value={node.config?.runtimeTarget ?? ''} onChange={(event) => onPatchNode({ config: { ...node.config, runtimeTarget: event.target.value } })} /></label> : null}
        </div>
      </div>

      {requirements?.provider === 'google' ? (
        <div className="node-info-card">
          <div className="section-title">Connected Account</div>
          {compatibleAccounts.length === 0 ? <div className="account-callout"><div className="muted">This node needs a Google account with Drive access.</div><button className="secondary-button" onClick={() => onConnectProvider('google')}>Connect Google account</button></div> : null}
          <label className="field-label">Account
            <select value={node.config?.accountId ?? ''} onChange={(event) => onPatchNode({ config: { ...node.config, accountId: event.target.value } })}>
              <option value="">Select a connected Google account</option>
              {compatibleAccounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}
            </select>
          </label>
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

function RunPanel({ runState, running, onRun, defaultTriggerNodeId }) {
  const downloadOutput = runState?.nodeOutputs?.['download-file']
  const storyOutput = runState?.nodeOutputs?.['prompt-edit-story'] || runState?.nodeOutputs?.['prompt-write-story']
  const failureEvent = runState?.events?.findLast?.((event) => event.type === 'node-failed' || event.type === 'error')

  return (
    <div className="run-activity-panel mobile-run-panel">
      <div className="section-title row-between">
        <span>Run Activity</span>
        <button className="primary-button" onClick={() => onRun(defaultTriggerNodeId)} disabled={running}>{running ? 'Running…' : 'Run workflow'}</button>
      </div>
      {failureEvent ? <div className="run-result-card failure-surface"><div><strong>Run failed</strong><div className="muted small-copy">{failureEvent.message || 'Unknown workflow error'}</div></div></div> : null}
      {downloadOutput?.downloadUrl ? <div className="run-result-card success-surface"><div><strong>Your story is ready</strong><div className="muted small-copy">{downloadOutput.fileName}</div></div><a className="primary-button inline-button" href={downloadOutput.downloadUrl} download={downloadOutput.fileName}>Download story</a></div> : null}
      {storyOutput?.editedText || storyOutput?.storyText ? <div className="story-preview"><div className="section-title">Story Preview</div><pre>{storyOutput.editedText || storyOutput.storyText}</pre></div> : null}
      <div className="run-status-grid">
        {runState ? Object.entries(runState.nodeStatus).map(([nodeId, status]) => <div key={nodeId} className={`status-item status-${status}`}><span>{nodeId}</span><strong>{status}</strong></div>) : <div className="muted">No run yet.</div>}
      </div>
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
  const [connection, setConnection] = useState({ connected: false, bridgeUrl: 'http://127.0.0.1:4318', providers: [], accounts: [] })
  const [refreshingConnection, setRefreshingConnection] = useState(false)
  const [socratesMessages, setSocratesMessages] = useState([])
  const [socratesDraft, setSocratesDraft] = useState('')
  const [sendingToSocrates, setSendingToSocrates] = useState(false)
  const [socratesOpen, setSocratesOpen] = useState(false)
  const [jsonPanelOpen, setJsonPanelOpen] = useState(false)
  const [nodeSheetOpen, setNodeSheetOpen] = useState(false)
  const [runSheetOpen, setRunSheetOpen] = useState(false)
  const [menuSheetOpen, setMenuSheetOpen] = useState(false)
  const [accountsSheetOpen, setAccountsSheetOpen] = useState(false)
  const [oauthStatus, setOauthStatus] = useState(null)
  const [accountsMessage, setAccountsMessage] = useState('')
  const [bridgeUrlDraft, setBridgeUrlDraft] = useState(getSavedBridgeUrl())
  const [libraryQuery, setLibraryQuery] = useState('')
  const [librarySort, setLibrarySort] = useState('updated')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 40, y: 24 })
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
    setActiveView('canvas')
  }

  function handleNewWorkflow() {
    const nextWorkflow = createBlankWorkflow()
    const savedWorkflow = persistWorkflow(nextWorkflow, { touchOpenedAt: true })
    if (!savedWorkflow) return
    setWorkflowText(JSON.stringify(savedWorkflow, null, 2))
    setSelectedNodeId('')
    setRunState(null)
    setSocratesMessages([{ role: 'assistant', text: 'New workflow created and saved locally. Ask Socrates to return a structured draft or patch.' }])
    setSocratesOpen(true)
    setJsonPanelOpen(false)
    resetCanvasState(setZoom, setPan)
    setActiveView('canvas')
  }

  function handleSelectNode(nodeId) {
    setSelectedNodeId(nodeId)
    setNodeSheetOpen(true)
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

  async function handleRun(triggerNodeId = defaultTriggerNodeId) {
    if (!validation.ok || !parsedWorkflow || !triggerNodeId) return
    setRunning(true)
    setRunState(null)
    setRunSheetOpen(true)
    try {
      await runWorkflow(parsedWorkflow, (nextState) => {
        setRunState(nextState)
        setRunSheetOpen(true)
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
    } catch (error) {
      setSocratesMessages((current) => [...current, { role: 'assistant', text: `Socrates unavailable: ${error.message}` }])
    } finally {
      setSendingToSocrates(false)
    }
  }

  async function handleConnectProvider(provider) {
    setAccountsMessage('')
    setAccountsSheetOpen(true)
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
          <header className="phone-topbar">
            <button className="secondary-button" onClick={() => setActiveView('library')}>Library</button>
            <div className="phone-topbar-center">
              <div className="phone-topbar-title">{parsedWorkflow?.name ?? 'Workflow'}</div>
              <div className="muted small-copy">{parsedWorkflow?.appId ?? 'unknown app'} · saved locally</div>
            </div>
            <div className="phone-topbar-actions">
              <button className="primary-button" onClick={() => handleRun(defaultTriggerNodeId)} disabled={running || !defaultTriggerNodeId || !validation.ok}>{running ? 'Running…' : 'Run'}</button>
              <button className="secondary-button" onClick={() => setMenuSheetOpen(true)}>Menu</button>
            </div>
          </header>

          {parsedWorkflow ? <GraphView workflow={parsedWorkflow} selectedNodeId={selectedNodeId} onSelectNode={handleSelectNode} zoom={zoom} pan={pan} onPanChange={setPan} onZoomChange={setZoom} /> : null}
        </div>
      )}

      <BottomSheet open={nodeSheetOpen && !!selectedNode} onClose={() => { setNodeSheetOpen(false); setSelectedNodeId('') }} title={selectedNode?.label || 'Node'} subtitle={selectedTool?.title || selectedNode?.type} tall>
        {selectedNode && parsedWorkflow ? <NodeDetailPanel node={selectedNode} tool={selectedTool} workflow={parsedWorkflow} runState={runState} onRunTrigger={handleRun} onPatchNode={patchSelectedNode} accounts={connection.accounts || []} onConnectProvider={handleConnectProvider} /> : null}
      </BottomSheet>

      <BottomSheet open={runSheetOpen} onClose={() => setRunSheetOpen(false)} title="Run Activity" subtitle="Execution results and outputs" tall>
        <RunPanel runState={runState} running={running} onRun={handleRun} defaultTriggerNodeId={defaultTriggerNodeId} />
      </BottomSheet>

      <BottomSheet open={menuSheetOpen} onClose={() => setMenuSheetOpen(false)} title="Workflow Menu" subtitle="Everything secondary lives here">
        <div className="menu-sheet-list">
          <button className="workflow-phone-card" onClick={() => { setRunSheetOpen(true); setMenuSheetOpen(false) }}>Open run activity</button>
          <button className="workflow-phone-card" onClick={() => { setSocratesOpen(true); setMenuSheetOpen(false) }}>Open Socrates</button>
          <button className="workflow-phone-card" onClick={() => { setJsonPanelOpen(true); setMenuSheetOpen(false) }}>Open workflow JSON</button>
          <button className="workflow-phone-card" onClick={() => { setAccountsSheetOpen(true); setMenuSheetOpen(false) }}>Accounts & bridge</button>
          <button className="workflow-phone-card" onClick={() => { resetCanvasState(setZoom, setPan); setMenuSheetOpen(false) }}>Reset canvas view</button>
        </div>
      </BottomSheet>

      <BottomSheet open={accountsSheetOpen} onClose={() => setAccountsSheetOpen(false)} title="Accounts & Bridge" subtitle={connection.connected ? 'Connected to bridge' : 'Bridge unavailable'} tall>
        <div className="panel-section compact-panel-section">
          <div className={connection.connected ? 'success' : 'muted'}>{connection.connected ? 'Connected to bridge' : 'Bridge unavailable'}</div>
          <div className="muted connection-copy">{connection.connected ? 'Workflow Studio can reach your Mac bridge.' : connection.error || 'Using built-in sample data.'}</div>
          <div className="hero-pills connection-pills">
            <span className="pill">{connection.bridgeUrl || 'bridge unknown'}</span>
            {connection.connected ? <span className="pill">live bridge</span> : <span className="pill">sample mode</span>}
          </div>
          <label className="field-label">Workflow Studio bridge target<input className="text-input" value={bridgeUrlDraft} onChange={(event) => setBridgeUrlDraft(event.target.value)} /></label>
          <div className="provider-actions">
            <button className="primary-button" onClick={saveBridgeTarget}>Save bridge URL</button>
            <button className="secondary-button" onClick={resetBridgeTarget}>Reset to default</button>
            <button className="secondary-button" onClick={refreshConnection} disabled={refreshingConnection}>{refreshingConnection ? 'Refreshing…' : 'Refresh'}</button>
          </div>
        </div>
        <AccountsPanel providers={connection.providers || []} accounts={connection.accounts || []} onRefresh={refreshConnection} onConnect={handleConnectProvider} onTest={handleTestAccount} refreshing={refreshingConnection} oauthStatus={oauthStatus} accountsMessage={accountsMessage} />
      </BottomSheet>

      <BottomSheet open={jsonPanelOpen} onClose={() => setJsonPanelOpen(false)} title="Workflow JSON" subtitle={validation.ok ? 'Valid workflow' : 'Validation issues present'} tall>
        <div className="json-panel-content">
          <textarea className="json-editor large" value={workflowText} onChange={(event) => setWorkflowText(event.target.value)} spellCheck="false" />
          {!validation.ok ? <div className="validation-list">{validation.errors.map((issue) => <div key={`${issue.path}-${issue.message}`} className="validation-item error">{issue.path}: {issue.message}</div>)}</div> : null}
          {validation.warnings.length > 0 ? <div className="validation-list">{validation.warnings.map((issue) => <div key={`${issue.path}-${issue.message}`} className="validation-item warning">{issue.path}: {issue.message}</div>)}</div> : null}
        </div>
      </BottomSheet>

      <BottomSheet open={socratesOpen} onClose={() => setSocratesOpen(false)} title="Socrates" subtitle={connection.connected ? 'Structured authoring via reachable bridge' : 'Bridge required for live Socrates chat'} tall>
        <div className="socrates-panel">
          <div className="chat-log">
            {socratesMessages.length === 0 ? <div className="muted">Ask Socrates to help create or improve this workflow. Valid drafts or patches are applied and saved automatically.</div> : null}
            {socratesMessages.map((item, index) => <div key={`${item.role}-${index}`} className={`chat-bubble ${item.role}`}><strong>{item.role === 'user' ? 'You' : 'Socrates'}</strong><div>{item.text}</div></div>)}
          </div>
          <textarea className="chat-input" value={socratesDraft} onChange={(event) => setSocratesDraft(event.target.value)} placeholder="Ask Socrates to create a workflow, add nodes, rename steps, or patch the current draft." spellCheck="false" />
          <div className="row-between"><span className="muted small-copy">{connection.connected ? 'Uses reachable Mac bridge' : 'Bridge required for live Socrates chat'}</span><button className="primary-button" disabled={sendingToSocrates || !connection.connected || !socratesDraft.trim() || !parsedWorkflow} onClick={handleSendToSocrates}>{sendingToSocrates ? 'Sending…' : 'Send to Socrates'}</button></div>
        </div>
      </BottomSheet>
    </div>
  )
}

export default App
