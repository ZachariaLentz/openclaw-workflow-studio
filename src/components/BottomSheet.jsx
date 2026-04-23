export function BottomSheet({ open, title, subtitle, onClose, children, tall = false }) {
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
