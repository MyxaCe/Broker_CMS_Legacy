import 'dotenv/config'

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { RESOURCE_TO_COLLECTION } from '../src/collections/content/index'
import { mapFaq } from '../src/lib/contract/mappers'
import { PLATFORM_INSTRUMENTS_SLUG, refreshPlatformInstruments, TERMINAL_PAIRS, toPlatformInstrumentsDto } from '../src/lib/platform-instruments'
import { ensureSiteSkeleton } from '../src/lib/site-skeleton'
import { runSeed } from '../src/seed/run'

type Doc = Record<string, any>

const SITE = 'apex-ru'
const NEW_SITE = 'redeploy-new'
const LOCALES = ['ru', 'en'] as const
const silent = () => {}

const payload = await getPayload({ config })
const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: any[] }> } }).drizzle
const fixture = (resource: string, locale: string) =>
  JSON.parse(readFileSync(path.join(process.cwd(), 'contract', 'fixtures', `cms.${resource}.${locale}.json`), 'utf8'))

const empty = await db.execute(sql`SELECT to_regclass('public.sites') AS t`)
assert.equal(empty.rows[0]?.t ?? null, null, 'нужна пустая база: тест выкатки создаёт схему сам')

async function deploy() {
  await payload.db.migrate()
  return runSeed(payload, SITE, silent)
}

async function siteId(slug: string) {
  const found = await payload.find({ collection: 'sites', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  return (found.docs[0] as Doc | undefined)?.id as number
}

async function doc(collection: string, site: number, locale: string) {
  const found = await payload.find({
    collection: collection as never,
    where: { site: { equals: site } },
    locale: locale as never,
    fallbackLocale: false as never,
    depth: 0,
    limit: 1,
  })
  return found.docs[0] as Doc
}

async function snapshot(site: number) {
  const out: Record<string, unknown> = {}
  for (const collection of Object.values(RESOURCE_TO_COLLECTION)) {
    for (const locale of LOCALES) out[`${collection}:${locale}`] = await doc(collection, site, locale)
  }
  const articles = await payload.find({ collection: 'articles', where: { site: { equals: site } }, limit: 100, depth: 0, sort: 'slug' })
  for (const article of articles.docs as Doc[]) {
    for (const locale of LOCALES) {
      out[`articles/${article.slug}:${locale}`] = await payload.findByID({
        collection: 'articles',
        id: article.id,
        locale,
        fallbackLocale: false as never,
        depth: 0,
      })
    }
  }
  out.site = (await payload.findByID({ collection: 'sites', id: site, depth: 0 })) as Doc
  const versions = await db.execute(sql`
    SELECT (SELECT count(*)::int FROM "_site_faq_v") AS faq, (SELECT count(*)::int FROM "_site_accounts_v") AS accounts,
           (SELECT count(*)::int FROM "_site_promotions_v") AS promotions, (SELECT count(*)::int FROM "_articles_v") AS articles`)
  out.versions = versions.rows[0]
  out.platform = await payload.findGlobal({ slug: PLATFORM_INSTRUMENTS_SLUG as never, depth: 0 })
  out.platformComputed = toPlatformInstrumentsDto(await refreshPlatformInstruments(payload))
  return JSON.parse(JSON.stringify(out))
}

const first = await deploy()
assert.ok(first.created.includes('site') && first.created.includes('faq') && first.created.includes('accounts'))
const site = await siteId(SITE)
for (const locale of LOCALES) {
  assert.deepEqual(mapFaq(await doc('site-faq', site, locale)), fixture('faq', locale))
}
const platformFirst = await refreshPlatformInstruments(payload)
assert.equal(platformFirst.version, 2)
assert.deepEqual(platformFirst.instruments, TERMINAL_PAIRS.map((symbol) => ({ symbol, mode: 'trade' })))
const siteFirst = (await payload.findByID({ collection: 'sites', id: site, depth: 0 })) as Doc
assert.deepEqual(siteFirst.instruments, [...TERMINAL_PAIRS])
assert.deepEqual(siteFirst.closeOnlyInstruments, [])
console.info('OK    первая выкатка на пустую базу: сайт и контент ru/en из фикстур, у сайта 30 пар, платформа = 30 пар (version 2)')

const faqRu = await doc('site-faq', site, 'ru')
faqRu.sections[0].items[0].answer = 'Правка редактора: минимальное пополнение {{deposit.min}}.'
await payload.update({ collection: 'site-faq', id: faqRu.id, locale: 'ru', data: { sections: faqRu.sections, _status: 'published' } as never })
const faqEn = await doc('site-faq', site, 'en')
faqEn.sections[0].title = 'Editor title'
await payload.update({ collection: 'site-faq', id: faqEn.id, locale: 'en', data: { sections: faqEn.sections, _status: 'published' } as never })
const accountsEn = await doc('site-accounts', site, 'en')
accountsEn.items[0].description = 'Editor description'
await payload.update({ collection: 'site-accounts', id: accountsEn.id, locale: 'en', data: { items: accountsEn.items, _status: 'published' } as never })
const promotionsRu = await doc('site-promotions', site, 'ru')
promotionsRu.items[0].title = 'Правка редактора'
promotionsRu.items[0].enginePromoId = 'welcome-bonus'
await payload.update({ collection: 'site-promotions', id: promotionsRu.id, locale: 'ru', data: { items: promotionsRu.items, _status: 'published' } as never })
const navigationRu = await doc('site-navigation', site, 'ru')
await payload.update({ collection: 'site-navigation', id: navigationRu.id, locale: 'ru', data: { header: [], _status: 'published' } as never })
const article = (await payload.find({ collection: 'articles', where: { site: { equals: site } }, limit: 1, depth: 0 })).docs[0] as Doc
await payload.update({ collection: 'articles', id: article.id, locale: 'ru', data: { title: 'Правка редактора', _status: 'published' } as never })
await payload.update({
  collection: 'sites',
  id: site,
  data: { name: 'Edited Brand', heroBackground: 'off', instruments: ['ETHUSD', 'BTCUSD', 'LTCUSD'], closeOnlyInstruments: ['LTCUSD'] } as never,
})
const platformEdited = await refreshPlatformInstruments(payload)
assert.equal(platformEdited.version, 3)
assert.deepEqual(platformEdited.instruments, [
  { symbol: 'ETHUSD', mode: 'trade' },
  { symbol: 'BTCUSD', mode: 'trade' },
  { symbol: 'LTCUSD', mode: 'closeOnly' },
])
console.info('OK    редактор поправил ru и en (FAQ, тарифы, акции, навигация, статья, бренд) и инструменты сайта с режимом «только закрытие»')

const before = await snapshot(site)
const second = await deploy()
assert.deepEqual(second.created, [])
const after = await snapshot(site)
assert.deepEqual(after, before)
console.info('OK    повторная выкатка (миграции + сид): ru/en, бренд, инструменты сайта и вычисленный список платформы (version 3) не изменились, новых версий нет')

const third = await deploy()
assert.deepEqual(third.created, [])
assert.deepEqual(await snapshot(site), before)
console.info('OK    третья выкатка: без изменений')

await payload.create({ collection: 'sites', data: { slug: NEW_SITE, name: 'New', primaryColor: '#d4a437', demoStartBalanceCents: 0 } as never })
const fresh = await siteId(NEW_SITE)
await ensureSiteSkeleton(payload, fresh)
const skeleton = await doc('site-faq', fresh, 'ru')
assert.equal(skeleton._status, 'draft')
const seeded = await runSeed(payload, NEW_SITE, silent)
assert.ok(seeded.created.includes('faq') && seeded.created.includes('accounts'))
for (const locale of LOCALES) {
  assert.deepEqual(mapFaq(await doc('site-faq', fresh, locale)), fixture('faq', locale))
}
const freshBefore = await snapshot(fresh)
await runSeed(payload, NEW_SITE, silent)
assert.deepEqual(await snapshot(fresh), freshBefore)
console.info('OK    новый сайт: нетронутый каркас заполняется из фикстур один раз')

console.info('\nALL OK')
process.exit(0)
