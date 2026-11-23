import { siteLanguages } from '../languages'
import { isHttpsUrl, videoFromUrl } from '../video-url'
import { mapLegalEntity } from '../legal-entity'
import { anchorFitsPart, isOnboardingPart } from '../onboarding-anchors'

type PayloadDoc = Record<string, any>

interface ContractImage {
  url: string
  width: number
  height: number
  alt: string
  mimeType: string
}

function mapMedia(media: unknown): ContractImage | null {
  if (!media || typeof media !== 'object') return null
  const doc = media as PayloadDoc
  if (!doc.url || !doc.width || !doc.height || !doc.mimeType) return null
  const origin = (process.env.CMS_PUBLIC_URL ?? 'http://localhost:3001').replace(/\/$/, '')
  const url = String(doc.url).startsWith('http') ? String(doc.url) : `${origin}${doc.url}`
  return {
    url,
    width: Number(doc.width),
    height: Number(doc.height),
    alt: String(doc.alt ?? ''),
    mimeType: String(doc.mimeType),
  }
}

const iso = (value: unknown): string => new Date(String(value)).toISOString()
const present = (value: unknown): boolean => value !== undefined && value !== null && value !== ''
const isoOrNull = (value: unknown): string | null => (value ? iso(value) : null)

export function mapBrand(doc: PayloadDoc) {
  return {
    name: String(doc.name ?? ''),
    logo: mapMedia(doc.logo),
    favicon: mapMedia(doc.favicon),
    primaryColor: String(doc.primaryColor ?? '#d4a437'),
    socials: (doc.socials ?? []).map((s: PayloadDoc) => ({
      name: String(s.name ?? ''),
      url: String(s.url ?? ''),
    })),
    heroBackground: heroBackground(doc),
    ...siteLanguages(doc),
    ...withLegalEntity(doc),
  }
}

function withLegalEntity(doc: PayloadDoc) {
  const legalEntity = mapLegalEntity(doc)
  return legalEntity ? { legalEntity } : {}
}

export function heroBackground(site: PayloadDoc): 'quotes' | 'off' {
  return site.heroBackground === 'off' ? 'off' : 'quotes'
}

export function mapNavigation(doc: PayloadDoc) {
  return {
    header: (doc.header ?? []).map((item: PayloadDoc) => ({
      label: String(item.label ?? ''),
      href: String(item.href ?? ''),
    })),
    footer: {
      columns: (doc.footerColumns ?? []).map((column: PayloadDoc) => ({
        title: String(column.title ?? ''),
        links: (column.links ?? []).map((link: PayloadDoc) => ({
          label: String(link.label ?? ''),
          href: String(link.href ?? ''),
        })),
      })),
      riskWarning: String(doc.riskWarning ?? ''),
    },
  }
}

export function mapFaq(doc: PayloadDoc) {
  return {
    sections: (doc.sections ?? []).map((section: PayloadDoc) => ({
      title: String(section.title ?? ''),
      items: (section.items ?? []).map((item: PayloadDoc) => ({
        question: String(item.question ?? ''),
        answer: String(item.answer ?? ''),
      })),
    })),
  }
}

export function mapInstruments(doc: PayloadDoc) {
  return {
    items: (doc.items ?? []).map((i: PayloadDoc) => ({
      symbol: String(i.symbol ?? ''),
      name: String(i.name ?? ''),
      category: String(i.category ?? 'forex'),
      digits: Number(i.digits ?? 0),
      ...(present(i.leverageMax) ? { leverageMax: String(i.leverageMax) } : {}),
      spreadFrom: String(i.spreadFrom ?? ''),
      swapFree: Boolean(i.swapFree),
      icon: mapMedia(i.icon),
    })),
  }
}

export function mapAccounts(doc: PayloadDoc) {
  return {
    items: (doc.items ?? []).map((p: PayloadDoc) => ({
      id: String(p.planId ?? ''),
      ...(present(p.portfolioKey) ? { portfolioKey: String(p.portfolioKey) } : {}),
      name: String(p.name ?? ''),
      description: String(p.description ?? ''),
      ...(present(p.minDeposit) ? { minDeposit: String(p.minDeposit) } : {}),
      featured: Boolean(p.featured),
      features: (p.features ?? []).map((f: PayloadDoc) => ({
        label: String(f.label ?? ''),
        value: String(f.value ?? ''),
      })),
      ...(present(p.pricing?.spreadPips) && present(p.pricing?.commissionPerLotRT)
        ? {
            pricing: {
              spreadPips: Number(p.pricing.spreadPips),
              commissionPerLotRT: Number(p.pricing.commissionPerLotRT),
            },
          }
        : {}),
    })),
  }
}

export function mapPromotions(doc: PayloadDoc) {
  return {
    items: (doc.items ?? []).map((p: PayloadDoc) => ({
      id: String(p.promoId ?? ''),
      ...(present(p.enginePromoId) ? { promoId: String(p.enginePromoId) } : {}),
      badge: String(p.badge ?? ''),
      title: String(p.title ?? ''),
      description: String(p.description ?? ''),
      terms: String(p.terms ?? ''),
      ctaLabel: String(p.ctaLabel ?? ''),
      ctaHref: String(p.ctaHref ?? ''),
      featured: Boolean(p.featured),
      activeFrom: isoOrNull(p.activeFrom),
      activeTo: isoOrNull(p.activeTo),
    })),
  }
}

export function mapPartners(doc: PayloadDoc) {
  return {
    models: (doc.models ?? []).map((m: PayloadDoc) => ({
      name: String(m.name ?? ''),
      description: String(m.description ?? ''),
      features: (m.features ?? []).map((f: PayloadDoc) => String(f.text ?? '')),
    })),
    tiers: (doc.tiers ?? []).map((t: PayloadDoc) => ({
      name: String(t.name ?? ''),
      clients: String(t.clients ?? ''),
      share: String(t.share ?? ''),
      ...(t.featured ? { featured: true } : {}),
    })),
    steps: (doc.steps ?? []).map((s: PayloadDoc) => ({
      title: String(s.title ?? ''),
      text: String(s.text ?? ''),
    })),
  }
}

function optionalVideo(key: string, url: unknown) {
  const video = videoFromUrl(url)
  return video ? { [key]: video } : {}
}

function optionalVideoUrl(url: unknown) {
  const video = videoFromUrl(url)
  return video ? { videoUrl: video.url } : {}
}

export function mapAcademy(doc: PayloadDoc) {
  return {
    articles: (doc.articles ?? []).map((a: PayloadDoc) => ({
      slug: String(a.slug ?? ''),
      title: String(a.title ?? ''),
      excerpt: String(a.excerpt ?? ''),
      level: String(a.level ?? 'beginner'),
      readingMinutes: Number(a.readingMinutes ?? 1),
      bodyMarkdown: String(a.bodyMarkdown ?? ''),
      ...optionalVideo('video', a.videoUrl),
    })),
    webinars: (doc.webinars ?? []).map((w: PayloadDoc) => ({
      id: String(w.webinarId ?? ''),
      title: String(w.title ?? ''),
      speaker: String(w.speaker ?? ''),
      speakerRole: String(w.speakerRole ?? ''),
      startsAt: iso(w.startsAt),
      durationMinutes: Number(w.durationMinutes ?? 60),
      level: String(w.level ?? ''),
      description: String(w.description ?? ''),
      ...optionalVideo('recording', w.recordingUrl),
      ...(isHttpsUrl(w.joinUrl) ? { joinUrl: String(w.joinUrl).trim() } : {}),
    })),
    glossary: (doc.glossary ?? []).map((g: PayloadDoc) => ({
      term: String(g.term ?? ''),
      definition: String(g.definition ?? ''),
    })),
  }
}

export function mapStreams(doc: PayloadDoc) {
  return {
    items: (doc.items ?? []).map((s: PayloadDoc) => ({
      provider: String(s.provider ?? 'youtube'),
      videoId: String(s.videoId ?? ''),
      title: String(s.title ?? ''),
      poster: mapMedia(s.poster),
      startsAt: iso(s.startsAt),
      status: String(s.status ?? 'upcoming'),
      ...optionalVideoUrl(s.videoUrl),
    })),
  }
}

export function mapContacts(doc: PayloadDoc) {
  return {
    channels: (doc.channels ?? []).map((c: PayloadDoc) => ({
      title: String(c.title ?? ''),
      value: String(c.value ?? ''),
      detail: String(c.detail ?? ''),
    })),
    offices: (doc.offices ?? []).map((o: PayloadDoc) => ({
      city: String(o.city ?? ''),
      country: String(o.country ?? ''),
      address: String(o.address ?? ''),
    })),
  }
}

export function mapCareers(doc: PayloadDoc) {
  return {
    benefits: (doc.benefits ?? []).map((b: PayloadDoc) => ({
      title: String(b.title ?? ''),
      text: String(b.text ?? ''),
    })),
    vacancies: (doc.vacancies ?? []).map((v: PayloadDoc) => ({
      title: String(v.title ?? ''),
      department: String(v.department ?? ''),
      location: String(v.location ?? ''),
      type: String(v.type ?? ''),
      applyEmail: String(v.applyEmail ?? ''),
    })),
  }
}

export function mapLegal(doc: PayloadDoc) {
  return {
    items: (doc.items ?? []).map((d: PayloadDoc) => ({
      slug: String(d.slug ?? ''),
      title: String(d.title ?? ''),
      updatedAt: String(d.updatedAt ?? ''),
      intro: String(d.intro ?? ''),
      sections: (d.sections ?? []).map((s: PayloadDoc) => ({
        heading: String(s.heading ?? ''),
        paragraphsMarkdown: (s.paragraphsMarkdown ?? []).map((p: PayloadDoc) => String(p.text ?? '')),
      })),
    })),
  }
}

const SERVICE_STATUSES = new Set(['operational', 'degraded', 'outage'])
const INCIDENT_STATES = new Set(['investigating', 'fixing', 'resolved'])

function validIso(value: unknown): string | null {
  if (typeof value !== 'string' || value === '') return null
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

export function mapSystemStatus(doc: PayloadDoc) {
  return {
    services: (doc.services ?? []).map((s: PayloadDoc) => {
      const manualStatus = s.manualStatus === 'maintenance' ? 'maintenance' : 'auto'
      return {
        id: String(s.serviceId ?? ''),
        name: String(s.name ?? ''),
        description: String(s.description ?? ''),
        status: manualStatus === 'maintenance' ? 'maintenance' : SERVICE_STATUSES.has(s.status) ? s.status : 'operational',
        uptime90d: String(s.uptime90d ?? ''),
        check: typeof s.check === 'string' && s.check !== '' ? s.check : null,
        manualStatus,
        maintenanceNote: manualStatus === 'maintenance' && s.maintenanceNote ? String(s.maintenanceNote) : null,
        maintenanceFrom: manualStatus === 'maintenance' ? validIso(s.maintenanceFrom) : null,
        maintenanceTo: manualStatus === 'maintenance' ? validIso(s.maintenanceTo) : null,
      }
    }),
    incidents: (doc.incidents ?? []).map((i: PayloadDoc) => ({
      date: validIso(i.occurredOn)?.slice(0, 10) ?? String(i.date ?? ''),
      title: String(i.title ?? ''),
      status: String(i.status ?? ''),
      state: INCIDENT_STATES.has(i.state) ? i.state : null,
      text: String(i.text ?? ''),
    })),
  }
}

export function mapCabinetHome(doc: PayloadDoc) {
  const modules: unknown[] = []
  for (const row of doc.modules ?? []) {
    const enabled = Boolean(row.enabled)
    switch (row.type) {
      case 'profile':
      case 'promotions':
        modules.push({ type: row.type, enabled })
        break
      case 'onboarding':
        modules.push({
          type: 'onboarding',
          enabled,
          steps: {
            verification: Boolean(row.steps?.verification ?? true),
            deposit: Boolean(row.steps?.deposit ?? true),
            firstTrade: Boolean(row.steps?.firstTrade ?? true),
          },
        })
        break
      case 'balance':
        modules.push({
          type: 'balance',
          enabled,
          buttons: {
            deposit: Boolean(row.buttons?.deposit ?? true),
            withdraw: Boolean(row.buttons?.withdraw ?? true),
            buyFiat: Boolean(row.buttons?.buyFiat ?? true),
          },
        })
        break
      case 'markets':
        modules.push({
          type: 'markets',
          enabled,
          tabs: {
            assets: Boolean(row.tabs?.assets ?? true),
            popular: Boolean(row.tabs?.popular ?? true),
            newListing: Boolean(row.tabs?.newListing ?? true),
            favorites: Boolean(row.tabs?.favorites ?? false),
            gainers: Boolean(row.tabs?.gainers ?? true),
            volume: Boolean(row.tabs?.volume ?? true),
          },
          newListingSymbols: (row.newListingSymbols ?? []).map((s: PayloadDoc) => String(s.symbol ?? '')),
        })
        break
      default:
        break
    }
  }
  return { modules }
}

const SAFE_LINK = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i

function mapLexicalNode(node: unknown): PayloadDoc[] {
  if (!node || typeof node !== 'object') return []
  const source = node as PayloadDoc
  const children = Array.isArray(source.children) ? source.children.flatMap(mapLexicalNode) : undefined
  switch (source.type) {
    case 'upload': {
      const media = mapMedia(source.value)
      return media && media.mimeType.startsWith('image/')
        ? [{ type: 'upload', version: source.version ?? 3, format: source.format ?? '', media }]
        : []
    }
    case 'block': {
      const fields = (source.fields ?? {}) as PayloadDoc
      if (fields.blockType !== 'video') return []
      const video = videoFromUrl(fields.url)
      if (!video) return []
      const caption = typeof fields.caption === 'string' && fields.caption.trim() ? { caption: fields.caption.trim() } : {}
      return [{ type: 'block', version: source.version ?? 2, format: source.format ?? '', fields: { blockType: 'video', video, ...caption } }]
    }
    case 'link':
    case 'autolink': {
      const fields = (source.fields ?? {}) as PayloadDoc
      const url = typeof fields.url === 'string' ? fields.url.trim() : ''
      if (fields.linkType === 'internal' || !SAFE_LINK.test(url)) return children ?? []
      return [{ ...source, fields: { url, newTab: Boolean(fields.newTab) }, children: children ?? [] }]
    }
    case 'relationship':
      return []
    default: {
      const { children: _children, ...rest } = source
      return [children ? { ...rest, children } : rest]
    }
  }
}

export function mapLexicalBody(body: unknown): PayloadDoc | null {
  const root = (body as PayloadDoc | null | undefined)?.root
  if (!root || typeof root !== 'object' || !Array.isArray(root.children)) return null
  const children = (root.children as unknown[]).flatMap(mapLexicalNode)
  if (children.length === 0) return null
  return { root: { ...root, children } }
}

const minutes = (value: unknown) => {
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n > 0 ? n : 1
}

function articleCategory(doc: PayloadDoc): { slug: string; title?: string } {
  const ref = doc.articleCategory
  if (ref && typeof ref === 'object' && typeof ref.slug === 'string' && ref.slug) {
    return { slug: ref.slug, ...(typeof ref.title === 'string' && ref.title ? { title: ref.title } : {}) }
  }
  return { slug: String(doc.category ?? '') }
}

export function mapArticle(doc: PayloadDoc) {
  const section = doc.section === 'education' ? 'education' : 'news'
  const category = articleCategory(doc)
  const body = mapLexicalBody(doc.body)
  const cover = mapMedia(doc.cover)
  return {
    slug: String(doc.slug ?? ''),
    title: String(doc.title ?? ''),
    excerpt: String(doc.excerpt ?? ''),
    category: section === 'news' ? category.slug : '',
    source: String(doc.source ?? ''),
    publishedAt: iso(doc.publishedAt),
    readingMinutes: minutes(doc.readingMinutes),
    bodyMarkdown: String(doc.bodyMarkdown ?? ''),
    section,
    ...(body ? { body } : {}),
    ...(cover ? { cover } : {}),
    ...(section === 'news' && category.title ? { categoryTitle: category.title } : {}),
    ...(section === 'education'
      ? { level: articleLevel(doc.level), ...optionalVideo('video', doc.videoUrl) }
      : {}),
  }
}

const ARTICLE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export type ArticleLevel = (typeof ARTICLE_LEVELS)[number]

/** Уровень статьи обучения в контракте; неизвестное значение читается как «Начальный». */
export function articleLevel(value: unknown): ArticleLevel {
  return (ARTICLE_LEVELS as readonly unknown[]).includes(value) ? (value as ArticleLevel) : 'beginner'
}

export function mapAcademyArticle(doc: PayloadDoc) {
  return {
    slug: String(doc.slug ?? ''),
    title: String(doc.title ?? ''),
    excerpt: String(doc.excerpt ?? ''),
    level: articleLevel(doc.level),
    readingMinutes: minutes(doc.readingMinutes),
    bodyMarkdown: String(doc.bodyMarkdown ?? ''),
    ...optionalVideo('video', doc.videoUrl),
  }
}

const ONBOARDING_LABEL_KEYS = ['back', 'next', 'skip', 'done', 'help', 'stepOf'] as const

/** Экскурсия: только включённые части; шаг без текста или с чужим элементом не отдаётся. */
export function mapOnboarding(doc: PayloadDoc) {
  const parts: { part: string; version: number; steps: { anchor: string; title: string; body: string }[] }[] = []
  for (const row of doc.parts ?? []) {
    if (!row.enabled || !isOnboardingPart(row.part)) continue
    const steps = ((row.steps ?? []) as PayloadDoc[])
      .filter((s) => anchorFitsPart(s.anchor, row.part))
      .map((s) => ({ anchor: String(s.anchor), title: String(s.title ?? ''), body: String(s.body ?? '') }))
      .filter((s) => s.title.trim() !== '' || s.body.trim() !== '')
    const version = Number.isInteger(row.version) && row.version >= 1 ? (row.version as number) : 1
    parts.push({ part: row.part, version, steps })
  }
  const labels: Record<string, string> = {}
  for (const key of ONBOARDING_LABEL_KEYS) labels[key] = String(doc.labels?.[key] ?? '')
  return { parts, labels }
}
