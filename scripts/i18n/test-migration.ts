import 'dotenv/config'

import assert from 'node:assert/strict'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { mapAccounts, mapBrand, mapPromotions } from '../../src/lib/contract/mappers'
import { validateContract } from '../../src/lib/contract/validate'
import { migrations } from '../../src/migrations/index'

const TARGET = '20261119_145051_site_languages'
const LIVE_PARAMS = '20261119_155549_live_params'

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
  INSERT INTO "site_accounts" ("site_id", "_status", "updated_at", "created_at")
  SELECT "id", 'published', now(), now() FROM "sites" WHERE "slug" = 'old-a';
  INSERT INTO "site_accounts_items" ("_order", "_parent_id", "_locale", "id", "plan_id", "name", "description", "min_deposit", "featured", "pricing_spread_pips", "pricing_commission_per_lot_r_t")
  SELECT u.o, a."id", l::"_locales", l || '-' || u.p, u.p, initcap(u.p), 'Описание ' || u.p, '$100', false, 1.2, 0
  FROM "site_accounts" a, unnest(ARRAY['standard', 'pro', 'ecn', 'vip']) WITH ORDINALITY AS u(p, o), unnest(ARRAY['ru', 'en']) AS l;
  INSERT INTO "_site_accounts_v" ("parent_id", "version_site_id", "version__status", "latest", "version_updated_at", "version_created_at")
  SELECT "id", "site_id", 'published', true, now(), now() FROM "site_accounts";
  INSERT INTO "_site_accounts_v_version_items" ("_order", "_parent_id", "_locale", "plan_id", "name", "description", "min_deposit", "_uuid")
  SELECT u.o, v."id", l::"_locales", u.p, initcap(u.p), 'Описание ' || u.p, '$100', l || '-' || u.p
  FROM "_site_accounts_v" v, unnest(ARRAY['standard', 'pro', 'ecn', 'vip']) WITH ORDINALITY AS u(p, o), unnest(ARRAY['ru', 'en']) AS l;
  INSERT INTO "site_promotions" ("site_id", "_status", "updated_at", "created_at")
  SELECT "id", 'published', now(), now() FROM "sites" WHERE "slug" = 'old-a';
  INSERT INTO "site_promotions_items" ("_order", "_parent_id", "_locale", "id", "promo_id", "badge", "title", "description", "terms", "cta_label", "cta_href")
  SELECT 1, "id", 'ru'::"_locales", 'promo-ru', 'promo-1', 'Бейдж', 'Бонус', 'Описание', 'Условия', 'Получить', '/register' FROM "site_promotions";
`)

const CONTENT = sql`
  SELECT (SELECT json_agg(t ORDER BY _locale) FROM site_navigation_locales t) AS locales,
         (SELECT json_agg(t ORDER BY _locale) FROM site_navigation_header t) AS header,
         (SELECT json_agg(to_jsonb(t) - 'portfolio_key' ORDER BY t._locale, t._order) FROM site_accounts_items t) AS accounts,
         (SELECT json_agg(to_jsonb(t) - 'portfolio_key' ORDER BY t._locale, t._order) FROM _site_accounts_v_version_items t) AS accounts_versions,
         (SELECT json_agg(to_jsonb(t) - 'engine_promo_id' ORDER BY t._locale, t._order) FROM site_promotions_items t) AS promotions,
         (SELECT json_agg(to_jsonb(t) - 'hero_background' - 'default_language' ORDER BY t.id) FROM sites t) AS sites`
const contentBefore = await db.execute(CONTENT)

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

const contentAfter = await db.execute(CONTENT)
assert.deepEqual(contentAfter.rows, contentBefore.rows)
console.info('OK    миграция: ru/en контент не изменился')

const hero = await db.execute(sql`SELECT "slug", "hero_background"::text AS hero FROM "sites" ORDER BY "slug"`)
assert.deepEqual(
  hero.rows.map((r) => [r.slug, r.hero]),
  [
    ['old-a', 'quotes'],
    ['old-b', 'quotes'],
  ],
)
console.info('OK    миграция: существующие сайты получили heroBackground "quotes"')

for (const table of ['site_accounts_items', '_site_accounts_v_version_items']) {
  const keys = await db.execute(sql.raw(`SELECT DISTINCT "plan_id", "portfolio_key" FROM "${table}" ORDER BY "plan_id"`))
  assert.deepEqual(
    keys.rows.map((r) => [r.plan_id, r.portfolio_key]),
    [
      ['ecn', 'enc_prime'],
      ['pro', 'pro'],
      ['standard', 'standard'],
      ['vip', null],
    ],
  )
}
console.info('OK    миграция: тарифы получили portfolioKey по planId (ecn → enc_prime, неизвестный — пусто)')

const promos = await db.execute(sql`SELECT count(*)::int AS n FROM "site_promotions_items" WHERE "engine_promo_id" IS NULL`)
assert.equal(promos.rows[0]?.n, 1)
console.info('OK    миграция: у акций появилось пустое поле promoId движка')

const locales = await db.execute(sql`SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS v
  FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = '_locales'`)
assert.deepEqual(locales.rows[0]?.v, ['ru', 'en', 'de', 'fr', 'es'])
console.info('OK    миграция: локали ru, en, de, fr, es')

const site = (await payload.find({ collection: 'sites', where: { slug: { equals: 'old-b' } }, depth: 0 })).docs[0] as unknown as Record<string, unknown>
assert.deepEqual(site.languages, ['ru', 'en'])
assert.equal(site.defaultLanguage, 'ru')
assert.equal(site.heroBackground, 'quotes')
console.info('OK    миграция: Payload читает бэкфилл')

const siteA = (await payload.find({ collection: 'sites', where: { slug: { equals: 'old-a' } }, depth: 0 })).docs[0] as unknown as Record<string, any>
const brand = mapBrand(siteA)
assert.equal(brand.heroBackground, 'quotes')
assert.ok(validateContract('brand', brand).valid)
for (const locale of ['ru', 'en'] as const) {
  const accountsDoc = (
    await payload.find({ collection: 'site-accounts', where: { site: { equals: siteA.id } }, locale, depth: 0 })
  ).docs[0] as unknown as Record<string, any>
  const accounts = mapAccounts(accountsDoc)
  assert.deepEqual(
    accounts.items.map((i: Record<string, unknown>) => i.portfolioKey ?? null),
    ['standard', 'pro', 'enc_prime', null],
  )
  const check = validateContract('accounts', accounts)
  assert.ok(check.valid, JSON.stringify(check))
}
const promotionsDoc = (
  await payload.find({ collection: 'site-promotions', where: { site: { equals: siteA.id } }, locale: 'ru', depth: 0 })
).docs[0] as unknown as Record<string, any>
const promotions = mapPromotions(promotionsDoc)
assert.equal('promoId' in promotions.items[0], false)
assert.ok(validateContract('promotions', promotions).valid)
console.info('OK    миграция: brand, accounts, promotions после миграции валидны по контракту')

const liveParams = migrations.findIndex((m) => m.name === LIVE_PARAMS)
assert.equal(liveParams, migrations.length - 1)
await migrations[liveParams]!.down(args)
const liveDown = await db.execute(sql`
  SELECT count(*)::int AS n FROM information_schema.columns
  WHERE column_name IN ('hero_background', 'portfolio_key', 'engine_promo_id')`)
assert.equal(liveDown.rows[0]?.n, 0)
const afterLiveDown = await db.execute(CONTENT)
assert.deepEqual(afterLiveDown.rows, contentBefore.rows)
console.info('OK    миграция: откат live_params проходит, контент не тронут')

await migrations[index]!.down(args)
const afterDown = await db.execute(sql`SELECT to_regclass('public.sites_languages') AS t`)
assert.equal(afterDown.rows[0]?.t ?? null, null)
console.info('OK    миграция: откат языков проходит')

console.info('\nALL OK')
process.exit(0)
