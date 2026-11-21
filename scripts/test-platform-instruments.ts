import 'dotenv/config'

import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { GET } from '../src/app/v1/cms/[...path]/route'
import { validateContract } from '../src/lib/contract/validate'
import {
  checkOpenPositions,
  PLATFORM_INSTRUMENTS_SLUG,
  PLATFORM_INSTRUMENTS_TAG,
  TERMINAL_PAIRS,
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

async function fetchPlatform(headers: Record<string, string> = { 'X-API-Key': API_KEY }) {
  const res = await GET(new Request('http://cms.test/v1/cms/platform/instruments', { headers }), {
    params: Promise.resolve({ path: ['platform', 'instruments'] }),
  })
  return { status: res.status, version: res.headers.get('x-content-version'), body: (await res.json()) as Doc }
}

async function save(instruments: PlatformInstrument[]) {
  return (await payload.updateGlobal({
    slug: PLATFORM_INSTRUMENTS_SLUG as never,
    data: { instruments } as never,
  })) as Doc
}

async function current(): Promise<{ version: number; instruments: PlatformInstrument[] }> {
  const res = await fetchPlatform()
  return res.body as never
}

async function expectInvalid(action: () => Promise<unknown>, ...fragments: string[]) {
  try {
    await action()
  } catch (error) {
    const details = (error as { data?: { errors?: { message?: string }[] } }).data?.errors ?? []
    const text = details.map((d) => d.message ?? '').join(' | ')
    for (const fragment of fragments) assert.ok(text.includes(fragment), `в ошибке нет «${fragment}»: ${text}`)
    return text
  }
  assert.fail('ожидался отказ валидации')
}

const first = await fetchPlatform()
assert.equal(first.status, 200)
assert.ok(validateContract('platform-instruments', first.body).valid)
assert.equal(first.body.version, 1)
assert.equal(first.version, '1')
assert.ok(!Number.isNaN(Date.parse(first.body.updatedAt)))
assert.deepEqual(
  first.body.instruments,
  TERMINAL_PAIRS.map((symbol) => ({ symbol, mode: 'trade' })),
)
console.info('OK    отдача по договору: version 1, updatedAt, 30 пар терминала в режиме trade')

assert.equal((await fetchPlatform({})).status, 401)
assert.equal((await fetchPlatform({ 'X-API-Key': 'wrong' })).status, 401)
const unknown = await GET(new Request('http://cms.test/v1/cms/platform/other', { headers: { 'X-API-Key': API_KEY } }), {
  params: Promise.resolve({ path: ['platform', 'other'] }),
})
assert.equal(unknown.status, 404)
console.info('OK    отдача: без ключа и с чужим ключом 401, неизвестный ресурс 404')

const initial = first.body.instruments as PlatformInstrument[]
const reordered: PlatformInstrument[] = [
  initial.find((i) => i.symbol === 'ETHUSD')!,
  ...initial.filter((i) => i.symbol !== 'ETHUSD'),
].map((i) => (i.symbol === 'LTCUSD' ? { symbol: i.symbol, mode: 'closeOnly' } : i))
await save(reordered)
const second = await fetchPlatform()
assert.equal(second.body.version, 2)
assert.equal(second.version, '2')
assert.deepEqual(second.body.instruments, reordered)
assert.ok(Date.parse(second.body.updatedAt) >= Date.parse(first.body.updatedAt))
await save(reordered)
assert.equal((await current()).version, 3)
console.info('OK    version растёт при каждом сохранении (1 → 2 → 3), порядок и closeOnly отдаются как сохранены')

await expectInvalid(() => save([...reordered, { symbol: 'BTCUSD', mode: 'trade' }]), 'BTCUSD', 'дважды')
await expectInvalid(() => save([{ symbol: 'BTCUSD', mode: 'halt' as never }]), 'BTCUSD', 'режим')
await expectInvalid(() => save([{ symbol: 'BTC USD', mode: 'trade' }]), 'Некорректный символ')
assert.equal((await current()).version, 3)
console.info('OK    валидация формы: повтор символа, неизвестный режим, некорректный символ — отказ, версия не меняется')

const site = (await payload.create({
  collection: 'sites',
  data: { slug: 'pi-site', name: 'PI', primaryColor: '#d4a437', demoStartBalanceCents: 0, instruments: ['BTCUSD', 'LTCUSD'] } as never,
})) as Doc
const other = (await payload.create({
  collection: 'sites',
  data: { slug: 'pi-other', name: 'PI 2', primaryColor: '#d4a437', demoStartBalanceCents: 0, instruments: ['BTCUSD'] } as never,
})) as Doc
await expectInvalid(
  () => payload.update({ collection: 'sites', id: site.id, data: { instruments: ['BTCUSD', 'EURUSD', 'XAUUSD'] } as never }),
  'EURUSD, XAUUSD',
  'Инструментах платформы',
)
await expectInvalid(
  () => payload.create({ collection: 'sites', data: { slug: 'pi-bad', name: 'Bad', primaryColor: '#d4a437', demoStartBalanceCents: 0, instruments: ['EURUSD'] } as never }),
  'EURUSD',
)
const unchanged = (await payload.findByID({ collection: 'sites', id: site.id, depth: 0 })) as Doc
assert.deepEqual(unchanged.instruments, ['BTCUSD', 'LTCUSD'])
await payload.update({ collection: 'sites', id: site.id, data: { instruments: ['BTCUSD', 'LTCUSD', 'SOLUSD'] } as never })
console.info('OK    сайт: инструмент вне списка платформы — понятная ошибка с перечнем; подмножество сохраняется (closeOnly тоже)')

const withoutBtc = reordered.filter((i) => i.symbol !== 'BTCUSD' && i.symbol !== 'LTCUSD')
const refusal = await expectInvalid(() => save(withoutBtc), 'BTCUSD (сайты: pi-other, pi-site)', 'LTCUSD (сайты: pi-site)', 'Сначала уберите')
assert.equal((await current()).version, 3)
assert.deepEqual((await current()).instruments, reordered)
console.info(`OK    удаление включённого сайтам инструмента — отказ: ${refusal}`)

const withoutMana = reordered.filter((i) => i.symbol !== 'MANAUSD')
await save(withoutMana)
assert.equal((await current()).version, 4)
assert.deepEqual((await current()).instruments, withoutMana)
const closeOnlyBtc = withoutMana.map((i) => (i.symbol === 'BTCUSD' ? { ...i, mode: 'closeOnly' as const } : i))
await save(closeOnlyBtc)
assert.equal((await current()).version, 5)
console.info('OK    удаление неиспользуемого инструмента и перевод используемого в closeOnly — разрешены')

await payload.update({ collection: 'sites', id: other.id, data: { instruments: [] } as never })
await payload.update({ collection: 'sites', id: site.id, data: { instruments: ['SOLUSD'] } as never })
const withoutBtcLtc = closeOnlyBtc.filter((i) => i.symbol !== 'BTCUSD' && i.symbol !== 'LTCUSD')
await save(withoutBtcLtc)
assert.equal((await current()).version, 6)
assert.deepEqual(await checkOpenPositions(['BTCUSD']), { allowed: true })
console.info('OK    после снятия у сайтов инструмент убирается из платформы; проверка открытых позиций — «разрешено»')

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

process.env.PLATFORM_INSTRUMENTS_WEBHOOK_URLS = ` http://127.0.0.1:${deadPort}/dead , http://127.0.0.1:${port}/hook`
process.env.PLATFORM_INSTRUMENTS_WEBHOOK_SECRET = 'platform-secret'
const started = Date.now()
await save(withoutBtcLtc)
assert.ok(Date.now() - started < 2_000, 'сохранение не ждёт вебхук')
assert.equal((await current()).version, 7)
for (let i = 0; i < 50 && received.length === 0; i++) await new Promise((r) => setTimeout(r, 100))
assert.equal(received.length, 1)
const hook = received[0]!
assert.equal(hook.signature, 'sha256=' + createHmac('sha256', 'platform-secret').update(hook.body, 'utf8').digest('hex'))
const hookBody = JSON.parse(hook.body) as Doc
assert.deepEqual(hookBody.tags, [PLATFORM_INSTRUMENTS_TAG])
assert.ok(typeof hookBody.event_id === 'string' && !Number.isNaN(Date.parse(hookBody.occurred_at)))
console.info('OK    вебхук: подпись HMAC sha256 верна, тег cms:platform:instruments; мёртвый адрес не мешает сохранению')

process.env.PLATFORM_INSTRUMENTS_WEBHOOK_URLS = `http://127.0.0.1:${deadPort}/dead`
await save(withoutBtcLtc)
assert.equal((await current()).version, 8)
delete process.env.PLATFORM_INSTRUMENTS_WEBHOOK_SECRET
const savedSiteSecret = process.env.SITE_WEBHOOK_SECRET
delete process.env.SITE_WEBHOOK_SECRET
await save(withoutBtcLtc)
assert.equal((await current()).version, 9)
if (savedSiteSecret !== undefined) process.env.SITE_WEBHOOK_SECRET = savedSiteSecret
console.info('OK    вебхук: все адреса недоступны или нет секрета — сохранение проходит, версия растёт')
server.close()

console.info('\nALL OK')
process.exit(0)
