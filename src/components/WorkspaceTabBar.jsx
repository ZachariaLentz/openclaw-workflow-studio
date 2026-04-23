export function WorkspaceTabBar({ activeTab, selectedNodeId, onChange }) {
  const primaryTabs = [
    { id: 'canvas', label: 'Canvas' },
    { id: 'node', label: selectedNodeId ? 'Node' : 'Nodes' },
    { id: 'run', label: 'Run' },
  ]

  const utilityTabs = [
    { id: 'socrates', label: 'Socrates' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="workspace-nav-stack">
      <nav className="workspace-tabbar" aria-label="Workflow workspace navigation">
        {primaryTabs.map((tab) => (
          <button
            key={tab.id}
            className={`workspace-tab ${activeTab === tab.id ? 'active' : ''}`}
            aria-pressed={activeTab === tab.id}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="workspace-utility-row" aria-label="Authoring and settings shortcuts">
        {utilityTabs.map((tab) => (
          <button
            key={tab.id}
            className={`utility-chip ${activeTab === tab.id ? 'active' : ''}`}
            aria-pressed={activeTab === tab.id}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
