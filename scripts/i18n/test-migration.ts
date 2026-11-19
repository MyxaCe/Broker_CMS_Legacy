import 'dotenv/config'

import assert from 'node:assert/strict'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { migrations } from '../../src/migrations/index'

const TARGET = '20261119_145051_site_languages'

const payload = await getPayload({ config })
const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: any[] }> } }).drizzle
const args = { db, payload, req: {} } as never

const existing = await db.execute(sql`SELECT to_regclass('public.sites') AS t`)
assert.equal(existing.rows[0]?.t ?? null, null, 'нужна пустая база: тест миграции создаёт схему сам')

const index = migrations.findIndex((m) => m.name === TARGET)
assert.ok(index > 0)
for (const migration of migrations.slice(0, index)) await migration.up(args)

await db.execute(sql`
  INSERT INTO "sites" ("slug", "name", "primary_color", "demo_start_balance_cents", "updated_at", "created_at")
  VALUES ('old-a', 'Old A', '#d4a437', 1000000, now(), now()), ('old-b', 'Old B', '#d4a437', 500, now(), now());
  INSERT INTO "site_navigation" ("site_id", "_status", "updated_at", "created_at")
  SELECT "id", 'published', now(), now() FROM "sites" WHERE "slug" = 'old-a';
  INSERT INTO "site_navigation_locales" ("risk_warning", "_locale", "_parent_id")
  SELECT 'Риск', 'ru'::"_locales", "id" FROM "site_navigation" UNION ALL SELECT 'Risk', 'en'::"_locales", "id" FROM "site_navigation";
  INSERT INTO "site_navigation_header" ("_order", "_parent_id", "_locale", "id", "label", "href")
  SELECT 1, "id", 'ru'::"_locales", 'row-ru', 'Инструменты', '/instruments' FROM "site_navigation"
  UNION ALL SELECT 1, "id", 'en'::"_locales", 'row-en', 'Instruments', '/instruments' FROM "site_navigation";
`)

const contentBefore = await db.execute(sql`
  SELECT (SELECT json_agg(t ORDER BY _locale) FROM site_navigation_locales t) AS locales,
         (SELECT json_agg(t ORDER BY _locale) FROM site_navigation_header t) AS header`)

for (const migration of migrations.slice(index)) await migration.up(args)

const languages = await db.execute(sql`
  SELECT s."slug", s."default_language"::text AS def,
         array_agg(l."value"::text ORDER BY l."order") AS langs
  FROM "sites" s JOIN "sites_languages" l ON l."parent_id" = s."id"
  GROUP BY s."slug", s."default_language" ORDER BY s."slug"`)
assert.deepEqual(
  languages.rows.map((r) => [r.slug, r.def, r.langs]),
  [
    ['old-a', 'ru', ['ru', 'en']],
    ['old-b', 'ru', ['ru', 'en']],
  ],
)
console.info('OK    миграция: существующие сайты получили ["ru","en"] и "ru"')

const contentAfter = await db.execute(sql`
  SELECT (SELECT json_agg(t ORDER BY _locale) FROM site_navigation_locales t) AS locales,
         (SELECT json_agg(t ORDER BY _locale) FROM site_navigation_header t) AS header`)
assert.deepEqual(contentAfter.rows, contentBefore.rows)
console.info('OK    миграция: ru/en контент не изменился')

const locales = await db.execute(sql`SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS v
  FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = '_locales'`)
assert.deepEqual(locales.rows[0]?.v, ['ru', 'en', 'de', 'fr', 'es'])
console.info('OK    миграция: локали ru, en, de, fr, es')

const site = (await payload.find({ collection: 'sites', where: { slug: { equals: 'old-b' } }, depth: 0 })).docs[0] as unknown as Record<string, unknown>
assert.deepEqual(site.languages, ['ru', 'en'])
assert.equal(site.defaultLanguage, 'ru')
console.info('OK    миграция: Payload читает бэкфилл')

await migrations[migrations.length - 1]!.down(args)
const afterDown = await db.execute(sql`SELECT to_regclass('public.sites_languages') AS t`)
assert.equal(afterDown.rows[0]?.t ?? null, null)
console.info('OK    миграция: откат проходит')

console.info('\nALL OK')
process.exit(0)
