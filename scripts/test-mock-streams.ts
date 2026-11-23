import 'dotenv/config'

import assert from 'node:assert/strict'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { GET } from '../src/app/v1/cms/[...path]/route'
import { validateContract } from '../src/lib/contract/validate'
import { MOCK_STREAM_IDS } from '../src/lib/mock-streams'
import { migrations } from '../src/migrations/index'

type Doc = Record<string, any>

const API_KEY = 'mock-streams-test-key'
process.env.CMS_API_KEY = API_KEY
let failures = 0

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.info(`OK    ${name}`)
  } catch (error) {
    failures++
    console.info(`FAIL  ${name}\n      ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
  }
}

async function fetchJson(path: string, query: string) {
  const res = await GET(new Request(`http://cms.test/v1/cms/${path}?${query}`, { headers: { 'X-API-Key': API_KEY } }), {
    params: Promise.resolve({ path: path.split('/') }),
  })
  return { status: res.status, body: (await res.json()) as Doc }
}

const payload = await getPayload({ config })
const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: any[] }> } }).drizzle
const args = { db, payload, req: {} } as never

const empty = await db.execute(sql`SELECT to_regclass('public.sites') AS t`)
assert.equal(empty.rows[0]?.t ?? null, null, 'нужна пустая база: тест создаёт схему миграциями сам')

const index = migrations.findIndex((m) => m.name === '20261123_150000_remove_mock_streams')
assert.ok(index > 0, 'миграция удаления пробных эфиров есть в списке')
assert.equal(index, migrations.length - 1, 'миграция последняя в цепочке')
const ours = migrations[index]!
for (const migration of migrations.slice(0, index)) await migration.up(args)

await db.execute(sql`
  INSERT INTO "sites" ("slug", "name", "primary_color", "demo_start_balance_cents", "updated_at", "created_at")
  VALUES ('apex-ru', 'Apex', '#d4a437', 0, now(), now()), ('other', 'Other', '#d4a437', 0, now(), now());
  INSERT INTO "site_streams" ("site_id", "_status", "updated_at", "created_at")
  SELECT "id", 'published', now(), now() FROM "sites";
  INSERT INTO "site_streams_items" ("_order", "_parent_id", "_locale", "id", "provider", "video_id", "title", "starts_at", "status")
  SELECT o, s."id", l::"_locales", s."id" || '-' || l || '-' || v, 'youtube'::"enum_site_streams_items_provider", v, 'Эфир ' || v, '2026-08-05T18:00:00Z'::timestamptz, 'past'::"enum_site_streams_items_status"
  FROM "site_streams" s,
       unnest(ARRAY['mock-live-review', 'dQw4w9WgXcQ', 'mock-gold-breakdown']) WITH ORDINALITY AS u(v, o),
       unnest(ARRAY['ru', 'en', 'de']) AS l;
  INSERT INTO "_site_streams_v" ("parent_id", "version_site_id", "version__status", "latest", "version_updated_at", "version_created_at")
  SELECT "id", "site_id", 'published', true, now(), now() FROM "site_streams";
  INSERT INTO "_site_streams_v_version_items" ("_order", "_parent_id", "_locale", "provider", "video_id", "title", "starts_at", "status", "_uuid")
  SELECT o, v."id", l::"_locales", 'youtube', u.vid, 'Эфир ' || u.vid, '2026-08-05T18:00:00Z', 'past', v."id" || '-' || l || '-' || u.vid
  FROM "_site_streams_v" v,
       unnest(ARRAY['mock-live-review', 'dQw4w9WgXcQ', 'mock-gold-breakdown']) WITH ORDINALITY AS u(vid, o),
       unnest(ARRAY['ru', 'en', 'de']) AS l;
`)

async function videoIds(table: 'site_streams_items' | '_site_streams_v_version_items'): Promise<string[]> {
  const rows = await db.execute(sql.raw(`SELECT "video_id" FROM "${table}" ORDER BY "_parent_id", "_locale", "_order"`))
  return rows.rows.map((r) => String(r.video_id))
}

await ours.up(args)

await check('up: пробные эфиры удалены у всех сайтов и локалей, настоящий эфир остался', async () => {
  const live = await videoIds('site_streams_items')
  assert.equal(live.length, 6)
  assert.ok(live.every((id) => id === 'dQw4w9WgXcQ'))
})

await check('up: пробные эфиры удалены и из версий (черновик в админке их не вернёт)', async () => {
  const versions = await videoIds('_site_streams_v_version_items')
  assert.equal(versions.length, 6)
  assert.ok(versions.every((id) => id === 'dQw4w9WgXcQ'))
})

await check('повторный up ничего не ломает', async () => {
  await ours.up(args)
  assert.equal((await videoIds('site_streams_items')).length, 6)
})

await check('контракт streams: ответ валиден, пробных эфиров нет', async () => {
  for (const locale of ['ru', 'en']) {
    const { status, body } = await fetchJson('streams', `locale=${locale}&site=apex-ru`)
    assert.equal(status, 200)
    assert.ok(validateContract('streams', body).valid, JSON.stringify(body))
    assert.deepEqual(
      body.items.map((i: Doc) => i.videoId),
      ['dQw4w9WgXcQ'],
    )
  }
})

await check('пустой список эфиров валиден по контракту', () => {
  assert.ok(validateContract('streams', { items: [] }).valid)
})

const LIVE_BEFORE = sql`SELECT to_jsonb(i) AS r FROM "site_streams_items" i ORDER BY "id"`
const VERSIONS_BEFORE = sql`SELECT to_jsonb(v) AS r FROM "_site_streams_v_version_items" v ORDER BY "id"`

await check('down: возвращает ровно удалённые строки (те же id, порядок, локали) и в версии; повторный down без дублей', async () => {
  await ours.down(args)
  await ours.down(args)
  const live = (await db.execute(LIVE_BEFORE)).rows.map((r) => r.r)
  const versions = (await db.execute(VERSIONS_BEFORE)).rows.map((r) => r.r)
  assert.equal(live.length, 18)
  assert.equal(versions.length, 18)
  for (const mock of MOCK_STREAM_IDS) assert.equal(live.filter((r: Doc) => r.video_id === mock).length, 6)
  const ru = live.filter((r: Doc) => r._locale === 'ru' && r._parent_id === live[0]._parent_id).sort((x: Doc, y: Doc) => x._order - y._order)
  assert.deepEqual(ru.map((r: Doc) => r.video_id), ['mock-live-review', 'dQw4w9WgXcQ', 'mock-gold-breakdown'])
  const backup = await db.execute(sql`SELECT to_regclass('public._removed_mock_streams') AS t`)
  assert.equal(backup.rows[0]?.t ?? null, null, 'служебная таблица убрана')
})

await check('up после down снова удаляет пробные эфиры', async () => {
  await ours.up(args)
  const live = await videoIds('site_streams_items')
  assert.ok(live.every((id) => id === 'dQw4w9WgXcQ'))
})

console.info(failures ? `\n${failures} FAILURES` : '\nALL OK')
process.exit(failures ? 1 : 0)
