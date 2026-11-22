import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { Payload } from 'payload'

import { categoryTitles } from '../lib/article-categories'
import { LANGUAGES } from '../lib/languages'
import { TERMINAL_PAIRS } from '../lib/platform-instruments'
import { CONTENT_BUILDERS } from './builders'

type Locale = 'ru' | 'en'
const LOCALES: Locale[] = ['ru', 'en']

export interface SeedSummary {
  created: string[]
  kept: string[]
}

function fixture(resource: string, locale: Locale): any {
  const file = path.join(process.cwd(), 'contract', 'fixtures', `cms.${resource}.${locale}.json`)
  return JSON.parse(readFileSync(file, 'utf8'))
}

async function isUntouchedSkeleton(payload: Payload, collection: string, doc: Record<string, any>) {
  if (doc._status === 'published') return false
  const versions = await payload.findVersions({
    collection: collection as never,
    where: { parent: { equals: doc.id } },
    limit: 2,
    depth: 0,
  })
  return versions.totalDocs <= 1
}

export async function runSeed(
  payload: Payload,
  siteSlug: string,
  log: (line: string) => void = console.info,
): Promise<SeedSummary> {
  const summary: SeedSummary = { created: [], kept: [] }

  const brandRu = fixture('brand', 'ru')
  const existingSite = await payload.find({
    collection: 'sites',
    where: { slug: { equals: siteSlug } },
    limit: 1,
    depth: 0,
  })
  let siteId = existingSite.docs[0]?.id
  if (siteId === undefined) {
    const created = await payload.create({
      collection: 'sites',
      data: {
        slug: siteSlug,
        name: brandRu.name,
        primaryColor: brandRu.primaryColor,
        socials: brandRu.socials,
        demoStartBalanceCents: 1000000,
        instruments: [...TERMINAL_PAIRS],
      } as never,
    })
    siteId = created.id
    summary.created.push('site')
    log(`[seed] site created: ${siteSlug} (инструменты: ${TERMINAL_PAIRS.length} пар терминала)`)
  } else {
    summary.kept.push('site')
    log(`[seed] site already exists: ${siteSlug}`)
  }

  for (const [resource, def] of Object.entries(CONTENT_BUILDERS)) {
    const existing = await payload.find({
      collection: def.collection as never,
      where: { site: { equals: siteId } },
      limit: 1,
      depth: 0,
    })
    const doc = existing.docs[0] as Record<string, any> | undefined
    if (doc && !(await isUntouchedSkeleton(payload, def.collection, doc))) {
      summary.kept.push(resource)
      continue
    }
    let docId = doc?.id as string | number | undefined
    for (const locale of LOCALES) {
      const data = { ...def.build(fixture(resource, locale)), site: siteId, _status: 'published' }
      if (docId === undefined) {
        const created = await payload.create({ collection: def.collection as never, locale, data: data as never })
        docId = (created as { id: string | number }).id
      } else {
        await payload.update({ collection: def.collection as never, id: docId, locale, data: data as never })
      }
    }
    summary.created.push(resource)
  }
  log(`[seed] ${siteSlug}: записано из фикстур — ${summary.created.filter((r) => r !== 'site').join(', ') || 'ничего'}; уже есть, не тронуто — ${summary.kept.filter((r) => r !== 'site').join(', ') || 'ничего'}`)

  const categoryIds = new Map<string, string | number>()
  async function ensureCategory(slug: string) {
    const cached = categoryIds.get(slug)
    if (cached !== undefined) return cached
    const found = await payload.find({
      collection: 'article-categories',
      where: { and: [{ site: { equals: siteId } }, { slug: { equals: slug } }] },
      limit: 1,
      depth: 0,
    })
    let id = found.docs[0]?.id as string | number | undefined
    if (id === undefined) {
      const titles = categoryTitles(slug)
      const created = await payload.create({
        collection: 'article-categories',
        locale: 'ru',
        data: { site: siteId, slug, title: titles.ru ?? slug } as never,
      })
      id = created.id
      for (const locale of LANGUAGES) {
        if (locale === 'ru' || !titles[locale]) continue
        await payload.update({ collection: 'article-categories', id, locale, data: { title: titles[locale] } as never })
      }
    }
    categoryIds.set(slug, id)
    return id
  }

  const EDUCATION_BASE = Date.parse('2026-07-01T09:00:00Z')
  const sources = [
    { section: 'news' as const, ru: fixture('articles', 'ru').items as any[], en: fixture('articles', 'en').items as any[] },
    { section: 'education' as const, ru: fixture('academy', 'ru').articles as any[], en: fixture('academy', 'en').articles as any[] },
  ]
  for (const { section, ru: itemsRu, en: itemsEn } of sources) {
    let created = 0
    for (const [index, ru] of itemsRu.entries()) {
      const found = await payload.find({
        collection: 'articles',
        where: { and: [{ site: { equals: siteId } }, { slug: { equals: ru.slug } }, { section: { equals: section } }] },
        limit: 1,
        depth: 0,
      })
      if (found.docs[0]) continue
      const common =
        section === 'news'
          ? { articleCategory: await ensureCategory(ru.category), category: ru.category, publishedAt: ru.publishedAt }
          : { level: ru.level, publishedAt: new Date(EDUCATION_BASE - index * 60_000).toISOString() }
      const localized = (item: any) => ({
        title: item.title,
        excerpt: item.excerpt,
        bodyMarkdown: item.bodyMarkdown,
        readingMinutes: item.readingMinutes,
        ...(section === 'news' ? { source: item.source } : {}),
        ...(item.video?.url ? { videoUrl: item.video.url } : {}),
      })
      const doc = await payload.create({
        collection: 'articles',
        locale: 'ru',
        context: { trustReadingMinutes: true },
        data: { site: siteId, slug: ru.slug, section, ...common, ...localized(ru), _status: 'published' } as never,
      })
      const en = itemsEn.find((a: any) => a.slug === ru.slug)
      if (en) {
        await payload.update({
          collection: 'articles',
          id: doc.id,
          locale: 'en',
          context: { trustReadingMinutes: true },
          data: { ...localized(en), _status: 'published' } as never,
        })
      }
      created++
    }
    log(`[seed] ${siteSlug}: статей (${section}) создано ${created}, уже было ${itemsRu.length - created}`)
  }
  return summary
}
