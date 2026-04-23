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

export function WorkflowLibraryScreen({ libraryView, activeWorkflowId, onOpenWorkflow, onNewWorkflow, query, onQueryChange, sort, onSortChange }) {
  return (
    <div className="workflow-library-screen">
      <div className="hero-phone-card">
        <div className="eyebrow">Workflow Studio</div>
        <h1>Workflows</h1>
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
          <div className="section-title">No workflows found</div>
        </div>
      ) : null}
    </div>
  )
}
