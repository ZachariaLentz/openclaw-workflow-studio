import { useMemo } from 'react'

export default function NodeOrganizerScreen({ summaries = [], selectedToolId = '', onSelectToolId, clarificationPreview = null, nodeDraft = null }) {
  const grouped = useMemo(() => {
    const buckets = new Map()
    for (const item of summaries) {
      const key = item.nodeType || 'other'
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(item)
    }
    return Array.from(buckets.entries())
  }, [summaries])

  return (
    <div className="screen-shell">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Node Organizer</p>
            <h2>Reusable node catalog</h2>
          </div>
          <p className="muted">Prefer existing reusable nodes before invention.</p>
        </div>

        <div className="stack-md">
          {grouped.map(([group, items]) => (
            <div key={group} className="stack-sm">
              <h3>{group}</h3>
              <div className="stack-sm">
                {items.map((item) => (
                  <button
                    key={item.toolId}
                    type="button"
                    className={`list-card ${selectedToolId === item.toolId ? 'list-card-active' : ''}`}
                    onClick={() => onSelectToolId?.(item.toolId)}
                  >
                    <div className="row-between gap-sm">
                      <strong>{item.title}</strong>
                      <span className="badge">{item.maturity}</span>
                    </div>
                    <div className="row-between gap-sm muted small-text">
                      <span>{item.toolId}</span>
                      <span>{item.authoring?.allowed ? 'authorable' : 'not authorable'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Clarification preview</p>
            <h2>Socrates node-creation plan</h2>
          </div>
        </div>

        {!clarificationPreview || clarificationPreview.type !== 'needs_clarification' ? (
          <p className="muted">No node-creation clarification preview yet.</p>
        ) : (
          <div className="stack-md">
            <div>
              <strong>{clarificationPreview.archetype?.title}</strong>
              <p className="muted">{clarificationPreview.archetype?.description}</p>
            </div>

            <div>
              <h3>Required questions</h3>
              <ul>
                {clarificationPreview.requiredQuestions.map((item) => (
                  <li key={item.id}>
                    <strong>{item.question}</strong>
                    <div className="muted small-text">{item.reason}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3>Default assumptions</h3>
              <pre className="code-block">{JSON.stringify(clarificationPreview.defaults || {}, null, 2)}</pre>
            </div>

            {nodeDraft?.draft?.node ? (
              <div>
                <h3>Draft node preview</h3>
                <pre className="code-block">{JSON.stringify(nodeDraft.draft.node, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  )
}
