function CopyButton({ label, text }) {
  async function handleCopy() {
    if (!text) return
    await navigator.clipboard.writeText(text)
  }

  return <button className="secondary-button" onClick={handleCopy} disabled={!text}>{label}</button>
}

export function RunPanel({ runState, running, onRun, defaultTriggerNodeId }) {
  const downloadOutput = runState?.nodeOutputs?.['download-file']
  const storyOutput = runState?.nodeOutputs?.['prompt-edit-story'] || runState?.nodeOutputs?.['prompt-write-story']
  const affiliateResult = runState?.nodeOutputs?.['return-content-pack']?.resultSummary || runState?.nodeOutputs?.['return-result']?.resultSummary
  const affiliatePack = affiliateResult?.contentPack
  const failureEvent = runState?.events?.findLast?.((event) => event.type === 'node-failed' || event.type === 'error')

  return (
    <div className="run-activity-panel mobile-run-panel">
      <div className="section-title row-between">
        <span>Run Activity</span>
        <button className="primary-button" onClick={() => onRun(defaultTriggerNodeId)} disabled={running}>{running ? 'Running…' : 'Run workflow'}</button>
      </div>
      {failureEvent ? <div className="run-result-card failure-surface"><div><strong>Run failed</strong><div className="muted small-copy">{failureEvent.message || 'Unknown workflow error'}</div></div></div> : null}
      {downloadOutput?.downloadUrl ? <div className="run-result-card success-surface"><div><strong>Your story is ready</strong><div className="muted small-copy">{downloadOutput.fileName}</div></div><a className="primary-button inline-button" href={downloadOutput.downloadUrl} download={downloadOutput.fileName}>Download story</a></div> : null}
      {affiliatePack ? (
        <div className="affiliate-pack-preview">
          <div className="run-result-card success-surface">
            <div>
              <strong>Affiliate content pack is ready</strong>
              <div className="muted small-copy">{affiliatePack.title}</div>
            </div>
          </div>

          {(runState?.nodeOutputs?.['load-product-candidates']?.products || []).length > 0 ? (
            <div className="story-preview affiliate-preview-card">
              <div className="section-title">Candidate review</div>
              <div className="affiliate-candidate-list">
                {(runState?.nodeOutputs?.['load-product-candidates']?.products || []).map((product) => (
                  <div key={product.id} className="affiliate-candidate-card">
                    <div className="row-between">
                      <strong>{product.title}</strong>
                      <div className="hero-pills">
                        <span className="pill">{product.source || 'unknown source'}</span>
                        <span className="pill">confidence {typeof product.confidence === 'number' ? product.confidence : 'n/a'}</span>
                      </div>
                    </div>
                    <div className="muted small-copy">{product.category || 'uncategorized'} · {product.brand || 'Unknown brand'} · ${product.price ?? 0}</div>
                    {product.rationale ? <div className="muted small-copy">{product.rationale}</div> : null}
                    <div className="affiliate-link-grid">
                      <div>
                        <div className="muted small-copy">Canonical URL</div>
                        <a href={product.canonicalUrl || '#'} target="_blank" rel="noreferrer">{product.canonicalUrl || 'Missing'}</a>
                      </div>
                      <div>
                        <div className="muted small-copy">Affiliate URL</div>
                        <a href={product.affiliateUrl || '#'} target="_blank" rel="noreferrer">{product.affiliateUrl || 'Missing'}</a>
                      </div>
                      <div>
                        <div className="muted small-copy">Image URL</div>
                        <a href={product.imageUrl || '#'} target="_blank" rel="noreferrer">{product.imageUrl || 'Missing'}</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="story-preview affiliate-preview-card">
            <div className="row-between">
              <div className="section-title">Content Pack</div>
              <div className="hero-pills">
                <CopyButton label="Copy export" text={affiliatePack.exportBlock} />
                <CopyButton label="Copy titles" text={(affiliatePack.pinTitleVariants || []).join('\n')} />
                <CopyButton label="Copy descriptions" text={(affiliatePack.pinDescriptionVariants || []).join('\n\n')} />
              </div>
            </div>
            <div className="affiliate-preview-grid">
              <div>
                <div className="muted small-copy">Status</div>
                <strong>{affiliatePack.status || affiliateResult?.status || 'review-ready'}</strong>
              </div>
              <div>
                <div className="muted small-copy">Selected products</div>
                <strong>{affiliatePack.selectedProducts?.length || affiliatePack.selectedProductIds?.length || 0}</strong>
              </div>
              <div>
                <div className="muted small-copy">Alternates</div>
                <strong>{affiliatePack.alternateProducts?.length || affiliatePack.alternateProductIds?.length || 0}</strong>
              </div>
              <div>
                <div className="muted small-copy">Creative briefs</div>
                <strong>{affiliatePack.creativeAssets?.length || 0}</strong>
              </div>
            </div>

            <div className="affiliate-pack-section">
              <div className="section-title">Pin title variants</div>
              <ul>
                {(affiliatePack.pinTitleVariants || []).map((title) => <li key={title}>{title}</li>)}
              </ul>
            </div>

            <div className="affiliate-pack-section">
              <div className="section-title">Selected products</div>
              <ul>
                {(affiliatePack.selectedProducts || []).map((product) => <li key={product.id}>{product.title} {product.scores?.totalScore ? `— score ${product.scores.totalScore}` : ''}</li>)}
              </ul>
            </div>

            <div className="affiliate-pack-section">
              <div className="section-title">Product blurbs</div>
              <ul>
                {(affiliatePack.productBlurbs || []).map((item) => <li key={item.productId || item.title}><strong>{item.title}:</strong> {item.blurb}</li>)}
              </ul>
            </div>

            <div className="affiliate-pack-section">
              <div className="section-title">Pin descriptions</div>
              <ul>
                {(affiliatePack.pinDescriptionVariants || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div className="affiliate-pack-section">
              <div className="section-title">Creative prompts</div>
              <ul>
                {(affiliatePack.creativeAssets || []).map((item) => <li key={item.id}><strong>{item.overlayText || item.title}:</strong> {item.prompt}</li>)}
              </ul>
            </div>

            <div className="affiliate-pack-section">
              <div className="section-title">Intro</div>
              <pre>{affiliatePack.roundupIntro}</pre>
            </div>

            <div className="affiliate-pack-section">
              <div className="section-title">Publishing setup</div>
              <pre>{[
                `Pinterest username: ${affiliatePack.pinterestPublishingSetup?.username || 'missing'}`,
                `Pinterest email: ${affiliatePack.pinterestPublishingSetup?.email || 'missing'}`,
                `Pinterest profile: ${affiliatePack.pinterestPublishingSetup?.profileUrl || 'missing'}`,
                `Amazon tag: ${affiliatePack.amazonAffiliateSetup?.associatesTag || 'missing'}`,
                `Marketplace: ${affiliatePack.amazonAffiliateSetup?.marketplace || 'missing'}`,
                `Landing page: ${affiliatePack.amazonAffiliateSetup?.landingPageUrl || 'none yet'}`,
                `Direct-link fallback: ${affiliatePack.amazonAffiliateSetup?.directLinkFallbackAllowed ? 'yes' : 'no'}`,
              ].join('\n')}</pre>
            </div>

            <div className="affiliate-pack-section">
              <div className="section-title">Disclosure</div>
              <pre>{affiliatePack.disclosureText}</pre>
            </div>

            <div className="affiliate-pack-section">
              <div className="section-title">Destination</div>
              <pre>{affiliatePack.destinationPolicy?.destinationUrl || affiliatePack.destinationUrl || 'missing'}</pre>
            </div>

            <div className="affiliate-pack-section">
              <div className="section-title">Validation summary</div>
              <pre>{[
                `Valid products: ${affiliatePack.validationSummary?.validProductCount ?? 0}`,
                `Invalid products: ${affiliatePack.validationSummary?.invalidProductCount ?? 0}`,
                `Blocked: ${affiliatePack.validationSummary?.blocked ? 'yes' : 'no'}`,
              ].join('\n')}</pre>
            </div>

            <div className="affiliate-pack-section">
              <div className="section-title">Export block</div>
              <pre>{affiliatePack.exportBlock}</pre>
            </div>
          </div>
        </div>
      ) : null}
      {storyOutput?.editedText || storyOutput?.storyText ? <div className="story-preview"><div className="section-title">Story Preview</div><pre>{storyOutput.editedText || storyOutput.storyText}</pre></div> : null}
      <div className="run-status-grid">
        {runState ? Object.entries(runState.nodeStatus).map(([nodeId, status]) => <div key={nodeId} className={`status-item status-${status}`}><span>{nodeId}</span><strong>{status}</strong></div>) : <div className="muted">No run yet.</div>}
      </div>
    </div>
  )
}
