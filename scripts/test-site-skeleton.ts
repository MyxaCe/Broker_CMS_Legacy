import 'dotenv/config'

import assert from 'node:assert/strict'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { GET } from '../src/app/v1/cms/[...path]/route'
import { RESOURCE_TO_COLLECTION } from '../src/collections/content/index'
import { validateContract } from '../src/lib/contract/validate'
import { refreshPlatformInstruments, TERMINAL_PAIRS } from '../src/lib/platform-instruments'
import { ensureSiteSkeleton } from '../src/lib/site-skeleton'
import { runSeed } from '../src/seed/run'

// ТД-004: новый сайт, заведённый в CMS, сразу получает полный опубликованный каркас разделов —
// витрина и кабинет нового сайта открываются без 503, пустые разделы скрываются витриной.

type Doc = Record<string, any>

const API_KEY = 'site-skeleton-test-key'
process.env.CMS_API_KEY = API_KEY
let failures = 0

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.info(`OK    ${name}`)
  } catch (error) {
    failures++
    console.info(`FAIL  ${name}\n      ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`)
  }
}

async function fetchJson(pathPart: string, query: string) {
  const res = await GET(new Request(`http://cms.test/v1/cms/${pathPart}?${query}`, { headers: { 'X-API-Key': API_KEY } }), {
    params: Promise.resolve({ path: pathPart.split('/') }),
  })
  return { status: res.status, body: (await res.json()) as Doc }
}

const payload = await getPayload({ config })
const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: any[] }> } }).drizzle

const empty = await db.execute(sql`SELECT to_regclass('public.sites') AS t`)
assert.equal(empty.rows[0]?.t ?? null, null, 'нужна пустая база: тест создаёт схему миграциями сам')
await payload.db.migrate()

// Боевой сайт как на стенде: сид с фикстурами и инструментами терминала.
await runSeed(payload, 'apex-ru', () => {})
const apex = (await payload.find({ collection: 'sites', where: { slug: { equals: 'apex-ru' } }, limit: 1, depth: 0 })).docs[0] as Doc
const platformBefore = await refreshPlatformInstruments(payload)

const RESOURCES = Object.keys(RESOURCE_TO_COLLECTION)

async function siteDocs(siteId: number | string, locale = 'ru') {
  const out: Record<string, Doc | undefined> = {}
  for (const [resource, collection] of Object.entries(RESOURCE_TO_COLLECTION)) {
    const found = await payload.find({ collection: collection as never, where: { site: { equals: siteId } }, limit: 5, depth: 0, locale: locale as never })
    assert.ok(found.docs.length <= 1, `${resource}: не больше одного документа на сайт`)
    out[resource] = found.docs[0] as Doc | undefined
  }
  return out
}

async function versionsCount(siteId: number | string) {
  let total = 0
  for (const collection of Object.values(RESOURCE_TO_COLLECTION)) {
    const docs = await payload.find({ collection: collection as never, where: { site: { equals: siteId } }, limit: 1, depth: 0 })
    const id = (docs.docs[0] as Doc | undefined)?.id
    if (id === undefined) continue
    total += (await payload.findVersions({ collection: collection as never, where: { parent: { equals: id } }, limit: 0, depth: 0 })).totalDocs
  }
  return total
}

// 1. Новый сайт через обычное создание (как в админке): каркас в той же транзакции, без ошибки внешнего ключа.
const fresh = (await payload.create({
  collection: 'sites',
  data: { slug: 'new-country', name: 'New Country', primaryColor: '#3366ff', demoStartBalanceCents: 0 } as never,
})) as Doc

await check('новый сайт: по документу во всех разделах, все опубликованы', async () => {
  const docs = await siteDocs(fresh.id)
  for (const resource of RESOURCES) {
    assert.ok(docs[resource], `${resource}: раздел создан`)
    assert.equal(docs[resource]!._status, 'published', `${resource}: опубликован (черновик витрина приняла бы за отказ CMS)`)
  }
})

await check('новый сайт: все ресурсы отвечают 200 и проходят контракт (ru и en)', async () => {
  for (const locale of ['ru', 'en']) {
    for (const resource of [...RESOURCES, 'brand']) {
      const { status, body } = await fetchJson(resource, `site=new-country&locale=${locale}`)
      assert.equal(status, 200, `${resource} (${locale}): ${status} ${JSON.stringify(body).slice(0, 200)}`)
      assert.ok(validateContract(resource, body).valid, `${resource} (${locale}): контракт`)
    }
    for (const section of ['news', 'education']) {
      const { status, body } = await fetchJson('articles', `site=new-country&locale=${locale}&section=${section}`)
      assert.equal(status, 200)
      assert.equal(body.total, 0)
    }
    const site = await fetchJson('sites/new-country', `locale=${locale}`)
    assert.equal(site.status, 200)
    assert.deepEqual(site.body.instruments, [])
  }
})

await check('новый сайт: разделы пустые — без выдуманных реквизитов, чужих текстов и юридики', async () => {
  const get = async (r: string) => (await fetchJson(r, 'site=new-country&locale=ru')).body
  assert.deepEqual(await get('faq'), { sections: [] })
  assert.deepEqual(await get('legal'), { items: [] })
  assert.deepEqual(await get('contacts'), { channels: [], offices: [] })
  assert.deepEqual(await get('promotions'), { items: [] })
  assert.deepEqual(await get('accounts'), { items: [] })
  assert.deepEqual(await get('careers'), { benefits: [], vacancies: [] })
  const nav = await get('navigation')
  assert.deepEqual(nav.header, [])
  assert.equal(nav.footer.riskWarning, '')
  const brand = await get('brand')
  assert.equal(brand.name, 'New Country')
  assert.notEqual(brand.name, apex.name)
  const onboarding = await get('onboarding')
  assert.deepEqual(onboarding.parts, [], 'экскурсия выключена, пока тексты не написаны')
})

await check('новый сайт: главная кабинета — стандартный набор модулей (устройство, не тексты)', async () => {
  const { body } = await fetchJson('cabinet-home', 'site=new-country&locale=ru')
  assert.deepEqual(
    body.modules.map((m: Doc) => m.type),
    ['profile', 'onboarding', 'balance', 'markets', 'promotions'],
  )
  const markets = body.modules.find((m: Doc) => m.type === 'markets')
  assert.ok(!markets.newListingSymbols?.length, 'чужих символов нового листинга нет')
})

await check('новый сайт с пустым списком инструментов не трогает список платформы', async () => {
  const after = await refreshPlatformInstruments(payload)
  assert.equal(after.version, platformBefore.version)
  assert.deepEqual(after.instruments, platformBefore.instruments)
  assert.ok(after.instruments.length >= TERMINAL_PAIRS.length)
})

await check('повторный каркас ничего не меняет и не создаёт версий', async () => {
  const before = await siteDocs(fresh.id)
  const versions = await versionsCount(fresh.id)
  await ensureSiteSkeleton(payload, fresh.id)
  await ensureSiteSkeleton(payload, fresh.id, { locale: 'en' })
  assert.deepEqual(await siteDocs(fresh.id), before)
  assert.equal(await versionsCount(fresh.id), versions)
})

await check('правки редактора каркас не перезаписывает', async () => {
  const docs = await siteDocs(fresh.id)
  await payload.update({
    collection: 'site-faq',
    id: docs.faq!.id,
    locale: 'ru',
    data: { sections: [{ title: 'Общее', items: [{ question: 'Вопрос?', answer: 'Ответ.' }] }], _status: 'published' } as never,
  })
  await ensureSiteSkeleton(payload, fresh.id)
  const { body } = await fetchJson('faq', 'site=new-country&locale=ru')
  assert.equal(body.sections[0]?.title, 'Общее')
})

await check('сид не трогает правки, но заполняет нетронутый каркас фикстурами', async () => {
  const summary = await runSeed(payload, 'new-country', () => {})
  assert.ok(summary.kept.includes('faq'), 'FAQ с правкой редактора не тронут')
  assert.ok(summary.created.includes('legal') && summary.created.includes('contacts'), 'пустые разделы заполнены')
  const { body } = await fetchJson('faq', 'site=new-country&locale=ru')
  assert.equal(body.sections[0]?.title, 'Общее')
})

// 2. «Скопировать структуру с сайта»: меню и модули кабинета — да; бренд, юридика, тексты — нет.
await payload.update({
  collection: 'site-cabinet-home',
  where: { site: { equals: apex.id } },
  data: {
    modules: [
      { type: 'markets', enabled: true, tabs: { assets: true, popular: false, newListing: true, favorites: true, gainers: false, volume: false }, newListingSymbols: [{ symbol: 'BTCUSD' }] },
      { type: 'balance', enabled: false, buttons: { deposit: true, withdraw: false, buyFiat: false } },
    ],
    _status: 'published',
  } as never,
})
const apexNav = (await fetchJson('navigation', 'site=apex-ru&locale=ru')).body

const copied = (await payload.create({
  collection: 'sites',
  data: { slug: 'copied-country', name: 'Copied', primaryColor: '#00aa55', demoStartBalanceCents: 0, copyStructureFrom: apex.id } as never,
})) as Doc

await check('копия структуры: меню и подвал как у образца, предупреждение о рисках не скопировано', async () => {
  const nav = (await fetchJson('navigation', 'site=copied-country&locale=ru')).body
  assert.ok(apexNav.header.length > 0, 'у образца есть меню')
  assert.deepEqual(nav.header, apexNav.header)
  assert.deepEqual(nav.footer.columns, apexNav.footer.columns)
  assert.ok(apexNav.footer.riskWarning.length > 0)
  assert.equal(nav.footer.riskWarning, '', 'юридический текст не переносится')
})

await check('копия структуры: модули кабинета как у образца, без символов нового листинга', async () => {
  const home = (await fetchJson('cabinet-home', 'site=copied-country&locale=ru')).body
  assert.deepEqual(home.modules.map((m: Doc) => [m.type, m.enabled]), [['markets', true], ['balance', false]])
  assert.ok(!home.modules[0].newListingSymbols?.length)
})

await check('копия структуры: бренд, юридика, FAQ, контакты, акции не скопированы', async () => {
  const get = async (r: string) => (await fetchJson(r, 'site=copied-country&locale=ru')).body
  assert.deepEqual(await get('legal'), { items: [] })
  assert.deepEqual(await get('faq'), { sections: [] })
  assert.deepEqual(await get('contacts'), { channels: [], offices: [] })
  assert.deepEqual(await get('promotions'), { items: [] })
  assert.equal((await get('brand')).name, 'Copied')
  const stored = (await payload.findByID({ collection: 'sites', id: copied.id, depth: 0 })) as Doc
  assert.equal(stored.copyStructureFrom ?? null, null, 'поле «скопировать с» не хранится в базе')
})

// 3. Сайт под другой язык по умолчанию.
await payload.create({
  collection: 'sites',
  data: { slug: 'de-country', name: 'DE', primaryColor: '#111111', demoStartBalanceCents: 0, languages: ['de', 'en'], defaultLanguage: 'de' } as never,
})
await check('сайт с языком по умолчанию de: каркас создан, ресурсы отвечают на de', async () => {
  for (const resource of [...RESOURCES, 'brand']) {
    const { status, body } = await fetchJson(resource, 'site=de-country&locale=de')
    assert.equal(status, 200, `${resource}: ${status}`)
    assert.ok(validateContract(resource, body).valid, resource)
  }
})

console.info(failures === 0 ? '\nALL OK' : `\n${failures} FAIL`)
process.exit(failures === 0 ? 0 : 1)
