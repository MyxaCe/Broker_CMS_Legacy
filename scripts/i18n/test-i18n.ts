import 'dotenv/config'

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import config from '@payload-config'
import { getPayload } from 'payload'

import { RESOURCE_TO_COLLECTION } from '../../src/collections/content/index'
import { importFaqLive, importTranslations, type TranslationsFile } from '../../src/lib/i18n/import'
import { LANGUAGES, type Language } from '../../src/lib/languages'
import { CONTENT_BUILDERS } from '../../src/seed/builders'

type Doc = Record<string, any>

const SITE = process.env.DEFAULT_SITE ?? 'apex-ru'
const TEST_SITE = 'i18n-test'
const root = process.cwd()
const translations = JSON.parse(
  readFileSync(path.join(root, 'scripts/i18n/content.de-fr-es.json'), 'utf8'),
) as TranslationsFile
const faqLive = JSON.parse(readFileSync(path.join(root, 'scripts/i18n/faq-live.json'), 'utf8')) as TranslationsFile

const payload = await getPayload({ config })
let failures = 0
const silent = () => {}

async function check(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    console.info(`OK    ${name}`)
  } catch (error) {
    failures++
    console.info(`FAIL  ${name}\n      ${error instanceof Error ? error.message : String(error)}`)
  }
}

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => k !== 'id')
        .map(([k, v]) => [k, strip(v)]),
    )
  }
  return value
}

async function siteId(slug: string) {
  const found = await payload.find({ collection: 'sites', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  return (found.docs[0] as Doc | undefined)?.id as number | undefined
}

async function contentDoc(collection: string, id: number, locale: Language, fallback = false) {
  const found = await payload.find({
    collection: collection as never,
    where: { site: { equals: id } },
    locale,
    ...(fallback ? {} : { fallbackLocale: false as never }),
    depth: 0,
    limit: 1,
  })
  return found.docs[0] as Doc | undefined
}

async function snapshot(id: number, locales: Language[]) {
  const out: Record<string, unknown> = {}
  for (const collection of Object.values(RESOURCE_TO_COLLECTION)) {
    for (const locale of locales) {
      const doc = await contentDoc(collection, id, locale)
      if (doc) {
        const { updatedAt: _u, createdAt: _c, ...rest } = doc
        out[`${collection}:${locale}`] = rest
      }
    }
  }
  const articles = await payload.find({ collection: 'articles', where: { site: { equals: id } }, limit: 100, depth: 0 })
  for (const article of articles.docs as Doc[]) {
    for (const locale of locales) {
      const doc = (await payload.findByID({
        collection: 'articles',
        id: article.id,
        locale,
        fallbackLocale: false as never,
        depth: 0,
      })) as Doc
      out[`articles:${article.slug}:${locale}`] = {
        title: doc.title,
        excerpt: doc.excerpt,
        source: doc.source,
        bodyMarkdown: doc.bodyMarkdown,
      }
    }
  }
  return JSON.stringify(out)
}

async function versionCount(id: number) {
  let total = 0
  for (const collection of Object.values(RESOURCE_TO_COLLECTION)) {
    const doc = await contentDoc(collection, id, 'ru')
    if (!doc) continue
    const versions = await payload.findVersions({
      collection: collection as never,
      where: { parent: { equals: doc.id } },
      limit: 1,
    })
    total += versions.totalDocs
  }
  return total
}

async function removeSite(slug: string) {
  const id = await siteId(slug)
  if (id === undefined) return
  for (const collection of Object.values(RESOURCE_TO_COLLECTION)) {
    await payload.delete({ collection: collection as never, where: { site: { equals: id } } })
  }
  await payload.delete({ collection: 'sites', id })
}

const PARAM_RE = /\{\{[^{}]+\}\}/g
function faqParams(dto: Doc) {
  return (dto.sections as Doc[]).map((s) =>
    (s.items as Doc[]).map((i) => [...`${i.question} ${i.answer}`.matchAll(PARAM_RE)].map((m) => m[0]).sort()),
  )
}

await removeSite(TEST_SITE)

await check('sites: новые сайты получают ["ru","en"] и "ru"', async () => {
  const created = (await payload.create({
    collection: 'sites',
    data: { slug: TEST_SITE, name: 'Test', primaryColor: '#123456', demoStartBalanceCents: 0 } as never,
  })) as Doc
  assert.deepEqual(created.languages, ['ru', 'en'])
  assert.equal(created.defaultLanguage, 'ru')
})

for (const [name, data] of [
  ['пустой список языков', { languages: [] }],
  ['неизвестный код', { languages: ['ru', 'it'] }],
  ['язык дважды', { languages: ['ru', 'ru'] }],
  ['язык по умолчанию вне списка', { languages: ['ru', 'en'], defaultLanguage: 'de' }],
  ['убрать из списка язык по умолчанию', { languages: ['en', 'de'], defaultLanguage: 'ru' }],
] as const) {
  await check(`sites: отказ — ${name}`, async () => {
    const id = await siteId(TEST_SITE)
    await assert.rejects(payload.update({ collection: 'sites', id: id!, data: data as never }))
    const after = (await payload.findByID({ collection: 'sites', id: id!, depth: 0 })) as Doc
    assert.deepEqual(after.languages, ['ru', 'en'])
    assert.equal(after.defaultLanguage, 'ru')
  })
}

await check('sites: порядок языков сохраняется', async () => {
  const id = await siteId(TEST_SITE)
  const updated = (await payload.update({
    collection: 'sites',
    id: id!,
    data: { languages: ['de', 'es', 'ru'], defaultLanguage: 'es' } as never,
  })) as Doc
  assert.deepEqual(updated.languages, ['de', 'es', 'ru'])
  assert.equal(updated.defaultLanguage, 'es')
})

await removeSite(TEST_SITE)

const apex = await siteId(SITE)
assert.ok(apex, `сайт ${SITE} не найден — сначала pnpm seed`)

await check('sites: у сайта из сида языки по умолчанию', async () => {
  const site = (await payload.findByID({ collection: 'sites', id: apex!, depth: 0 })) as Doc
  assert.deepEqual(site.languages, ['ru', 'en'])
  assert.equal(site.defaultLanguage, 'ru')
})

await check('запасной язык: de/fr/es без перевода отдают английский, а не русский', async () => {
  for (const locale of ['de', 'fr', 'es'] as const) {
    const raw = await contentDoc('site-navigation', apex!, locale)
    assert.equal(raw?.header ?? null, null, `${locale} уже заполнена — тест запасного языка нужен до импорта`)
    const withFallback = await contentDoc('site-navigation', apex!, locale, true)
    const en = await contentDoc('site-navigation', apex!, 'en')
    const ru = await contentDoc('site-navigation', apex!, 'ru')
    assert.deepEqual(strip(withFallback?.header), strip(en?.header))
    assert.equal(withFallback?.riskWarning, en?.riskWarning)
    assert.notEqual(withFallback?.riskWarning, ru?.riskWarning)
  }
})

const ruEnBefore = await snapshot(apex!, ['ru', 'en'])
const versionsBefore = await versionCount(apex!)

await check('импорт: dry-run ничего не пишет', async () => {
  const summary = await importTranslations(payload, translations, { apply: false, log: silent })
  assert.ok(summary.planned > 0)
  assert.equal(summary.written, 0)
  assert.equal(summary.errors, 0)
  assert.equal((await contentDoc('site-navigation', apex!, 'de'))?.header ?? null, null)
  assert.equal(await versionCount(apex!), versionsBefore)
})

await check('импорт: --apply пишет de/fr/es и не трогает ru/en', async () => {
  const summary = await importTranslations(payload, translations, { apply: true, log: silent })
  assert.equal(summary.errors, 0)
  assert.equal(summary.skipped, 0)
  assert.ok(summary.written > 0)
  assert.equal(await snapshot(apex!, ['ru', 'en']), ruEnBefore)
  for (const locale of ['de', 'fr', 'es'] as const) {
    const doc = await contentDoc('site-navigation', apex!, locale)
    const expected = CONTENT_BUILDERS.navigation!.build(translations.locales[locale]!.navigation)
    assert.deepEqual(strip(doc?.header), expected.header)
    assert.equal(doc?.riskWarning, expected.riskWarning)
    const legal = await contentDoc('site-legal', apex!, locale)
    for (const item of legal?.items ?? []) assert.match(String(item.intro), /^(Entwurf|Traduction|Traducción)/)
  }
})

await check('импорт: повторный запуск ничего не меняет', async () => {
  const before = await snapshot(apex!, [...LANGUAGES])
  const versions = await versionCount(apex!)
  const summary = await importTranslations(payload, translations, { apply: true, log: silent })
  assert.equal(summary.planned, 0)
  assert.equal(summary.written, 0)
  assert.ok(summary.unchanged > 0)
  assert.equal(await snapshot(apex!, [...LANGUAGES]), before)
  assert.equal(await versionCount(apex!), versions)
})

await check('импорт: локали ru/en отклоняются', async () => {
  await assert.rejects(importTranslations(payload, translations, { apply: false, locales: ['en'], log: silent }))
})

await check('FAQ: параметры {{…}} во всех пяти языках совпадают с ru', () => {
  const ru = faqParams(faqLive.locales.ru!)
  assert.ok(ru.flat(2).length > 0)
  for (const locale of LANGUAGES) assert.deepEqual(faqParams(faqLive.locales[locale]!), ru, locale)
})

await check('FAQ: файл переводов не содержит старого FAQ', () => {
  for (const locale of ['de', 'fr', 'es'] as const) assert.equal(translations.locales[locale]!.faq, undefined)
})

await check('FAQ --faq-live: dry-run, затем запись во все пять локалей', async () => {
  const otherBefore = JSON.parse(await snapshot(apex!, [...LANGUAGES]))
  const dry = await importFaqLive(payload, faqLive, { apply: false, log: silent })
  assert.equal(dry.written, 0)
  assert.ok(dry.planned >= 3)
  const summary = await importFaqLive(payload, faqLive, { apply: true, log: silent })
  assert.equal(summary.errors, 0)
  for (const locale of LANGUAGES) {
    const doc = await contentDoc('site-faq', apex!, locale)
    assert.deepEqual(strip(doc?.sections), faqLive.locales[locale]!.sections)
    assert.deepEqual(faqParams({ sections: doc?.sections }), faqParams(faqLive.locales.ru!))
  }
  const otherAfter = JSON.parse(await snapshot(apex!, [...LANGUAGES]))
  for (const key of Object.keys(otherBefore)) {
    if (key.startsWith('site-faq:')) continue
    assert.deepEqual(otherAfter[key], otherBefore[key], key)
  }
  const again = await importFaqLive(payload, faqLive, { apply: true, log: silent })
  assert.equal(again.written, 0)
  assert.equal(again.unchanged, 5)
})

console.info(failures ? `\n${failures} FAILURES` : '\nALL OK')
process.exit(failures ? 1 : 0)
