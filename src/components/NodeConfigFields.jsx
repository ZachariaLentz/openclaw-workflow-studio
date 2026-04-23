import { getCompatibleAccounts } from '../lib/accounts'

function isFieldVisible(field, config) {
  if (!field.visibleWhen) return true
  return config?.[field.visibleWhen.key] === field.visibleWhen.equals
}

function getFieldHelpText(node, field) {
  if (node.toolId === 'sources.product_candidates' && field.key === 'productLines') {
    return 'Quick Paste format: Title | Price | Category | tag1, tag2 | Brand'
  }
  if (node.toolId === 'sources.product_candidates' && field.key === 'productsJson') {
    return 'Products JSON format: [{ "title": "...", "price": 24.99, "category": "...", "tags": ["..."], "brand": "..." }]'
  }
  return field.helpText || ''
}

export function NodeConfigFields({ node, fields = [], accounts = [], onPatchNode }) {
  const config = node.config || {}

  return (
    <div className="config-grid">
      {fields.filter((field) => isFieldVisible(field, config)).map((field) => {
        const value = config?.[field.key]

        if (field.type === 'boolean') {
          return (
            <label key={field.key} className="field-label checkbox-field">
              <input
                type="checkbox"
                checked={value !== false}
                onChange={(event) => onPatchNode({ config: { ...config, [field.key]: event.target.checked } })}
              />
              <span>{field.label}</span>
            </label>
          )
        }

        if (field.type === 'select') {
          return (
            <label key={field.key} className="field-label">
              {field.label}
              <select value={value ?? ''} onChange={(event) => onPatchNode({ config: { ...config, [field.key]: event.target.value } })}>
                <option value="">Select…</option>
                {(field.options || []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          )
        }

        if (field.type === 'account-select') {
          const compatibleAccounts = getCompatibleAccounts(accounts, node.toolId).filter((account) => !field.provider || account.provider === field.provider)
          return (
            <label key={field.key} className="field-label">
              {field.label}
              <select value={value ?? ''} onChange={(event) => onPatchNode({ config: { ...config, [field.key]: event.target.value } })}>
                <option value="">Select a connected account</option>
                {compatibleAccounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}
              </select>
            </label>
          )
        }

        if (field.type === 'schema') {
          const helpText = getFieldHelpText(node, field)
          return (
            <label key={field.key} className="field-label">
              {field.label}
              <textarea
                className="chat-input compact-input"
                value={typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)}
                onChange={(event) => {
                  let nextValue = event.target.value
                  try {
                    nextValue = JSON.parse(event.target.value)
                  } catch {
                    nextValue = event.target.value
                  }
                  onPatchNode({ config: { ...config, [field.key]: nextValue } })
                }}
                spellCheck="false"
              />
              {helpText ? <span className="muted small-copy">{helpText}</span> : null}
            </label>
          )
        }

        return (
          <label key={field.key} className="field-label">
            {field.label}
            <input
              className="text-input"
              value={value ?? ''}
              placeholder={field.placeholder || ''}
              onChange={(event) => onPatchNode({ config: { ...config, [field.key]: event.target.value } })}
            />
          </label>
        )
      })}
    </div>
  )
}
