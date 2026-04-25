export function AppShell({ title, subtitle, menuOpen, onToggleMenu, menuItems = [], activePage, onSelectPage, children, chatBubble }) {
  return (
    <div className="app-frame">
      <header className="global-topbar panel">
        <div className="row-between">
          <div className="app-shell-brand">
            <button className="secondary-button hamburger-button" onClick={onToggleMenu} aria-label="Toggle navigation menu">
              ☰
            </button>
            <div>
              <div className="eyebrow">Workflow Studio</div>
              <div className="phone-topbar-title">{title}</div>
              {subtitle ? <div className="muted small-copy">{subtitle}</div> : null}
            </div>
          </div>
        </div>
      </header>

      <div className="app-shell-body">
        <aside className={`app-sidebar panel ${menuOpen ? 'open' : ''}`}>
          <div className="section-title">Navigation</div>
          <div className="app-menu-list">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`app-menu-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => onSelectPage(item.id)}
              >
                <div className="app-menu-title">{item.label}</div>
                {item.description ? <div className="muted small-copy">{item.description}</div> : null}
              </button>
            ))}
          </div>
        </aside>

        <main className="app-page-content">{children}</main>
      </div>

      {chatBubble}
    </div>
  )
}
