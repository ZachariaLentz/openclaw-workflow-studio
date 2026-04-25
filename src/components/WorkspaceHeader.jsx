export function WorkspaceHeader({ workflow, validation, selectedNode, running, onRun, onOpenJson, onJumpToTab }) {
  return (
    <header className="phone-topbar sticky-workspace-header">
      <div className="workspace-header-primary">
        <div className="phone-topbar-center">
          <div className="phone-topbar-title">{workflow?.name ?? 'Workflow'}</div>
          <div className="muted small-copy">{workflow?.appId ?? 'unknown app'}</div>
        </div>
      </div>

      <div className="workspace-header-summary panel premium-summary-card">
        <div className="workflow-phone-card-top row-between">
          <div className="section-title header-title-row">Workspace</div>
          <div className="hero-pills">
            <span className={`pill ${validation.ok ? 'status-healthy' : 'status-risk'}`}>{validation.ok ? 'Valid draft' : `${validation.errors.length} issue${validation.errors.length === 1 ? '' : 's'}`}</span>
            <span className="pill">{workflow?.nodes?.length || 0} nodes</span>
            <span className="pill">{workflow?.edges?.length || 0} edges</span>
            {selectedNode ? <span className="pill">{selectedNode.label}</span> : null}
          </div>
        </div>
        <div className="workspace-quick-actions workspace-primary-actions">
          <button className="primary-button hero-action" onClick={onRun} disabled={running || !validation.ok}>{running ? 'Running…' : 'Run'}</button>
          <button className="secondary-button" onClick={() => onJumpToTab('node')}>{selectedNode ? 'Edit node' : 'Nodes'}</button>
          <button className="secondary-button" onClick={onOpenJson}>JSON</button>
        </div>
        <div className="workspace-secondary-links">
          <button className="tertiary-button" onClick={() => onJumpToTab('settings')}>Settings</button>
        </div>
      </div>
    </header>
  )
}
