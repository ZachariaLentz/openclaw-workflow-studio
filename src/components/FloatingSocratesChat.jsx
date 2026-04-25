export function FloatingSocratesChat({ open, onToggle, pageTitle, pageContextLabel, connection, draft, onDraftChange, onSend, sending, messages = [], nodeCreationState = null }) {
  return (
    <div className="floating-chat-shell">
      <button className="floating-chat-toggle primary-button" onClick={onToggle} aria-label="Toggle Socrates chat">
        💬
      </button>

      {open ? (
        <div className="floating-chat-panel panel">
          <div className="row-between panel-section">
            <div>
              <div className="section-title">Socrates</div>
              <div className="muted small-copy">Context: {pageTitle}{pageContextLabel ? ` · ${pageContextLabel}` : ''}</div>
            </div>
            <button className="secondary-button" onClick={onToggle}>Close</button>
          </div>

          <div className="chat-log floating-chat-log">
            {messages.length === 0 ? <div className="muted">No messages yet for this page.</div> : null}
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`chat-bubble ${item.role}`}>
                <strong>{item.role === 'user' ? 'You' : 'Socrates'}</strong>
                <div>{item.text}</div>
              </div>
            ))}
          </div>

          {nodeCreationState?.intent ? (
            <div className="node-info-card panel-section">
              <div className="section-title">Node creation assistant</div>
              {nodeCreationState.mode === 'clarifying' ? (
                <div className="stack-sm">
                  {nodeCreationState.nextQuestion ? (
                    <div>
                      <strong>Next question:</strong>
                      <div>{nodeCreationState.nextQuestion.question}</div>
                      <div className="muted small-copy">{nodeCreationState.nextQuestion.reason}</div>
                    </div>
                  ) : null}
                  <div className="muted small-copy">Still missing: {(nodeCreationState.missingQuestionIds || []).join(', ') || 'nothing'}</div>
                </div>
              ) : null}
              {nodeCreationState.mode === 'draft_ready' ? (
                <div className="stack-sm">
                  <div className="muted small-copy">Draft ready for review.</div>
                  {nodeCreationState.validation ? <div className="muted small-copy">Validation: {nodeCreationState.validation.ok ? 'pass' : 'fail'}</div> : null}
                  {nodeCreationState.harness ? <div className="muted small-copy">Harness: {nodeCreationState.harness.ok ? 'pass' : 'fail'}</div> : null}
                  {nodeCreationState.score ? <div className="muted small-copy">Score: {nodeCreationState.score.score} ({nodeCreationState.score.grade})</div> : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <textarea className="chat-input" value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder={`Ask Socrates about ${pageTitle.toLowerCase()}…`} spellCheck="false" />
          <div className="row-between">
            <span className="muted small-copy">{connection.connected ? 'Bridge connected' : 'Bridge required'}</span>
            <button className="primary-button" disabled={sending || !connection.connected || !draft.trim()} onClick={onSend}>{sending ? 'Sending…' : 'Send'}</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
