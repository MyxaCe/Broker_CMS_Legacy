import 'dotenv/config'

import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { GET } from '../src/app/v1/cms/[...path]/route'
import { validateContract } from '../src/lib/contract/validate'
import {
  checkOpenPositions,
  computePlatformInstruments,
  EMPTY_PLATFORM_ERROR,
  EXPOSURE_TIMEOUT_MS,
  EXPOSURE_UNAVAILABLE_ERROR,
  platformChecks,
  platformInstrumentsHash,
  PLATFORM_INSTRUMENTS_TAG,
  type PlatformInstrument,
} from '../src/lib/platform-instruments'

type Doc = Record<string, any>

const API_KEY = 'platform-test-key'
process.env.CMS_API_KEY = API_KEY
delete process.env.PLATFORM_INSTRUMENTS_WEBHOOK_URLS

const payload = await getPayload({ config })
const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: any[] }> } }).drizzle

const empty = await db.execute(sql`SELECT to_regclass('public.sites') AS t`)
assert.equal(empty.rows[0]?.t ?? null, null, 'нужна пустая база: тест создаёт схему миграциями сам')
await payload.db.migrate()

assert.deepEqual(
  computePlatformInstruments([
    { id: 10, slug: 'b', instruments: ['EURUSD', 'ETHUSD', 'BTCUSD', 'EURUSD'], closeOnlyInstruments: ['BTCUSD'] },
    { id: 2, slug: 'a', instruments: ['BTCUSD', 'ETHUSD', 'LTCUSD', 42], closeOnlyInstruments: ['ETHUSD', 'LTCUSD'] },
    { id: 3, slug: 'c', instruments: null, closeOnlyInstruments: null },
    { id: '11', slug: 'd', instruments: ['XAUUSD'], closeOnlyInstruments: ['XAUUSD'] },
  ]),
  [
    { symbol: 'BTCUSD', mode: 'trade' },
    { symbol: 'ETHUSD', mode: 'trade' },
    { symbol: 'LTCUSD', mode: 'closeOnly' },
    { symbol: 'EURUSD', mode: 'trade' },
    { symbol: 'XAUUSD', mode: 'closeOnly' },
  ],
)
assert.deepEqual(computePlatformInstruments([]), [])
assert.notEqual(
  platformInstrumentsHash([{ symbol: 'BTCUSD', mode: 'trade' }]),
  platformInstrumentsHash([{ symbol: 'BTCUSD', mode: 'closeOnly' }]),
)
console.info('OK    объединение: порядок сайтов по id, без повторов, trade если хоть один сайт торгует, иначе closeOnly')

async function fetchPlatform(headers: Record<string, string> = { 'X-API-Key': API_KEY }) {
  const res = await GET(new Request('http://cms.test/v1/cms/platform/instruments', { headers }), {
    params: Promise.resolve({ path: ['platform', 'instruments'] }),
  })
  return { status: res.status, version: res.headers.get('x-content-version'), body: (await res.json()) as Doc }
}

async function fetchSite(slug: string) {
  const res = await GET(new Request(`http://cms.test/v1/cms/sites/${slug}`, { headers: { 'X-API-Key': API_KEY } }), {
    params: Promise.resolve({ path: ['sites', slug] }),
  })
  return { status: res.status, body: (await res.json()) as Doc }
}

async function current(): Promise<{ version: number; updatedAt: string; instruments: PlatformInstrument[] }> {
  const res = await fetchPlatform()
  assert.equal(res.status, 200)
  assert.ok(validateContract('platform-instruments', res.body).valid, JSON.stringify(res.body))
  assert.equal(res.version, String(res.body.version))
  return res.body as never
}

async function expectInvalid(action: () => Promise<unknown>, ...fragments: string[]) {
  try {
    await action()
  } catch (error) {
    const details = (error as { data?: { errors?: { message?: string }[] } }).data?.errors ?? []
    const text = [(error as Error).message, ...details.map((d) => d.message ?? '')].join(' | ')
    for (const fragment of fragments) assert.ok(text.includes(fragment), `в ошибке нет «${fragment}»: ${text}`)
    return text
  }
  assert.fail('ожидался отказ')
}

function createSite(slug: string, instruments: string[], closeOnlyInstruments: string[] = []) {
  return payload.create({
    collection: 'sites',
    data: { slug, name: slug, primaryColor: '#d4a437', demoStartBalanceCents: 0, instruments, closeOnlyInstruments } as never,
  }) as Promise<Doc>
}

function updateSite(id: number, data: Record<string, unknown>) {
  return payload.update({ collection: 'sites', id, data: data as never }) as Promise<Doc>
}

const legacy = await db.execute(sql`SELECT "instruments", "version"::int AS version FROM "platform_instruments"`)
assert.equal(legacy.rows[0].instruments.length, 30)
const start = await current()
assert.deepEqual(start.instruments, [])
assert.equal(start.version, legacy.rows[0].version + 1)
assert.equal((await current()).version, start.version)
assert.equal((await current()).updatedAt, start.updatedAt)
console.info(`OK    пустая база: вычисленный список пуст, version ${start.version}; повторный запрос версию не меняет`)

assert.equal((await fetchPlatform({})).status, 401)
assert.equal((await fetchPlatform({ 'X-API-Key': 'wrong' })).status, 401)
const unknown = await GET(new Request('http://cms.test/v1/cms/platform/other', { headers: { 'X-API-Key': API_KEY } }), {
  params: Promise.resolve({ path: ['platform', 'other'] }),
})
assert.equal(unknown.status, 404)
console.info('OK    отдача: без ключа и с чужим ключом 401, неизвестный ресурс 404')

const a = await createSite('pi-a', ['BTCUSD', 'ETHUSD', 'LTCUSD'], ['LTCUSD', 'ETHUSD'])
const v1 = await current()
assert.equal(v1.version, start.version + 1)
assert.deepEqual(v1.instruments, [
  { symbol: 'BTCUSD', mode: 'trade' },
  { symbol: 'ETHUSD', mode: 'closeOnly' },
  { symbol: 'LTCUSD', mode: 'closeOnly' },
])
const b = await createSite('pi-b', ['EURUSD', 'ETHUSD', 'BTCUSD'], ['BTCUSD'])
const v2 = await current()
assert.equal(v2.version, v1.version + 1)
assert.deepEqual(v2.instruments, [
  { symbol: 'BTCUSD', mode: 'trade' },
  { symbol: 'ETHUSD', mode: 'trade' },
  { symbol: 'LTCUSD', mode: 'closeOnly' },
  { symbol: 'EURUSD', mode: 'trade' },
])
assert.ok(Date.parse(v2.updatedAt) >= Date.parse(v1.updatedAt))
console.info('OK    сайты → платформа: объединение по id сайтов, ETHUSD trade (pi-b торгует), LTCUSD closeOnly; version растёт')

await updateSite(b.id, { name: 'Другое имя' })
await updateSite(b.id, { instruments: ['ETHUSD', 'BTCUSD', 'EURUSD'], closeOnlyInstruments: ['BTCUSD'] })
await updateSite(b.id, { closeOnlyInstruments: [] })
const same = await current()
assert.equal(same.version, v2.version)
assert.equal(same.updatedAt, v2.updatedAt)
assert.deepEqual(same.instruments, v2.instruments)
console.info('OK    сохранения сайта без изменения вычисленного списка (имя, порядок у второго сайта, режим перекрытый торговлей) — version прежняя')

await updateSite(a.id, { instruments: ['ETHUSD', 'BTCUSD', 'LTCUSD'], closeOnlyInstruments: ['LTCUSD', 'ETHUSD'] })
const v3 = await current()
assert.equal(v3.version, v2.version + 1)
assert.deepEqual(v3.instruments.map((i) => i.symbol), ['ETHUSD', 'BTCUSD', 'LTCUSD', 'EURUSD'])
await updateSite(b.id, { closeOnlyInstruments: ['ETHUSD'] })
const v4 = await current()
assert.equal(v4.version, v3.version + 1)
assert.deepEqual(v4.instruments.find((i) => i.symbol === 'ETHUSD'), { symbol: 'ETHUSD', mode: 'closeOnly' })
console.info('OK    порядок у первого сайта и режим «только закрытие» у всех держателей — меняют список, version растёт')

const siteDto = await fetchSite('pi-b')
assert.equal(siteDto.status, 200)
assert.deepEqual(siteDto.body.instruments, ['ETHUSD', 'BTCUSD', 'EURUSD'])
assert.deepEqual(siteDto.body.closeOnlyInstruments, ['ETHUSD'])
assert.ok(validateContract('sites', siteDto.body).valid)
const { closeOnlyInstruments: _c, ...legacySite } = siteDto.body
assert.ok(validateContract('sites', legacySite).valid, 'старый ответ без closeOnlyInstruments валиден')
assert.equal(validateContract('sites', { ...siteDto.body, closeOnlyInstruments: 'ETHUSD' }).valid, false)
const fixture = JSON.parse(readFileSync(path.join(process.cwd(), 'contract', 'fixtures', 'cms.sites.json'), 'utf8'))
assert.ok(validateContract('sites', fixture).valid)
assert.deepEqual(Object.keys(siteDto.body).sort(), Object.keys(fixture).sort())
console.info('OK    sites/{slug}: instruments прежние, closeOnlyInstruments — новое необязательное поле; старый ответ валиден')

await expectInvalid(() => updateSite(a.id, { closeOnlyInstruments: ['LTCUSD', 'XAUUSD'] }), 'Только закрытие', 'XAUUSD')
await expectInvalid(() => updateSite(a.id, { instruments: ['ETHUSD', 'BTCUSD'] }), 'LTCUSD у сайта не включены')
await expectInvalid(() => updateSite(a.id, { instruments: ['BTCUSD', 'BTCUSD'], closeOnlyInstruments: [] }), 'дважды')
await expectInvalid(() => updateSite(a.id, { instruments: ['BTC USD'], closeOnlyInstruments: [] }), 'Некорректный символ')
await expectInvalid(() => createSite('pi-bad', ['EURUSD'], ['GBPUSD']), 'GBPUSD')
assert.equal((await current()).version, v4.version)
console.info('OK    closeOnlyInstruments ⊆ instruments: лишний символ — понятная ошибка; повтор и некорректный символ — отказ')

const probed: string[][] = []
platformChecks.openPositions = async (symbols) => {
  probed.push(symbols)
  return { allowed: true }
}
await updateSite(a.id, { instruments: ['ETHUSD', 'BTCUSD'], closeOnlyInstruments: ['ETHUSD'] })
assert.deepEqual((await fetchSite('pi-a')).body.closeOnlyInstruments, ['ETHUSD'])
const v5 = await current()
assert.equal(v5.version, v4.version + 1)
assert.deepEqual(probed, [['LTCUSD']])
await updateSite(b.id, { instruments: ['ETHUSD', 'EURUSD'], closeOnlyInstruments: [] })
assert.deepEqual(probed, [['LTCUSD']], 'BTCUSD остаётся у pi-a — позиции не проверяются')
platformChecks.openPositions = async (symbols) => {
  probed.push(symbols)
  return { allowed: false, reason: `Есть открытые позиции: ${symbols.join(', ')}` }
}
await expectInvalid(() => updateSite(b.id, { instruments: ['ETHUSD'], closeOnlyInstruments: [] }), 'Есть открытые позиции: EURUSD')
assert.deepEqual((await fetchSite('pi-b')).body.instruments, ['ETHUSD', 'EURUSD'])
platformChecks.openPositions = checkOpenPositions
assert.deepEqual(await checkOpenPositions(['BTCUSD']), { allowed: true })
console.info('OK    символ пропадает из платформы целиком → checkOpenPositions(символы); отказ проверки останавливает сохранение')

delete process.env.TERMINAL_INTERNAL_URL
delete process.env.TERMINAL_INTERNAL_TOKEN
const EXPOSURE_TOKEN = 'exposure-test-token'
const exposure: Record<string, { openPositions: number; pendingOrders: number }> = {
  BTCUSD: { openPositions: 0, pendingOrders: 0 },
  ETHUSD: { openPositions: 0, pendingOrders: 0 },
  EURUSD: { openPositions: 3, pendingOrders: 0 },
  LTCUSD: { openPositions: 0, pendingOrders: 2 },
}
const exposureCalls: string[] = []
let exposureDelayMs = 0
const gateway = createServer((req: IncomingMessage, res) => {
  const match = /^\/internal\/instruments\/([^/]+)\/exposure$/.exec(req.url ?? '')
  exposureCalls.push(req.url ?? '')
  setTimeout(() => {
    if (req.headers['x-internal-token'] !== EXPOSURE_TOKEN) {
      res.statusCode = 401
      return res.end('{"error":"unauthorized"}')
    }
    const symbol = decodeURIComponent(match?.[1] ?? '')
    const row = exposure[symbol]
    if (!match || !row) {
      res.statusCode = 404
      return res.end('{}')
    }
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ symbol, ...row }))
  }, exposureDelayMs)
})
await new Promise<void>((resolve) => gateway.listen(0, '127.0.0.1', resolve))
const gatewayUrl = `http://127.0.0.1:${(gateway.address() as AddressInfo).port}/`
const closedServer = createServer()
await new Promise<void>((resolve) => closedServer.listen(0, '127.0.0.1', resolve))
const closedPort = (closedServer.address() as AddressInfo).port
await new Promise<void>((resolve) => closedServer.close(() => resolve()))
const gatewayEnv = { TERMINAL_INTERNAL_URL: gatewayUrl, TERMINAL_INTERNAL_TOKEN: EXPOSURE_TOKEN }

assert.deepEqual(await checkOpenPositions(['BTCUSD', 'ETHUSD'], gatewayEnv), { allowed: true })
assert.deepEqual(exposureCalls.sort(), ['/internal/instruments/BTCUSD/exposure', '/internal/instruments/ETHUSD/exposure'])
console.info('OK    шлюз: нули по всем убираемым символам → разрешено, запрос по каждому символу')

const withPositions = await checkOpenPositions(['BTCUSD', 'EURUSD'], gatewayEnv)
assert.equal(withPositions.allowed, false)
assert.ok(!withPositions.allowed && withPositions.reason.includes('EURUSD — открытых позиций: 3'), JSON.stringify(withPositions))
assert.ok(!withPositions.allowed && !withPositions.reason.includes('BTCUSD') && withPositions.reason.includes('Только закрытие'))
const withOrders = await checkOpenPositions(['LTCUSD'], gatewayEnv)
assert.ok(!withOrders.allowed && withOrders.reason.includes('LTCUSD — открытых позиций: 0, отложенных ордеров: 2'), JSON.stringify(withOrders))
console.info('OK    шлюз: открытые позиции или отложенные ордера → отказ с символами и числами, совет про «Только закрытие»')

const failClosed = { allowed: false, reason: EXPOSURE_UNAVAILABLE_ERROR }
assert.deepEqual(await checkOpenPositions(['BTCUSD'], { ...gatewayEnv, TERMINAL_INTERNAL_TOKEN: 'wrong' }), failClosed)
assert.deepEqual(await checkOpenPositions(['XAUUSD'], gatewayEnv), failClosed)
assert.deepEqual(await checkOpenPositions(['BTCUSD'], { ...gatewayEnv, TERMINAL_INTERNAL_URL: `http://127.0.0.1:${closedPort}` }), failClosed)
exposureDelayMs = EXPOSURE_TIMEOUT_MS + 1_000
const slowStarted = Date.now()
assert.deepEqual(await checkOpenPositions(['BTCUSD'], gatewayEnv), failClosed)
assert.ok(Date.now() - slowStarted < EXPOSURE_TIMEOUT_MS + 900, 'таймаут проверки ~3 с')
exposureDelayMs = 0
assert.deepEqual(await checkOpenPositions(['BTCUSD'], { TERMINAL_INTERNAL_URL: gatewayUrl }), failClosed)
assert.deepEqual(await checkOpenPositions(['BTCUSD'], { TERMINAL_INTERNAL_TOKEN: EXPOSURE_TOKEN }), failClosed)
assert.deepEqual(await checkOpenPositions(['BTCUSD'], {}), { allowed: true })
console.info('OK    шлюз: 401, не-200, недоступен, таймаут, задана одна переменная → отказ (fail-closed); обе не заданы → разрешено')

process.env.TERMINAL_INTERNAL_URL = gatewayUrl
process.env.TERMINAL_INTERNAL_TOKEN = EXPOSURE_TOKEN
await expectInvalid(() => updateSite(b.id, { instruments: ['ETHUSD'], closeOnlyInstruments: [] }), 'EURUSD — открытых позиций: 3')
assert.deepEqual((await fetchSite('pi-b')).body.instruments, ['ETHUSD', 'EURUSD'])
exposure.EURUSD = { openPositions: 0, pendingOrders: 0 }
delete process.env.TERMINAL_INTERNAL_URL
delete process.env.TERMINAL_INTERNAL_TOKEN
await new Promise<void>((resolve) => gateway.close(() => resolve()))
console.info('OK    сохранение карточки сайта, убирающее символ с открытыми позициями, отклоняется по ответу шлюза')

await updateSite(b.id, { instruments: [], closeOnlyInstruments: [] })
const lonely = await current()
assert.deepEqual(lonely.instruments, [
  { symbol: 'ETHUSD', mode: 'closeOnly' },
  { symbol: 'BTCUSD', mode: 'trade' },
])
const refusal = await expectInvalid(() => updateSite(a.id, { instruments: [], closeOnlyInstruments: [] }), EMPTY_PLATFORM_ERROR)
await expectInvalid(() => payload.delete({ collection: 'sites', id: a.id }), 'пустым')
assert.equal((await current()).version, lonely.version)
assert.equal((await payload.find({ collection: 'sites', where: { slug: { equals: 'pi-a' } } })).totalDocs, 1)
console.info(`OK    пустой вычисленный список — отказ (сохранение и удаление сайта): ${refusal.split(' | ').pop()}`)

await updateSite(b.id, { instruments: ['XAUUSD'] })
await payload.delete({ collection: 'sites', id: a.id })
const afterDelete = await current()
assert.deepEqual(afterDelete.instruments, [{ symbol: 'XAUUSD', mode: 'trade' }])
assert.equal(afterDelete.version, lonely.version + 2)
console.info('OK    удаление сайта пересчитывает список, version растёт')

const received: { body: string; signature: string | undefined }[] = []
const server = createServer((req: IncomingMessage, res) => {
  let body = ''
  req.on('data', (chunk) => (body += chunk))
  req.on('end', () => {
    received.push({ body, signature: req.headers['x-signature'] as string | undefined })
    res.statusCode = 204
    res.end()
  })
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const port = (server.address() as AddressInfo).port
const deadServer = createServer()
await new Promise<void>((resolve) => deadServer.listen(0, '127.0.0.1', resolve))
const deadPort = (deadServer.address() as AddressInfo).port
await new Promise<void>((resolve) => deadServer.close(() => resolve()))

const waitHooks = async (count: number) => {
  for (let i = 0; i < 50 && received.length < count; i++) await new Promise((r) => setTimeout(r, 100))
}

process.env.PLATFORM_INSTRUMENTS_WEBHOOK_URLS = ` http://127.0.0.1:${deadPort}/dead , http://127.0.0.1:${port}/hook`
process.env.PLATFORM_INSTRUMENTS_WEBHOOK_SECRET = 'platform-secret'
await updateSite(b.id, { name: 'Только имя' })
await new Promise((r) => setTimeout(r, 500))
assert.equal(received.length, 0, 'вычисленный список не изменился — вебхука нет')

const started = Date.now()
await updateSite(b.id, { instruments: ['XAUUSD', 'EURUSD'] })
assert.ok(Date.now() - started < 2_000, 'сохранение не ждёт вебхук')
await waitHooks(1)
assert.equal(received.length, 1)
const hook = received[0]!
assert.equal(hook.signature, 'sha256=' + createHmac('sha256', 'platform-secret').update(hook.body, 'utf8').digest('hex'))
const hookBody = JSON.parse(hook.body) as Doc
assert.deepEqual(hookBody.tags, [PLATFORM_INSTRUMENTS_TAG])
assert.ok(typeof hookBody.event_id === 'string' && !Number.isNaN(Date.parse(hookBody.occurred_at)))
const hooked = await current()
assert.equal(hooked.version, afterDelete.version + 1)
assert.equal(received.length, 1)
console.info('OK    вебхук после сохранения сайта, изменившего список: подпись HMAC верна, тег cms:platform:instruments; без изменения — не шлётся')

await db.execute(sql`UPDATE "sites" SET "instruments" = '["GBPUSD"]'::jsonb WHERE "id" = ${b.id}`)
const caught = await current()
assert.deepEqual(caught.instruments, [{ symbol: 'GBPUSD', mode: 'trade' }])
assert.equal(caught.version, hooked.version + 1)
await waitHooks(2)
assert.equal(received.length, 2)
assert.equal((await current()).version, caught.version)
console.info('OK    изменение в обход CMS (миграция, правка в базе) подхватывается первым запросом: version растёт, вебхук уходит')

process.env.PLATFORM_INSTRUMENTS_WEBHOOK_URLS = `http://127.0.0.1:${deadPort}/dead`
await updateSite(b.id, { instruments: ['GBPUSD', 'EURUSD'] })
delete process.env.PLATFORM_INSTRUMENTS_WEBHOOK_SECRET
const savedSiteSecret = process.env.SITE_WEBHOOK_SECRET
delete process.env.SITE_WEBHOOK_SECRET
await updateSite(b.id, { instruments: ['EURUSD'] })
assert.equal((await current()).version, caught.version + 2)
if (savedSiteSecret !== undefined) process.env.SITE_WEBHOOK_SECRET = savedSiteSecret
console.info('OK    вебхук: все адреса недоступны или нет секрета — сохранение проходит, версия растёт')
server.close()

const legacyAfter = await db.execute(sql`SELECT "instruments" FROM "platform_instruments"`)
assert.deepEqual(legacyAfter.rows[0].instruments, legacy.rows[0].instruments)
console.info('OK    прежний ручной список в базе не тронут и не используется')

console.info('\nALL OK')
process.exit(0)
