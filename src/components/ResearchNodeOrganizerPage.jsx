export function ResearchNodeOrganizerPage({ summaries = [], selectedToolId = '', onSelectToolId, clarificationPreview = null, nodeDraft = null }) {
  const selected = summaries.find((item) => item.toolId === selectedToolId) || null

  return (
    <div className="workspace-screen-stack">
      <div className="panel workspace-section-intro quiet-surface">
        <div className="section-title">Node Organizer</div>
        <div className="muted small-copy">Research and design surface for understanding reusable nodes, hierarchy, and organizer readiness.</div>
      </div>

      <div className="app-two-column-grid">
        <section className="panel">
          <div className="section-title">Node Catalog</div>
          <div className="stack-sm">
            {summaries.map((item) => (
              <button key={item.toolId} className={`list-card ${selectedToolId === item.toolId ? 'list-card-active' : ''}`} onClick={() => onSelectToolId(item.toolId)}>
                <div className="row-between gap-sm">
                  <strong>{item.title}</strong>
                  <span className="badge">{item.maturity}</span>
                </div>
                <div className="muted small-copy">{item.toolId} · {item.nodeType} · {item.authoring?.allowed ? 'authorable' : 'not authorable'}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-title">Research / Design Detail</div>
          {selected ? (
            <div className="stack-md">
              <div>
                <strong>{selected.title}</strong>
                <div className="muted small-copy">{selected.toolId}</div>
              </div>
              <div className="muted small-copy">Maturity: {selected.maturity}</div>
              <div className="muted small-copy">Organizer: {selected.organizer?.ready ? 'ready' : 'not ready'} · {selected.organizer?.visibility}</div>
              <div className="muted small-copy">Authoring: {selected.authoring?.allowed ? 'allowed' : 'blocked'}</div>
              <div className="muted small-copy">Reason: {selected.organizer?.reason || selected.authoring?.reason || 'No reason recorded.'}</div>
            </div>
          ) : <div className="muted">Select a node to inspect.</div>}

          {clarificationPreview?.type === 'needs_clarification' ? (
            <div className="panel-section">
              <div className="section-title">Clarification Strategy</div>
              <div className="muted small-copy">Archetype: {clarificationPreview.archetype?.title}</div>
              <pre className="code-block">{JSON.stringify(clarificationPreview, null, 2)}</pre>
            </div>
          ) : null}

          {nodeDraft?.draft?.node ? (
            <div className="panel-section">
              <div className="section-title">Draft Preview</div>
              <pre className="code-block">{JSON.stringify(nodeDraft.draft.node, null, 2)}</pre>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
