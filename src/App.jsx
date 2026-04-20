import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { validateWorkflow } from './lib/schema'
import { runWorkflow } from './lib/runtime'
import { getInitialWorkflows, loadLocalConnectionState } from './lib/liveWorkflow'
import { generateStoryIdea } from './lib/openclaw'
import { sendToSocrates } from './lib/socrates'
import { createBlankWorkflow } from './lib/newWorkflow'

const initialWorkflows = getInitialWorkflows()
const NODE_WIDTH = 180
const NODE_HEIGHT = 92
const GRID_X = 220
const GRID_Y = 132
const PADDING_X = 40
const PADDING_Y = 40

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

function GraphView({ workflow, selectedNodeId, onSelectNode }) {
  const size = getCanvasSize(workflow)
  const nodeMap = new Map(workflow.nodes.map((node) => [node.id, node]))

  return (
    <div className="diagram-wrap">
      <div className="diagram-explainer">
        <span className="pill">left → right</span>
        <span className="muted">Each step passes work forward. Paths can split, rejoin, continue, or end.</span>
      </div>
      <div className="diagram-surface" style={{ width: size.width, height: size.height }}>
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
          return (
            <button
              key={node.id}
              className={`diagram-node ${selectedNodeId === node.id ? 'selected' : ''} ${node.type}`}
              style={{ left: position.left, top: position.top, width: NODE_WIDTH, height: NODE_HEIGHT }}
              onClick={() => onSelectNode(node.id)}
            >
              <div className="node-type">{node.type}</div>
              <div className="node-label">{node.label}</div>
              <div className="node-id">{node.id}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EdgeList({ workflow }) {
  return (
    <div className="panel-section">
      <div className="section-title">Paths</div>
      <div className="edge-list">
        {workflow.edges.map((edge) => (
          <div key={edge.id} className="edge-item">
            <span>{edge.from}</span>
            <span>→</span>
            <span>{edge.to}</span>
            {edge.condition ? <code>{edge.condition}</code> : null}
          </div>
        ))}
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

function NodeInspector({ node, value, onChange, onTrigger, canTrigger, triggerLabel }) {
  if (!node) {
    return (
      <div className="panel-section">
        <div className="section-title">Step Details</div>
        <div className="muted">Select a step to review or edit its details.</div>
      </div>
    )
  }

  return (
    <div className="panel-section grow">
      <div className="section-title">Step Details</div>
      <div className="inspector-meta">
        <span className="pill">{node.type}</span>
        <span>{node.label}</span>
      </div>
      {canTrigger ? (
        <div className="trigger-panel">
          <div className="muted">This workflow starts from this trigger.</div>
          <button className="primary-button" onClick={() => onTrigger(node.id)}>{triggerLabel}</button>
        </div>
      ) : null}
      <textarea className="json-editor" value={value} onChange={(event) => onChange(event.target.value)} spellCheck="false" />
    </div>
  )
}

function RunPanel({ runState, running, onRun, defaultTriggerNodeId }) {
  return (
    <div className="panel-section grow">
      <div className="section-title row-between">
        <span>Activity</span>
        <button className="primary-button" onClick={() => onRun(defaultTriggerNodeId)} disabled={running}>
          {running ? 'Running…' : 'Run workflow'}
        </button>
      </div>
      <div className="muted">Run the flow and watch each step complete.</div>
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
      {runState?.nodeOutputs?.['save-to-drive']?.result?.editedText ? (
        <div className="story-preview">
          <div className="section-title">Latest Story Output</div>
          <pre>{runState.nodeOutputs['save-to-drive'].result.editedText}</pre>
        </div>
      ) : null}
    </div>
  )
}

function ConnectionPanel({ connection, refreshing, onRefresh }) {
  const status = connection.connected ? 'Connected to local OpenClaw' : 'Local connection unavailable'
  const detail = connection.connected
    ? connection.status?.status?.raw || 'Local bridge reachable.'
    : connection.error || 'Using built-in sample data.'

  return (
    <div className="panel-section">
      <div className="section-title row-between">
        <span>Local Connection</span>
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
    </div>
  )
}

function SocratesPanel({ connection, workflowText, messages, draftMessage, onDraftChange, onSend, sending }) {
  return (
    <div className="panel socrates-panel">
      <div className="section-title row-between">
        <span>Socrates</span>
        <span className="pill">authoring chat</span>
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
        <span className="muted small-copy">{connection.connected ? 'Uses local Socrates session' : 'Bridge required for live Socrates chat'}</span>
        <button className="primary-button" disabled={sending || !connection.connected || !draftMessage.trim()} onClick={() => onSend(workflowText)}>
          {sending ? 'Sending…' : 'Send to Socrates'}
        </button>
      </div>
    </div>
  )
}

function App() {
  const [workflows, setWorkflows] = useState(initialWorkflows)
  const [workflowIndex, setWorkflowIndex] = useState(0)
  const [workflowText, setWorkflowText] = useState(JSON.stringify(initialWorkflows[0], null, 2))
  const [selectedNodeId, setSelectedNodeId] = useState(initialWorkflows[0].nodes[0]?.id)
  const [nodeEditorText, setNodeEditorText] = useState(JSON.stringify(initialWorkflows[0].nodes[0], null, 2))
  const [runState, setRunState] = useState(null)
  const [running, setRunning] = useState(false)
  const [connection, setConnection] = useState({ connected: false, bridgeUrl: 'http://127.0.0.1:4318' })
  const [refreshingConnection, setRefreshingConnection] = useState(false)
  const [socratesMessages, setSocratesMessages] = useState([])
  const [socratesDraft, setSocratesDraft] = useState('')
  const [sendingToSocrates, setSendingToSocrates] = useState(false)

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
    return validateWorkflow(parsedWorkflow)
  }, [parsedWorkflow, parseErrorText])

  const selectedNode = parsedWorkflow?.nodes?.find((node) => node.id === selectedNodeId)
  const defaultTriggerNodeId = parsedWorkflow?.entryNodeId ?? parsedWorkflow?.nodes?.find((node) => node.type === 'trigger')?.id
  const canTriggerSelectedNode = selectedNode?.type === 'trigger' && selectedNode?.id === defaultTriggerNodeId

  useEffect(() => {
    if (!selectedNodeId && parsedWorkflow?.nodes?.[0]?.id) {
      setSelectedNodeId(parsedWorkflow.nodes[0].id)
      setNodeEditorText(JSON.stringify(parsedWorkflow.nodes[0], null, 2))
      return
    }

    if (selectedNode) {
      setNodeEditorText(JSON.stringify(selectedNode, null, 2))
    }
  }, [parsedWorkflow, selectedNode, selectedNodeId])

  useEffect(() => {
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

  function loadWorkflow(index) {
    const workflow = workflows[index]
    setWorkflowIndex(index)
    setWorkflowText(JSON.stringify(workflow, null, 2))
    setSelectedNodeId(workflow.nodes[0]?.id)
    setNodeEditorText(JSON.stringify(workflow.nodes[0], null, 2))
    setRunState(null)
    setSocratesMessages([])
  }

  function handleNewWorkflow() {
    const nextWorkflow = createBlankWorkflow()
    setWorkflows((current) => [...current, nextWorkflow])
    const nextIndex = workflows.length
    setWorkflowIndex(nextIndex)
    setWorkflowText(JSON.stringify(nextWorkflow, null, 2))
    setSelectedNodeId(nextWorkflow.nodes[0]?.id)
    setNodeEditorText(JSON.stringify(nextWorkflow.nodes[0], null, 2))
    setRunState(null)
    setSocratesMessages([
      {
        role: 'assistant',
        text: 'New workflow created. Ask Socrates to shape the first real version.',
      },
    ])
  }

  function handleSelectNode(nodeId) {
    setSelectedNodeId(nodeId)
    const node = parsedWorkflow?.nodes?.find((item) => item.id === nodeId)
    setNodeEditorText(node ? JSON.stringify(node, null, 2) : '')
  }

  function applyNodeEditor() {
    if (!parsedWorkflow || !selectedNodeId) return
    try {
      const parsedNode = JSON.parse(nodeEditorText)
      const nextWorkflow = {
        ...parsedWorkflow,
        nodes: parsedWorkflow.nodes.map((node) => (node.id === selectedNodeId ? parsedNode : node)),
      }
      setWorkflowText(JSON.stringify(nextWorkflow, null, 2))
      setSelectedNodeId(parsedNode.id)
    } catch (error) {
      console.error(error)
    }
  }

  async function handleRun(triggerNodeId = defaultTriggerNodeId) {
    if (!validation.ok || !parsedWorkflow || !triggerNodeId) return
    setRunning(true)
    setRunState(null)
    try {
      await runWorkflow(parsedWorkflow, (nextState) => setRunState(nextState), {
        triggerNodeId,
        liveExecutors: connection.connected
          ? {
              generateStoryIdea,
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Workflow Studio</h1>
          <p>Design, review, and run connected workflows.</p>
        </div>
        <div className="topbar-actions topbar-action-row">
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
        </div>
      </header>

      <main className="layout app-layout-with-chat">
        <section className="left-column">
          <div className="panel hero-panel">
            <div className="hero-header row-between">
              <div>
                <h2>{parsedWorkflow?.name ?? 'Invalid workflow'}</h2>
                <p>{parsedWorkflow?.description ?? 'Fix JSON to continue.'}</p>
              </div>
              <div className="hero-pills">
                <span className="pill">{parsedWorkflow?.appId ?? 'unknown-app'}</span>
                <span className="pill">v{parsedWorkflow?.version ?? '—'}</span>
              </div>
            </div>
            <ConnectionPanel connection={connection} refreshing={refreshingConnection} onRefresh={refreshConnection} />
            <ValidationPanel validation={validation} />
          </div>

          <div className="panel">
            <div className="section-title">Workflow</div>
            {parsedWorkflow ? <GraphView workflow={parsedWorkflow} selectedNodeId={selectedNodeId} onSelectNode={handleSelectNode} /> : null}
          </div>

          <SocratesPanel
            connection={connection}
            workflowText={workflowText}
            messages={socratesMessages}
            draftMessage={socratesDraft}
            onDraftChange={setSocratesDraft}
            onSend={handleSendToSocrates}
            sending={sendingToSocrates}
          />

          <div className="panel two-up">
            {parsedWorkflow ? <EdgeList workflow={parsedWorkflow} /> : null}
            {parsedWorkflow ? <ToolList workflow={parsedWorkflow} /> : null}
          </div>
        </section>

        <aside className="right-column">
          <div className="panel workflow-editor-panel">
            <div className="section-title">Workflow Data</div>
            <textarea className="json-editor large" value={workflowText} onChange={(event) => setWorkflowText(event.target.value)} spellCheck="false" />
          </div>

          <div className="panel inspector-panel">
            <NodeInspector
              node={selectedNode}
              value={nodeEditorText}
              onChange={setNodeEditorText}
              onTrigger={handleRun}
              canTrigger={canTriggerSelectedNode}
              triggerLabel={selectedNode?.config?.triggerLabel ?? 'Start workflow'}
            />
            <button className="secondary-button" onClick={applyNodeEditor}>Apply node edit</button>
          </div>

          <div className="panel">
            <RunPanel runState={runState} running={running} onRun={handleRun} defaultTriggerNodeId={defaultTriggerNodeId} />
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
