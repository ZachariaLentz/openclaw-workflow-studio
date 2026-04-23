export function RunPanel({ runState, running, onRun, defaultTriggerNodeId }) {
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
