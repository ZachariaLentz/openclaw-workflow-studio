export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getTimestamp() {
  return new Date().toISOString()
}

export function formatScheduleSummary(config = {}) {
  if (config.scheduleSummary) return config.scheduleSummary
  if (config.scheduleMode === 'once' && config.runAt) return `Once at ${config.runAt}`
  if (config.scheduleMode === 'every' && config.everyMinutes) return `Every ${config.everyMinutes} minutes`
  if (config.scheduleMode === 'cron' && config.cronExpression) return `Cron: ${config.cronExpression}`
  return 'Scheduled trigger'
}

export function inferPriorityFromItem(item = {}) {
  const severity = String(item.severity || item.priority || '').toLowerCase()
  if (['critical', 'urgent', 'high', 'error'].includes(severity)) return 'urgent'
  if (['warning', 'medium', 'today'].includes(severity)) return 'today'
  if (['low', 'info', 'informational', 'normal'].includes(severity)) return 'informational'
  return 'today'
}

export function summarizeEvents(events = []) {
  if (!Array.isArray(events) || events.length === 0) return 'No events in the selected window.'
  return events
    .slice(0, 3)
    .map((event) => `${event.title || 'Untitled'}${event.startsAt ? ` @ ${event.startsAt}` : ''}`)
    .join('; ')
}

export function buildPriorityItem(base = {}, fallback = {}) {
  return {
    label: base.label || fallback.label || 'Untitled item',
    summary: base.summary || fallback.summary || '',
    source: base.source || fallback.source || 'unknown',
    severity: base.severity || fallback.severity || 'info',
    startsAt: base.startsAt || fallback.startsAt || null,
    recommendedAction: base.recommendedAction || fallback.recommendedAction || null,
    route: base.route || fallback.route || null,
    blocked: Boolean(base.blocked ?? fallback.blocked ?? false),
    live: Boolean(base.live ?? fallback.live ?? false),
    placeholder: Boolean(base.placeholder ?? fallback.placeholder ?? false),
    details: base.details || fallback.details || null,
  }
}

export function inferStoryTitle(idea) {
  return idea?.title || 'The Little Lantern in the Woods'
}

export function getPromptText(node, context) {
  if (node.prompt) return node.prompt
  return context.lastOutput?.prompt || 'Complete the requested AI task.'
}

export function buildFileName(template, title) {
  const safeTitle = (title ?? 'story')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const baseName = safeTitle || 'story'
  return (template || '{{title}}.txt').replace('{{title}}', baseName)
}

export function toDownloadUrl({ content, contentType }) {
  const blob = new Blob([content], { type: contentType || 'text/plain' })
  return URL.createObjectURL(blob)
}

export function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function scoreProductCandidate(product = {}, theme = {}, weights = {}) {
  const title = String(product.title || '').toLowerCase()
  const category = String(product.category || '').toLowerCase()
  const tags = Array.isArray(product.tags) ? product.tags.map((tag) => String(tag).toLowerCase()) : []
  const angle = String(theme.angle || theme.title || '').toLowerCase()
  const price = Number(product.price || 0)
  const rating = Number(product.rating || 0)
  const reviewCount = Number(product.reviewCount || 0)

  const usefulnessScore = /(organizer|storage|bin|shelf|rack|drawer|label|basket|container|caddy|hook)/.test(`${title} ${category} ${tags.join(' ')}`) ? 9 : 7
  const nicheFitScore = /(pantry|kitchen|closet|bathroom|laundry|organization|storage|small-space|entryway)/.test(`${title} ${category} ${tags.join(' ')} ${angle}`) ? 9 : 6
  const visualScore = /(clear|acrylic|bamboo|label|stackable|tiered|pretty|aesthetic)/.test(`${title} ${tags.join(' ')}`) ? 8 : 6
  const valueScore = price > 0 && price <= 35 ? 8 : price <= 60 ? 7 : 5
  const roundupFitScore = angle && `${title} ${category} ${tags.join(' ')}`.includes(angle.split(' ')[0]) ? 9 : 7
  const noveltyScore = reviewCount > 5000 ? 6 : 7
  const confidenceScore = rating >= 4.5 && reviewCount >= 500 ? 8 : rating >= 4 ? 7 : 5
  const complianceRiskScore = /(medical|supplement|skin|weight loss|cure)/.test(title) ? 5 : 1

  const defaultWeights = {
    usefulness: 0.22,
    nicheFit: 0.18,
    visualAppeal: 0.18,
    value: 0.14,
    roundupFit: 0.12,
    novelty: 0.08,
    confidence: 0.05,
    complianceRisk: -0.03,
  }

  const appliedWeights = { ...defaultWeights, ...weights }

  const totalScore = Number((
    usefulnessScore * appliedWeights.usefulness +
    nicheFitScore * appliedWeights.nicheFit +
    visualScore * appliedWeights.visualAppeal +
    valueScore * appliedWeights.value +
    roundupFitScore * appliedWeights.roundupFit +
    noveltyScore * appliedWeights.novelty +
    confidenceScore * appliedWeights.confidence +
    complianceRiskScore * appliedWeights.complianceRisk
  ).toFixed(2))

  return {
    ...product,
    scores: {
      usefulnessScore,
      nicheFitScore,
      visualScore,
      valueScore,
      roundupFitScore,
      noveltyScore,
      confidenceScore,
      complianceRiskScore,
      totalScore,
    },
    rationale: `Scored for practicality, niche fit, visual appeal, value, and roundup usefulness for ${theme.title || 'the selected theme'}.`,
    warnings: complianceRiskScore > 3 ? ['Potential compliance review recommended'] : [],
  }
}

export function buildAffiliateTheme(config = {}) {
  const nicheId = config.nicheId || 'niche-home-organization'
  const title = config.seedThemeTitle || '12 pantry organization finds that make small kitchens easier'
  return {
    id: `theme-${slugify(title) || 'home-organization'}`,
    nicheId,
    title,
    angle: 'small kitchen pantry organization',
    roomType: 'kitchen',
    problemSolved: 'pantry clutter',
    seasonality: 'evergreen',
    rationale: 'High Pinterest fit, practical buying intent, and clear roundup cohesion.',
  }
}

export function getDefaultAffiliateProducts() {
  return [
    {
      id: 'product-clear-bin-set',
      title: 'Clear stackable pantry bin set',
      category: 'pantry-storage',
      price: 24.99,
      brand: 'HomeNest',
      rating: 4.6,
      reviewCount: 18542,
      tags: ['clear bins', 'pantry', 'small kitchen', 'stackable'],
      canonicalUrl: 'https://example.com/clear-stackable-pantry-bin-set',
      affiliateUrl: 'https://example.com/clear-stackable-pantry-bin-set?tag=affiliate-20',
      imageUrl: 'https://example.com/images/clear-stackable-pantry-bin-set.jpg',
      source: 'fallback',
      confidence: 0.65,
    },
    {
      id: 'product-can-riser',
      title: 'Tiered can organizer rack',
      category: 'pantry-storage',
      price: 19.99,
      brand: 'OrderlyCo',
      rating: 4.5,
      reviewCount: 8244,
      tags: ['can organizer', 'tiered', 'pantry'],
      canonicalUrl: 'https://example.com/tiered-can-organizer-rack',
      affiliateUrl: 'https://example.com/tiered-can-organizer-rack?tag=affiliate-20',
      imageUrl: 'https://example.com/images/tiered-can-organizer-rack.jpg',
      source: 'fallback',
      confidence: 0.65,
    },
    {
      id: 'product-lazy-susan',
      title: 'Acrylic lazy Susan turntable',
      category: 'cabinet-organization',
      price: 18.99,
      brand: 'BrightHome',
      rating: 4.7,
      reviewCount: 12044,
      tags: ['acrylic', 'turntable', 'spices', 'small space'],
      canonicalUrl: 'https://example.com/acrylic-lazy-susan-turntable',
      affiliateUrl: 'https://example.com/acrylic-lazy-susan-turntable?tag=affiliate-20',
      imageUrl: 'https://example.com/images/acrylic-lazy-susan-turntable.jpg',
      source: 'fallback',
      confidence: 0.65,
    },
    {
      id: 'product-shelf-riser',
      title: 'Expandable pantry shelf riser',
      category: 'pantry-storage',
      price: 21.5,
      brand: 'StackWell',
      rating: 4.4,
      reviewCount: 4211,
      tags: ['shelf riser', 'pantry', 'spices'],
      canonicalUrl: 'https://example.com/expandable-pantry-shelf-riser',
      affiliateUrl: 'https://example.com/expandable-pantry-shelf-riser?tag=affiliate-20',
      imageUrl: 'https://example.com/images/expandable-pantry-shelf-riser.jpg',
      source: 'fallback',
      confidence: 0.65,
    },
    {
      id: 'product-bag-sealer',
      title: 'Bag clip and food storage set',
      category: 'kitchen-organization',
      price: 12.99,
      brand: 'DailyOrder',
      rating: 4.3,
      reviewCount: 2230,
      tags: ['food storage', 'clips', 'kitchen'],
      canonicalUrl: 'https://example.com/bag-clip-food-storage-set',
      affiliateUrl: 'https://example.com/bag-clip-food-storage-set?tag=affiliate-20',
      imageUrl: 'https://example.com/images/bag-clip-food-storage-set.jpg',
      source: 'fallback',
      confidence: 0.65,
    },
    {
      id: 'product-label-kit',
      title: 'Reusable pantry label kit',
      category: 'pantry-storage',
      price: 9.99,
      brand: 'LabelLeaf',
      rating: 4.5,
      reviewCount: 3199,
      tags: ['labels', 'pantry', 'clear containers'],
      canonicalUrl: 'https://example.com/reusable-pantry-label-kit',
      affiliateUrl: 'https://example.com/reusable-pantry-label-kit?tag=affiliate-20',
      imageUrl: 'https://example.com/images/reusable-pantry-label-kit.jpg',
      source: 'fallback',
      confidence: 0.65,
    },
    {
      id: 'product-door-rack',
      title: 'Over-the-door pantry organizer',
      category: 'small-space-storage',
      price: 34.99,
      brand: 'SpaceSmith',
      rating: 4.4,
      reviewCount: 9271,
      tags: ['over door', 'small space', 'pantry'],
      canonicalUrl: 'https://example.com/over-the-door-pantry-organizer',
      affiliateUrl: 'https://example.com/over-the-door-pantry-organizer?tag=affiliate-20',
      imageUrl: 'https://example.com/images/over-the-door-pantry-organizer.jpg',
      source: 'fallback',
      confidence: 0.65,
    },
    {
      id: 'product-drawer-bin',
      title: 'Pull-out pantry drawer bin',
      category: 'pantry-storage',
      price: 29.99,
      brand: 'SlideRight',
      rating: 4.6,
      reviewCount: 2876,
      tags: ['drawer bin', 'pull out', 'pantry'],
      canonicalUrl: 'https://example.com/pull-out-pantry-drawer-bin',
      affiliateUrl: 'https://example.com/pull-out-pantry-drawer-bin?tag=affiliate-20',
      imageUrl: 'https://example.com/images/pull-out-pantry-drawer-bin.jpg',
      source: 'fallback',
      confidence: 0.65,
    },
    {
      id: 'product-dispenser',
      title: 'Cereal dispenser storage container',
      category: 'pantry-storage',
      price: 27.99,
      brand: 'KitchenCalm',
      rating: 4.2,
      reviewCount: 6150,
      tags: ['cereal', 'container', 'pantry'],
      canonicalUrl: 'https://example.com/cereal-dispenser-storage-container',
      affiliateUrl: 'https://example.com/cereal-dispenser-storage-container?tag=affiliate-20',
      imageUrl: 'https://example.com/images/cereal-dispenser-storage-container.jpg',
      source: 'fallback',
      confidence: 0.65,
    },
    {
      id: 'product-basket',
      title: 'Wire pantry basket set',
      category: 'pantry-storage',
      price: 31.99,
      brand: 'HouseHarbor',
      rating: 4.5,
      reviewCount: 4092,
      tags: ['wire basket', 'pantry', 'storage'],
      canonicalUrl: 'https://example.com/wire-pantry-basket-set',
      affiliateUrl: 'https://example.com/wire-pantry-basket-set?tag=affiliate-20',
      imageUrl: 'https://example.com/images/wire-pantry-basket-set.jpg',
      source: 'fallback',
      confidence: 0.65,
    },
    {
      id: 'product-duplicate-bin-set',
      title: 'Clear stackable pantry bin set - 4 pack',
      category: 'pantry-storage',
      price: 26.99,
      brand: 'HomeNest',
      rating: 4.5,
      reviewCount: 6400,
      tags: ['clear bins', 'pantry', 'stackable'],
      canonicalUrl: 'https://example.com/clear-stackable-pantry-bin-set-4-pack',
      affiliateUrl: 'https://example.com/clear-stackable-pantry-bin-set-4-pack?tag=affiliate-20',
      imageUrl: 'https://example.com/images/clear-stackable-pantry-bin-set-4-pack.jpg',
      source: 'fallback',
      confidence: 0.65,
    },
  ]
}

export function parseSimpleProductLines(value = '') {
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split('|').map((part) => part.trim())
      const [title, priceText = '', category = 'uncategorized', tagsText = '', brand = 'Unknown brand', affiliateUrl = '', imageUrl = ''] = parts
      return {
        id: `product-line-${index + 1}`,
        title: title || `Untitled product ${index + 1}`,
        price: Number(priceText.replace(/[^0-9.]/g, '')) || 0,
        category,
        tags: tagsText ? tagsText.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
        brand,
        rating: 4.3,
        reviewCount: 500,
        canonicalUrl: affiliateUrl,
        affiliateUrl,
        imageUrl,
      }
    })
}

export function buildContentPackFromProducts(theme, selectedProducts = [], alternates = []) {
  const title = theme.title || 'Practical home organization finds'
  const pinTitleVariants = [
    title,
    'Amazon Pantry Finds That Make Small Kitchens Easier',
    'Practical Pantry Organization Finds for Small Kitchens',
  ]
  const pinDescriptionVariants = [
    `Practical pantry organization finds for small kitchens, including ${selectedProducts.slice(0, 3).map((item) => item.title).join(', ')} and more.`,
    'These practical Amazon finds can help make a cramped pantry easier to use and less chaotic.',
  ]

  const productBlurbs = selectedProducts.map((product) => ({
    productId: product.id,
    title: product.title,
    blurb: `${product.title} is a practical pick for ${theme.problemSolved || 'home organization'} because it helps with storage, visibility, and everyday ease without overcomplicating the space.`,
    score: product.scores?.totalScore ?? null,
  }))

  return {
    id: `content-pack-${slugify(title) || 'affiliate-pack'}`,
    nicheId: theme.nicheId || 'niche-home-organization',
    themeId: theme.id,
    title,
    status: 'review',
    selectedProductIds: selectedProducts.map((item) => item.id),
    alternateProductIds: alternates.map((item) => item.id),
    selectedProducts,
    alternateProducts: alternates,
    pinTitleVariants,
    pinDescriptionVariants,
    roundupIntro: 'If your pantry feels cramped, these practical organization finds can make a small kitchen easier to manage without turning it into a giant project.',
    roundupOutro: 'A few well-chosen storage upgrades can make everyday kitchen life feel calmer, cleaner, and easier to maintain.',
    productBlurbs,
    disclosureText: 'This post contains affiliate links. I may earn a commission if you buy through these links.',
    destinationUrl: `https://example.com/${slugify(title) || 'affiliate-roundup'}`,
    exportBlock: [
      `TITLE: ${title}`,
      '',
      'PIN TITLES:',
      ...pinTitleVariants.map((item) => `- ${item}`),
      '',
      'PIN DESCRIPTIONS:',
      ...pinDescriptionVariants.map((item) => `- ${item}`),
      '',
      'PRODUCT BLURBS:',
      ...productBlurbs.map((item) => `- ${item.title}: ${item.blurb}`),
      '',
      `DISCLOSURE: ${'This post contains affiliate links. I may earn a commission if you buy through these links.'}`,
    ].join('\n'),
  }
}
