import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { Payload } from 'payload'

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

  const articlesRu = fixture('articles', 'ru').items
  const articlesEn = fixture('articles', 'en').items
  let articlesCreated = 0
  for (const ru of articlesRu) {
    const found = await payload.find({
      collection: 'articles',
      where: { and: [{ site: { equals: siteId } }, { slug: { equals: ru.slug } }] },
      limit: 1,
      depth: 0,
    })
    if (found.docs[0]) continue
    const created = await payload.create({
      collection: 'articles',
      locale: 'ru',
      data: {
        site: siteId,
        slug: ru.slug,
        category: ru.category,
        publishedAt: ru.publishedAt,
        readingMinutes: ru.readingMinutes,
        title: ru.title,
        excerpt: ru.excerpt,
        source: ru.source,
        bodyMarkdown: ru.bodyMarkdown,
        _status: 'published',
      } as never,
    })
    const en = articlesEn.find((a: any) => a.slug === ru.slug)
    if (en) {
      await payload.update({
        collection: 'articles',
        id: created.id,
        locale: 'en',
        data: { title: en.title, excerpt: en.excerpt, source: en.source, bodyMarkdown: en.bodyMarkdown, _status: 'published' } as never,
      })
    }
    articlesCreated++
  }
  log(`[seed] ${siteSlug}: статей создано ${articlesCreated}, уже было ${articlesRu.length - articlesCreated}`)
  return summary
}
