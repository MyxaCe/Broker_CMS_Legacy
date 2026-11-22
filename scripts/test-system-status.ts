import 'dotenv/config'

import assert from 'node:assert/strict'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { mapSystemStatus } from '../src/lib/contract/mappers'
import { validateContract } from '../src/lib/contract/validate'
import { migrations } from '../src/migrations/index'

const TARGET = '20261122_135545_system_status_live'

const payload = await getPayload({ config })
const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: any[] }> } }).drizzle
const args = { db, payload, req: {} } as never

const existing = await db.execute(sql`SELECT to_regclass('public.sites') AS t`)
assert.equal(existing.rows[0]?.t ?? null, null, 'нужна пустая база: тест создаёт схему сам')

const index = migrations.findIndex((m) => m.name === TARGET)
assert.ok(index > 0)
for (const migration of migrations.slice(0, index)) await migration.up(args)

await db.execute(sql`
  INSERT INTO "sites" ("slug", "name", "primary_color", "demo_start_balance_cents", "updated_at", "created_at")
  VALUES ('old-a', 'Old A', '#d4a437', 0, now(), now());
  INSERT INTO "site_system_status" ("site_id", "_status", "updated_at", "created_at")
  SELECT "id", 'published', now(), now() FROM "sites" WHERE "slug" = 'old-a';
  INSERT INTO "site_system_status_services" ("_order", "_parent_id", "_locale", "id", "service_id", "name", "description", "status", "uptime90d")
  SELECT u.o, p."id", 'ru'::"_locales", 'ru-' || u.sid, u.sid, u.n, 'Описание', u.st::"enum_site_system_status_services_status", u.up
  FROM "site_system_status" p, (VALUES
    (1, 'svc-0', 'Сайт', 'operational', '99.99%'),
    (2, 'quotes-ws', 'Котировки', 'degraded', '99.98%'),
    (3, 'svc-3', 'Платежи', 'maintenance', '99.92%'),
    (4, 'custom', 'Своё', 'outage', 'n/a')) AS u(o, sid, n, st, up);
  INSERT INTO "site_system_status_services" ("_order", "_parent_id", "_locale", "id", "service_id", "name", "description", "status", "uptime90d")
  SELECT 1, "id", 'en'::"_locales", 'en-svc-2', 'svc-2', 'Client area', 'Profile', 'operational', '99.95%' FROM "site_system_status";
  INSERT INTO "site_system_status_incidents" ("_order", "_parent_id", "_locale", "id", "date", "title", "status", "text")
  SELECT u.o, p."id", u.l::"_locales", u.id, u.d, 'Заголовок', u.s, 'Текст'
  FROM "site_system_status" p, (VALUES
    (1, 'ru', 'i1', '2026-07-14', 'Решено'),
    (2, 'ru', 'i2', ' 2026-06-30 ', 'Расследуем'),
    (3, 'ru', 'i3', 'вчера', 'Что-то своё'),
    (4, 'ru', 'i4', '2026-02-30', 'Résolu'),
    (1, 'en', 'i5', '2026-07-14', 'Completed')) AS u(o, l, id, d, s);
  INSERT INTO "_site_system_status_v" ("parent_id", "version_site_id", "version__status", "latest", "version_updated_at", "version_created_at")
  SELECT "id", "site_id", 'published', true, now(), now() FROM "site_system_status";
  INSERT INTO "_site_system_status_v_version_services" ("_order", "_parent_id", "_locale", "service_id", "name", "description", "status", "uptime90d", "_uuid")
  SELECT 1, "id", 'ru'::"_locales", 'svc-1', 'API', 'Описание', 'maintenance', '99.97%', 'v-1' FROM "_site_system_status_v";
  INSERT INTO "_site_system_status_v_version_incidents" ("_order", "_parent_id", "_locale", "date", "title", "status", "text", "_uuid")
  SELECT 1, "id", 'ru'::"_locales", '2026-07-14', 'Заголовок', 'Исправляем', 'Текст', 'v-i1' FROM "_site_system_status_v";
`)

const LEGACY = sql`
  SELECT (SELECT json_agg(json_build_array(t."service_id", t."name", t."description", t."status", t."uptime90d") ORDER BY t._locale, t._order) FROM site_system_status_services t) AS services,
         (SELECT json_agg(json_build_array(t."date", t."title", t."status", t."text") ORDER BY t._locale, t._order) FROM site_system_status_incidents t) AS incidents,
         (SELECT json_agg(json_build_array(t."service_id", t."status", t."uptime90d")) FROM _site_system_status_v_version_services t) AS v_services,
         (SELECT json_agg(json_build_array(t."date", t."status")) FROM _site_system_status_v_version_incidents t) AS v_incidents`
const before = await db.execute(LEGACY)

await migrations[index]!.up(args)

const after = await db.execute(LEGACY)
assert.deepEqual(after.rows, before.rows)
console.info('OK    миграция: прежние поля (статус, uptime90d, дата и статус текстом) не тронуты')

const services = await db.execute(sql`
  SELECT "service_id", "check"::text AS "check", "manual_status"::text AS "manual"
  FROM "site_system_status_services" ORDER BY "_locale", "_order"`)
assert.deepEqual(
  services.rows.map((r) => [r.service_id, r.check, r.manual]),
  [
    ['svc-0', 'site', 'auto'],
    ['quotes-ws', 'quotes', 'auto'],
    ['svc-3', null, 'maintenance'],
    ['custom', null, 'auto'],
    ['svc-2', 'cabinet', 'auto'],
  ],
)
const vServices = await db.execute(sql`SELECT "check"::text AS c, "manual_status"::text AS m FROM "_site_system_status_v_version_services"`)
assert.deepEqual(vServices.rows, [{ c: 'terminal', m: 'maintenance' }])
console.info('OK    миграция: проверка по известным ID, «плановые работы» перенесены в ручной статус (и в версиях)')

const incidents = await db.execute(sql`
  SELECT "id", to_char("occurred_on" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS d, "state"::text AS s
  FROM "site_system_status_incidents" ORDER BY "_locale", "_order"`)
assert.deepEqual(
  incidents.rows.map((r) => [r.id, r.d, r.s]),
  [
    ['i1', '2026-07-14', 'resolved'],
    ['i2', '2026-06-30', 'investigating'],
    ['i3', null, null],
    ['i4', null, 'resolved'],
    ['i5', '2026-07-14', 'resolved'],
  ],
)
const vIncidents = await db.execute(sql`SELECT "state"::text AS s, "occurred_on" IS NOT NULL AS d FROM "_site_system_status_v_version_incidents"`)
assert.deepEqual(vIncidents.rows, [{ s: 'fixing', d: true }])
console.info('OK    миграция: дата и статус инцидента разобраны там, где это однозначно; нераспознанное осталось в старых полях')

const doc = await payload.find({ collection: 'site-system-status', locale: 'ru', limit: 1, depth: 0 })
const contract = mapSystemStatus(doc.docs[0] as never)
const check = validateContract('system-status', contract)
assert.ok(check.valid, check.errors.join('; '))
assert.deepEqual(
  contract.services.map((s: any) => [s.id, s.status, s.uptime90d, s.check, s.manualStatus]),
  [
    ['svc-0', 'operational', '99.99%', 'site', 'auto'],
    ['quotes-ws', 'degraded', '99.98%', 'quotes', 'auto'],
    ['svc-3', 'maintenance', '99.92%', null, 'maintenance'],
    ['custom', 'outage', 'n/a', null, 'auto'],
  ],
)
assert.deepEqual(
  contract.incidents.map((i: any) => [i.date, i.status, i.state]),
  [
    ['2026-07-14', 'Решено', 'resolved'],
    ['2026-06-30', 'Расследуем', 'investigating'],
    ['вчера', 'Что-то своё', null],
    ['2026-02-30', 'Résolu', 'resolved'],
  ],
)
console.info('OK    контракт: старые поля на месте (сайт без новой версии работает), новые — по схеме')

const maintenance = mapSystemStatus({
  services: [
    {
      serviceId: 'x',
      name: 'n',
      description: 'd',
      check: 'cms',
      manualStatus: 'maintenance',
      maintenanceNote: 'Обновление',
      maintenanceFrom: '2026-11-23T01:00:00.000Z',
      maintenanceTo: 'не дата',
      status: null,
      uptime90d: null,
    },
    { serviceId: 'y', name: 'n', description: 'd', manualStatus: 'auto', maintenanceNote: 'забытый текст', status: 'maintenance' },
  ],
  incidents: [{ occurredOn: '2026-11-20T12:00:00.000Z', title: 't', state: 'fixing', text: 'x', date: null, status: null }],
})
assert.ok(validateContract('system-status', maintenance).valid)
assert.deepEqual(maintenance.services[0], {
  id: 'x',
  name: 'n',
  description: 'd',
  status: 'maintenance',
  uptime90d: '',
  check: 'cms',
  manualStatus: 'maintenance',
  maintenanceNote: 'Обновление',
  maintenanceFrom: '2026-11-23T01:00:00.000Z',
  maintenanceTo: null,
})
assert.equal(maintenance.services[1]!.status, 'operational')
assert.equal(maintenance.services[1]!.maintenanceNote, null)
assert.deepEqual(maintenance.incidents[0], { date: '2026-11-20', title: 't', status: '', state: 'fixing', text: 'x' })
console.info('OK    контракт: плановые работы с текстом и периодом; «авто» не протаскивает старый maintenance')

await db.execute(sql`DELETE FROM "_site_system_status_v"`)
const updated = await payload.update({
  collection: 'site-system-status',
  id: doc.docs[0]!.id,
  locale: 'en',
  data: {
    incidents: [
      { occurredOn: '2026-11-21T12:00:00.000Z', title: 'New', state: 'investigating', text: 'Text' },
    ],
  } as never,
})
const en = mapSystemStatus(updated as never)
assert.deepEqual(en.incidents[0], { date: '2026-11-21', title: 'New', status: '', state: 'investigating', text: 'Text' })
console.info('OK    Payload: новый инцидент с датой из календаря и статусом из списка сохраняется')

await migrations[index]!.down(args)
const down = await db.execute(sql`
  SELECT count(*)::int AS n FROM information_schema.columns
  WHERE table_name LIKE '%system_status%' AND column_name IN ('check', 'manual_status', 'occurred_on', 'state', 'maintenance_note')`)
assert.equal(down.rows[0]?.n, 0)
const afterDown = await db.execute(sql`SELECT count(*)::int AS n FROM site_system_status_services`)
assert.equal(afterDown.rows[0]?.n, 5)
console.info('OK    миграция: откат проходит, прежние строки на месте')

console.info('\nALL OK')
process.exit(0)
