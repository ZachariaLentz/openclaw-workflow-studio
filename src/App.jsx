import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { sampleWorkflows } from './data/workflows'
import { validateWorkflow } from './lib/schema'
import { runWorkflow } from './lib/runtime'

function GraphView({ workflow, selectedNodeId, onSelectNode }) {
  return (
    <div className="graph-grid">
      {workflow.nodes.map((node) => (
        <button
          key={node.id}
          className={`node-card ${selectedNodeId === node.id ? 'selected' : ''}`}
          onClick={() => onSelectNode(node.id)}
        >
          <div className="node-type">{node.type}</div>
          <div className="node-label">{node.label}</div>
          <div className="node-id">{node.id}</div>
        </button>
      ))}
    </div>
  )
}

function EdgeList({ workflow }) {
  return (
    <div className="panel-section">
      <div className="section-title">Edges</div>
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
      <div className="section-title">Validation</div>
      {validation.ok ? <div className="success">Workflow schema valid.</div> : null}
      {!validation.ok ? (
        <div className="error-list">
          {validation.errors.map((error, index) => (
            <div key={`${error.path}-${index}`} className="error-item">
              <strong>{error.path || 'workflow'}</strong>
              <span>{error.message}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function NodeInspector({ node, value, onChange }) {
  if (!node) {
    return (
      <div className="panel-section">
        <div className="section-title">Node Inspector</div>
        <div className="muted">Select a node to inspect/edit its JSON.</div>
      </div>
    )
  }

  return (
    <div className="panel-section grow">
      <div className="section-title">Node Inspector</div>
      <div className="inspector-meta">
        <span className="pill">{node.type}</span>
        <span>{node.label}</span>
      </div>
      <textarea className="json-editor" value={value} onChange={(event) => onChange(event.target.value)} spellCheck="false" />
    </div>
  )
}

function RunPanel({ runState, running, onRun }) {
  return (
    <div className="panel-section grow">
      <div className="section-title row-between">
        <span>Runtime</span>
        <button className="primary-button" onClick={onRun} disabled={running}>
          {running ? 'Running…' : 'Run workflow'}
        </button>
      </div>
      <div className="muted">Local MVP runtime simulator.</div>
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
  )
}

function App() {
  const [workflowIndex, setWorkflowIndex] = useState(0)
  const [workflowText, setWorkflowText] = useState(JSON.stringify(sampleWorkflows[0], null, 2))
  const [selectedNodeId, setSelectedNodeId] = useState(sampleWorkflows[0].nodes[0]?.id)
  const [nodeEditorText, setNodeEditorText] = useState(JSON.stringify(sampleWorkflows[0].nodes[0], null, 2))
  const [runState, setRunState] = useState(null)
  const [running, setRunning] = useState(false)
  const [parseError, setParseError] = useState('')

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

  function loadWorkflow(index) {
    const workflow = sampleWorkflows[index]
    setWorkflowIndex(index)
    setWorkflowText(JSON.stringify(workflow, null, 2))
    setSelectedNodeId(workflow.nodes[0]?.id)
    setNodeEditorText(JSON.stringify(workflow.nodes[0], null, 2))
    setRunState(null)
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

  async function handleRun() {
    if (!validation.ok || !parsedWorkflow) return
    setRunning(true)
    setRunState(null)
    try {
      await runWorkflow(parsedWorkflow, (nextState) => setRunState(nextState))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>OpenClaw Workflow Studio</h1>
          <p>Chat-authored workflow cockpit for OpenClaw-native apps.</p>
        </div>
        <div className="topbar-actions">
          <label>
            Example
            <select value={workflowIndex} onChange={(event) => loadWorkflow(Number(event.target.value))}>
              {sampleWorkflows.map((workflow, index) => (
                <option key={workflow.id} value={index}>
                  {workflow.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <main className="layout">
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
            <ValidationPanel validation={validation} />
          </div>

          <div className="panel">
            <div className="section-title">Workflow Graph</div>
            {parsedWorkflow ? <GraphView workflow={parsedWorkflow} selectedNodeId={selectedNodeId} onSelectNode={handleSelectNode} /> : null}
          </div>

          <div className="panel two-up">
            {parsedWorkflow ? <EdgeList workflow={parsedWorkflow} /> : null}
            {parsedWorkflow ? <ToolList workflow={parsedWorkflow} /> : null}
          </div>
        </section>

        <aside className="right-column">
          <div className="panel workflow-editor-panel">
            <div className="section-title">Canonical Workflow JSON</div>
            <textarea className="json-editor large" value={workflowText} onChange={(event) => setWorkflowText(event.target.value)} spellCheck="false" />
          </div>

          <div className="panel inspector-panel">
            <NodeInspector node={selectedNode} value={nodeEditorText} onChange={setNodeEditorText} />
            <button className="secondary-button" onClick={applyNodeEditor}>Apply node edit</button>
          </div>

          <div className="panel">
            <RunPanel runState={runState} running={running} onRun={handleRun} />
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
