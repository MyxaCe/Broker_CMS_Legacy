import 'dotenv/config'

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { GET } from '../src/app/v1/cms/[...path]/route'
import { validateOnboardingParts } from '../src/collections/content/Onboarding'
import { mapOnboarding } from '../src/lib/contract/mappers'
import { validateContract } from '../src/lib/contract/validate'
import { anchorFitsPart, ONBOARDING_ANCHORS } from '../src/lib/onboarding-anchors'
import { migrations } from '../src/migrations/index'
import { runSeed } from '../src/seed/run'

type Doc = Record<string, any>

const API_KEY = 'onboarding-test-key'
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

const fixture = (locale: string) =>
  JSON.parse(readFileSync(path.join(process.cwd(), 'contract', 'fixtures', `cms.onboarding.${locale}.json`), 'utf8')) as Doc

async function fetchJson(query: string) {
  const res = await GET(new Request(`http://cms.test/v1/cms/onboarding?${query}`, { headers: { 'X-API-Key': API_KEY } }), {
    params: Promise.resolve({ path: ['onboarding'] }),
  })
  return { status: res.status, body: (await res.json()) as Doc }
}

await check('якоря: у каждого — своя часть; чужой и неизвестный элемент не подходят', () => {
  for (const a of ONBOARDING_ANCHORS) assert.ok(anchorFitsPart(a.value, a.value.split('.')[0]), a.value)
  assert.equal(anchorFitsPart('cabinet.deposit', 'terminal'), false)
  assert.equal(anchorFitsPart('terminal.nope', 'terminal'), false)
  assert.equal(anchorFitsPart('#pairs', 'terminal'), false)
})

await check('проверка частей: дубль части и шаг с чужим элементом — отказ с понятным текстом', () => {
  assert.equal(validateOnboardingParts([{ part: 'cabinet', steps: [{ anchor: 'cabinet.trade' }] }]), true)
  assert.match(String(validateOnboardingParts([{ part: 'cabinet' }, { part: 'cabinet' }])), /дважды/)
  assert.match(String(validateOnboardingParts([{ part: 'terminal', steps: [{ anchor: 'cabinet.trade' }] }])), /не из части «Терминал»/)
  assert.equal(validateOnboardingParts(undefined), true)
})

await check('маппер: выключенная часть, пустой шаг и чужой элемент не отдаются; ответ валиден по контракту', () => {
  const dto = mapOnboarding({
    labels: { back: 'Назад', next: 'Далее', skip: 'Пропустить', done: 'Готово', help: '?', stepOf: '{current}/{total}' },
    parts: [
      { part: 'cabinet', enabled: true, version: 3, steps: [
        { anchor: 'cabinet.trade', title: 'Торговля', body: 'Терминал' },
        { anchor: 'cabinet.deposit', title: ' ', body: '' },
        { anchor: 'terminal.chart', title: 'Чужой', body: 'x' },
      ] },
      { part: 'terminal', enabled: false, version: 1, steps: [{ anchor: 'terminal.chart', title: 'График', body: 'x' }] },
      { part: 'nope', enabled: true, version: 1, steps: [] },
    ],
  })
  assert.deepEqual(dto.parts, [{ part: 'cabinet', version: 3, steps: [{ anchor: 'cabinet.trade', title: 'Торговля', body: 'Терминал' }] }])
  assert.ok(validateContract('onboarding', dto).valid)
  const empty = mapOnboarding({})
  assert.deepEqual(empty, { parts: [], labels: { back: '', next: '', skip: '', done: '', help: '', stepOf: '' } })
  assert.ok(validateContract('onboarding', empty).valid)
})

await check('фикстуры ru/en валидны по контракту и указывают только на известные элементы своих частей', () => {
  for (const locale of ['ru', 'en']) {
    const f = fixture(locale)
    assert.ok(validateContract('onboarding', f).valid, locale)
    for (const part of f.parts) for (const step of part.steps) assert.ok(anchorFitsPart(step.anchor, part.part), `${locale} ${step.anchor}`)
  }
})

const payload = await getPayload({ config })
const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: any[] }> } }).drizzle
const args = { db, payload, req: {} } as never

const empty = await db.execute(sql`SELECT to_regclass('public.sites') AS t`)
assert.equal(empty.rows[0]?.t ?? null, null, 'нужна пустая база: тест создаёт схему миграциями сам')
const index = migrations.findIndex((m) => m.name === '20261123_125215_onboarding')
assert.ok(index > 0, 'миграция экскурсии есть в списке')
for (const migration of migrations.slice(0, index)) await migration.up(args)

await check('миграция: таблицы экскурсии создаются, откат убирает их, повторный прогон — снова', async () => {
  await migrations[index]!.up(args)
  assert.ok((await db.execute(sql`SELECT to_regclass('public.site_onboarding') AS t`)).rows[0]?.t)
  await migrations[index]!.down(args)
  assert.equal((await db.execute(sql`SELECT to_regclass('public.site_onboarding') AS t`)).rows[0]?.t ?? null, null)
  await migrations[index]!.up(args)
  for (const migration of migrations.slice(index + 1)) await migration.up(args)
})

await check('сид: сайт получает экскурсию ru/en из фикстур; de/fr/es — английский (ТД-016)', async () => {
  await runSeed(payload, 'apex-ru', () => {})
  assert.deepEqual((await fetchJson('site=apex-ru&locale=ru')).body, fixture('ru'))
  assert.deepEqual((await fetchJson('site=apex-ru&locale=en')).body, fixture('en'))
  for (const locale of ['de', 'fr', 'es']) assert.deepEqual((await fetchJson(`site=apex-ru&locale=${locale}`)).body, fixture('en'), locale)
})

await check('повторный сид не трогает правку редактора', async () => {
  const found = await payload.find({ collection: 'site-onboarding', limit: 1, depth: 0, locale: 'ru' })
  const doc = found.docs[0] as Doc
  const parts = (doc.parts as Doc[]).map((p) => ({ ...p, version: p.part === 'cabinet' ? 2 : p.version }))
  await payload.update({ collection: 'site-onboarding', id: doc.id, locale: 'ru', data: { parts, _status: 'published' } as never })
  await runSeed(payload, 'apex-ru', () => {})
  const after = (await fetchJson('site=apex-ru&locale=ru')).body
  assert.equal(after.parts.find((p: Doc) => p.part === 'cabinet').version, 2)
  assert.equal((await fetchJson('site=apex-ru&locale=en')).body.parts.find((p: Doc) => p.part === 'cabinet').version, 1)
})

await check('сохранение с чужим элементом в шаге — отказ', async () => {
  const found = await payload.find({ collection: 'site-onboarding', limit: 1, depth: 0, locale: 'ru' })
  const doc = found.docs[0] as Doc
  const bad = [{ part: 'terminal', enabled: true, version: 1, steps: [{ anchor: 'cabinet.trade', title: 'x', body: 'y' }] }]
  await assert.rejects(
    payload.update({ collection: 'site-onboarding', id: doc.id, locale: 'ru', data: { parts: bad } as never }),
    (error: any) => {
      const messages = (error?.data?.errors ?? []).map((e: Doc) => String(e.message)).join(' ')
      assert.match(messages, /не из части «Терминал»/)
      return true
    },
  )
})

await check('сайт без экскурсии — 404, кабинет не показывает ни экскурсии, ни кнопки', async () => {
  await db.execute(sql`INSERT INTO "sites" ("slug", "name", "primary_color", "demo_start_balance_cents", "updated_at", "created_at") VALUES ('bare', 'Bare', '#d4a437', 0, now(), now())`)
  assert.equal((await fetchJson('site=bare&locale=ru')).status, 404)
})

console.info(failures ? `\n${failures} FAILURES` : '\nALL OK')
process.exit(failures ? 1 : 0)
