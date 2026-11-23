import type { Payload } from 'payload'

import { CONTENT_BUILDERS } from '../../seed/builders'
import { LANGUAGES, type Language } from '../languages'

type Doc = Record<string, any>

export const TRANSLATED_LOCALES: Language[] = ['de', 'fr', 'es']

const IDENTITY_KEYS = ['slug', 'planId', 'portfolioKey', 'promoId', 'enginePromoId', 'symbol', 'webinarId', 'serviceId', 'videoId', 'provider']
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

export interface TranslationsFile {
  site: string
  locales: Partial<Record<Language, Record<string, any>>>
}

export interface ImportOptions {
  apply: boolean
  site?: string
  locales?: Language[]
  log?: (line: string) => void
}

export interface ImportSummary {
  planned: number
  written: number
  unchanged: number
  skipped: number
  errors: number
}

export class StructureMismatch extends Error {}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' && ISO_RE.test(value)) return new Date(value).toISOString()
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    const out: Doc = {}
    for (const [k, v] of Object.entries(value)) {
      if (k === 'id' || v === undefined) continue
      out[k] = normalize(v)
    }
    return out
  }
  return value ?? null
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
}

function isPlainObject(value: unknown): value is Doc {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
}

export function overlay(base: unknown, translated: unknown, path: string): unknown {
  if (Array.isArray(translated)) {
    // Payload отдаёт пустой локализованный массив как null: пустой перевод к пустому документу — не расхождение,
    // и значение остаётся в форме Payload, чтобы повторный импорт видел «без изменений».
    if (translated.length === 0 && (base === null || base === undefined)) return null
    if (!Array.isArray(base)) throw new StructureMismatch(`${path}: в документе нет массива`)
    if (base.length !== translated.length) {
      throw new StructureMismatch(`${path}: в документе ${base.length} строк, в переводе ${translated.length}`)
    }
    return translated.map((row, i) => overlay(base[i], row, `${path}.${i}`))
  }
  if (isPlainObject(translated)) {
    const source = isPlainObject(base) ? base : {}
    const out: Doc = {}
    for (const [k, v] of Object.entries(source)) {
      if (k === 'id') continue
      out[k] = v
    }
    for (const [k, v] of Object.entries(translated)) {
      if (IDENTITY_KEYS.includes(k) && source[k] !== undefined && !same(source[k], v)) {
        throw new StructureMismatch(`${path}.${k}: в документе «${String(source[k])}», в переводе «${String(v)}»`)
      }
      out[k] = overlay(source[k], v, `${path}.${k}`)
    }
    return out
  }
  return translated
}

function localizedFieldNames(payload: Payload, collection: string): string[] {
  const collections = payload.collections as unknown as Record<string, { config: { fields: Doc[] } } | undefined>
  const fields = collections[collection]?.config.fields ?? []
  return fields.filter((f) => typeof f.name === 'string' && Boolean(f.localized)).map((f) => f.name as string)
}

function pick(doc: Doc | undefined, keys: string[]): Doc {
  const out: Doc = {}
  for (const k of keys) out[k] = doc?.[k] ?? null
  return out
}

async function readLocale(payload: Payload, collection: string, id: string | number, locale: Language) {
  return (await payload.findByID({
    collection: collection as never,
    id,
    locale,
    fallbackLocale: false as never,
    draft: false,
    depth: 0,
    disableErrors: true,
  })) as Doc | null
}

async function hasPendingDraft(payload: Payload, collection: string, id: string | number) {
  const latest = (await payload.findByID({
    collection: collection as never,
    id,
    draft: true,
    depth: 0,
    disableErrors: true,
  })) as Doc | null
  return latest?._status === 'draft'
}

interface Target {
  label: string
  collection: string
  id: string | number
  desired: Doc
}

async function syncTarget(
  payload: Payload,
  target: Target,
  locale: Language,
  opts: ImportOptions,
  summary: ImportSummary,
) {
  const log = opts.log ?? console.info
  const keys = Object.keys(target.desired)
  const current = await readLocale(payload, target.collection, target.id, locale)
  if (same(pick(current ?? undefined, keys), target.desired)) {
    summary.unchanged++
    log(`  ${locale} ${target.label}: без изменений`)
    return
  }
  if (await hasPendingDraft(payload, target.collection, target.id)) {
    summary.skipped++
    log(`  ${locale} ${target.label}: ПРОПУЩЕНО — есть неопубликованный черновик, публикация перевода опубликовала бы и его`)
    return
  }
  const changed = keys.filter((k) => !same(current?.[k] ?? null, target.desired[k]))
  summary.planned++
  if (!opts.apply) {
    log(`  ${locale} ${target.label}: будет записано (${changed.join(', ')})`)
    return
  }
  const guarded = LANGUAGES.filter((l) => l !== locale)
  const fields = localizedFieldNames(payload, target.collection)
  const before: Partial<Record<Language, Doc>> = {}
  for (const other of guarded) {
    before[other] = pick((await readLocale(payload, target.collection, target.id, other)) ?? undefined, fields)
  }
  await payload.update({
    collection: target.collection as never,
    id: target.id,
    locale,
    depth: 0,
    context: { trustReadingMinutes: true },
    data: { ...target.desired, _status: 'published' } as never,
  })
  for (const other of guarded) {
    const after = pick((await readLocale(payload, target.collection, target.id, other)) ?? undefined, fields)
    if (JSON.stringify(after) !== JSON.stringify(before[other])) {
      summary.errors++
      log(`  ОШИБКА ${locale} ${target.label}: запись затронула локаль ${other}`)
    }
  }
  summary.written++
  log(`  ${locale} ${target.label}: записано (${changed.join(', ')})`)
}

async function findSiteId(payload: Payload, slug: string) {
  const found = await payload.find({ collection: 'sites', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  const site = found.docs[0] as Doc | undefined
  if (!site) throw new Error(`сайт «${slug}» не найден`)
  return site.id as string | number
}

async function contentTargets(
  payload: Payload,
  siteId: string | number,
  resources: Record<string, any>,
  log: (line: string) => void,
  summary: ImportSummary,
  baseLocale: Language | null,
): Promise<Target[]> {
  const targets: Target[] = []
  for (const [resource, dto] of Object.entries(resources)) {
    if (resource === 'articles' || resource === 'academy') {
      const section = resource === 'articles' ? 'news' : 'education'
      const items = ((resource === 'articles' ? dto?.items : dto?.articles) ?? []) as Doc[]
      for (const item of items) {
        const found = await payload.find({
          collection: 'articles',
          where: { and: [{ site: { equals: siteId } }, { slug: { equals: item.slug } }, { section: { equals: section } }] },
          limit: 1,
          depth: 0,
        })
        const doc = found.docs[0] as Doc | undefined
        if (!doc) {
          summary.skipped++
          log(`  articles/${item.slug}: ПРОПУЩЕНО — статьи нет на сайте`)
          continue
        }
        targets.push({
          label: `articles/${item.slug}`,
          collection: 'articles',
          id: doc.id,
          desired: {
            title: item.title,
            excerpt: item.excerpt,
            ...(section === 'news' ? { source: item.source } : {}),
            bodyMarkdown: item.bodyMarkdown,
            ...(item.readingMinutes ? { readingMinutes: item.readingMinutes } : {}),
          },
        })
      }
      if (resource === 'articles') continue
    }
    const builder = CONTENT_BUILDERS[resource]
    if (!builder) {
      summary.skipped++
      log(`  ${resource}: ПРОПУЩЕНО — ресурс не локализуется импортом`)
      continue
    }
    const found = await payload.find({
      collection: builder.collection as never,
      where: { site: { equals: siteId } },
      limit: 1,
      depth: 0,
    })
    const doc = found.docs[0] as Doc | undefined
    if (!doc) {
      summary.skipped++
      log(`  ${resource}: ПРОПУЩЕНО — у сайта нет документа`)
      continue
    }
    const localized = localizedFieldNames(payload, builder.collection)
    const built = builder.build(resource === 'academy' ? { ...dto, articles: undefined } : dto)
    const base = baseLocale ? await readLocale(payload, builder.collection, doc.id, baseLocale) : null
    const desired: Doc = {}
    try {
      for (const field of localized) {
        if (!(field in built)) continue
        desired[field] = base ? overlay(base[field], built[field], `${resource}.${field}`) : built[field]
      }
    } catch (error) {
      if (!(error instanceof StructureMismatch)) throw error
      summary.errors++
      log(`  ОШИБКА ${resource}: структура перевода не совпадает с документом сайта — ${error.message}`)
      continue
    }
    targets.push({ label: resource, collection: builder.collection, id: doc.id, desired })
  }
  return targets
}

function emptySummary(): ImportSummary {
  return { planned: 0, written: 0, unchanged: 0, skipped: 0, errors: 0 }
}

export async function importTranslations(
  payload: Payload,
  file: TranslationsFile,
  opts: ImportOptions,
): Promise<ImportSummary> {
  const log = opts.log ?? console.info
  const summary = emptySummary()
  const siteId = await findSiteId(payload, opts.site ?? file.site)
  const requested = opts.locales ?? TRANSLATED_LOCALES
  const forbidden = requested.filter((l) => !TRANSLATED_LOCALES.includes(l))
  if (forbidden.length) throw new Error(`локали ${forbidden.join(', ')} импортом переводов не пишутся`)
  const locales = requested.filter((l) => file.locales[l])
  for (const locale of locales) {
    log(`[${locale}]`)
    const targets = await contentTargets(payload, siteId, file.locales[locale]!, log, summary, 'en')
    for (const target of targets) await syncTarget(payload, target, locale, opts, summary)
  }
  return summary
}

export async function importFaqLive(
  payload: Payload,
  file: TranslationsFile,
  opts: ImportOptions,
): Promise<ImportSummary> {
  const log = opts.log ?? console.info
  const summary = emptySummary()
  const siteId = await findSiteId(payload, opts.site ?? file.site)
  const missing = LANGUAGES.filter((l) => !file.locales[l])
  if (missing.length) throw new Error(`в файле FAQ нет локалей: ${missing.join(', ')}`)
  for (const locale of LANGUAGES) {
    log(`[${locale}]`)
    const targets = await contentTargets(payload, siteId, { faq: file.locales[locale] }, log, summary, null)
    for (const target of targets) await syncTarget(payload, target, locale, opts, summary)
  }
  return summary
}

export function formatSummary(summary: ImportSummary, apply: boolean): string {
  const mode = apply ? 'запись' : 'просмотр (dry-run), база не менялась'
  const action = apply ? `записано: ${summary.written}` : `будет записано: ${summary.planned}`
  return `Итог — ${mode}. ${action}; без изменений: ${summary.unchanged}; пропущено: ${summary.skipped}; ошибок: ${summary.errors}`
}
