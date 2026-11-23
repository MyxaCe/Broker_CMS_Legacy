import 'dotenv/config'

import assert from 'node:assert/strict'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { mapAcademy, mapAccounts, mapBrand, mapPromotions, mapStreams } from '../../src/lib/contract/mappers'
import { validateContract } from '../../src/lib/contract/validate'
import {
  refreshPlatformInstruments,
  TERMINAL_PAIRS,
  toPlatformInstrumentsDto,
  validateCloseOnlyInstruments,
} from '../../src/lib/platform-instruments'
import { migrations } from '../../src/migrations/index'

const TARGET = '20261119_145051_site_languages'
const LIVE_PARAMS = '20261119_155549_live_params'
const PLATFORM = '20261121_120722_platform_instruments'
const SITE_INSTRUMENTS = '20261121_133912_site_instruments'
const VIDEO_LINKS = '20261122_133540_video_links'
const LEGAL_ENTITY = '20261122_134739_legal_entity'
const SYSTEM_STATUS = '20261122_135545_system_status_live'
const ARTICLES_CHAIN = ['20261122_140507_articles_editor', '20261122_140600_article_categories', '20261122_140700_academy_articles']
// Миграции после статей: обучающий курс (только данные, на сайте apex-ru; здесь его нет — ничего не добавляет).
const AFTER_ARTICLES = ['20261123_090000_education_course']

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
  VALUES ('old-a', 'Old A', '#d4a437', 1000000, now(), now()), ('old-b', 'Old B', '#d4a437', 500, now(), now()),
    ('old-c', 'Old C', '#d4a437', 0, now(), now()), ('old-d', 'Old D', '#d4a437', 0, now(), now());
  UPDATE "sites" SET "instruments" = '["EURUSD", "BTCUSD", "XAUUSD"]'::jsonb WHERE "slug" = 'old-a';
  UPDATE "sites" SET "instruments" = '["XAUUSD", "AAPL.US", "ETHUSD", "US500"]'::jsonb WHERE "slug" = 'old-b';
  UPDATE "sites" SET "instruments" = NULL WHERE "slug" = 'old-c';
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
  INSERT INTO "site_streams" ("site_id", "_status", "updated_at", "created_at")
  SELECT "id", 'published', now(), now() FROM "sites" WHERE "slug" = 'old-a';
  INSERT INTO "site_streams_items" ("_order", "_parent_id", "_locale", "id", "provider", "video_id", "title", "starts_at", "status")
  SELECT 1, "id", 'ru'::"_locales", 'stream-ru', 'youtube'::"enum_site_streams_items_provider", 'old-video-id', 'Эфир', '2026-08-05T18:00:00Z'::timestamptz, 'past'::"enum_site_streams_items_status" FROM "site_streams"
  UNION ALL SELECT 1, "id", 'en'::"_locales", 'stream-en', 'vimeo', '76979871', 'Stream', '2026-08-05T18:00:00Z', 'live' FROM "site_streams";
  INSERT INTO "site_academy" ("site_id", "_status", "updated_at", "created_at")
  SELECT "id", 'published', now(), now() FROM "sites" WHERE "slug" = 'old-a';
  INSERT INTO "site_academy_articles" ("_order", "_parent_id", "_locale", "id", "slug", "title", "excerpt", "level", "reading_minutes", "body_markdown")
  SELECT 1, "id", 'ru'::"_locales", 'art-ru', 'what-is-forex', 'Что такое Forex', 'Анонс', 'beginner', 7, 'Текст' FROM "site_academy";
  INSERT INTO "site_academy_webinars" ("_order", "_parent_id", "_locale", "id", "webinar_id", "title", "speaker", "speaker_role", "starts_at", "duration_minutes", "level", "description")
  SELECT 1, "id", 'ru'::"_locales", 'web-ru', 'web-1', 'Вебинар', 'Анна Б', 'Аналитик', '2026-07-01T10:00:00Z', 60, 'Новичок', 'Описание' FROM "site_academy";
`)

const CONTENT = sql`
  SELECT (SELECT json_agg(t ORDER BY _locale) FROM site_navigation_locales t) AS locales,
         (SELECT json_agg(t ORDER BY _locale) FROM site_navigation_header t) AS header,
         (SELECT json_agg(to_jsonb(t) - 'portfolio_key' ORDER BY t._locale, t._order) FROM site_accounts_items t) AS accounts,
         (SELECT json_agg(to_jsonb(t) - 'portfolio_key' ORDER BY t._locale, t._order) FROM _site_accounts_v_version_items t) AS accounts_versions,
         (SELECT json_agg(to_jsonb(t) - 'engine_promo_id' ORDER BY t._locale, t._order) FROM site_promotions_items t) AS promotions,
         (SELECT json_agg(to_jsonb(t) - 'video_url' ORDER BY t._locale, t._order) FROM site_streams_items t) AS streams,
         (SELECT json_agg(to_jsonb(t) - 'video_url' ORDER BY t._locale, t._order) FROM site_academy_articles t) AS academy_articles,
         (SELECT json_agg(to_jsonb(t) - 'recording_url' - 'join_url' ORDER BY t._locale, t._order) FROM site_academy_webinars t) AS academy_webinars,
         (SELECT json_agg(to_jsonb(t) - 'hero_background' - 'default_language' - 'close_only_instruments' - 'legal_entity_name' - 'legal_entity_registration_number' ORDER BY t.id) FROM sites t) AS sites`
const contentBefore = await db.execute(CONTENT)

const siteInstrumentsIndex = migrations.findIndex((m) => m.name === SITE_INSTRUMENTS)
assert.ok(siteInstrumentsIndex > index)
const videoIndex = migrations.findIndex((m) => m.name === VIDEO_LINKS)
assert.equal(videoIndex, siteInstrumentsIndex + 1)
for (const migration of migrations.slice(index, siteInstrumentsIndex)) await migration.up(args)
const manualBefore = await db.execute(sql`SELECT "instruments", "version"::int AS version FROM "platform_instruments"`)
await db.execute(sql`
  UPDATE "platform_instruments" SET "version" = 5, "instruments" = (
    SELECT jsonb_agg(CASE WHEN i ->> 'symbol' IN ('BTCUSD', 'XAUUSD', 'SOLUSD') THEN jsonb_set(i, '{mode}', '"closeOnly"') ELSE i END ORDER BY o)
    FROM jsonb_array_elements("instruments") WITH ORDINALITY AS t(i, o)
  )`)
await migrations[siteInstrumentsIndex]!.up(args)
for (const migration of migrations.slice(siteInstrumentsIndex + 1)) await migration.up(args)

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
    ['old-c', 'ru', ['ru', 'en']],
    ['old-d', 'ru', ['ru', 'en']],
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
    ['old-c', 'quotes'],
    ['old-d', 'quotes'],
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

const VIDEO_COLUMNS = sql`
  SELECT table_name || '.' || column_name AS c FROM information_schema.columns
  WHERE column_name IN ('video_url', 'recording_url', 'join_url') AND table_name NOT IN ('articles_locales', '_articles_v_locales') ORDER BY 1`
assert.deepEqual((await db.execute(VIDEO_COLUMNS)).rows.map((r) => r.c), [
  '_site_academy_v_version_articles.video_url',
  '_site_academy_v_version_webinars.join_url',
  '_site_academy_v_version_webinars.recording_url',
  '_site_streams_v_version_items.video_url',
  'site_academy_articles.video_url',
  'site_academy_webinars.join_url',
  'site_academy_webinars.recording_url',
  'site_streams_items.video_url',
])
for (const locale of ['ru', 'en'] as const) {
  const streamsDoc = (await payload.find({ collection: 'site-streams', where: { site: { equals: siteA.id } }, locale, depth: 0 })).docs[0] as unknown as Record<string, any>
  const streams = mapStreams(streamsDoc)
  assert.deepEqual(
    streams.items.map((i: Record<string, unknown>) => [i.provider, i.videoId, 'videoUrl' in i]),
    [locale === 'ru' ? ['youtube', 'old-video-id', false] : ['vimeo', '76979871', false]],
  )
  assert.ok(validateContract('streams', streams).valid)
}
const academyDoc = (await payload.find({ collection: 'site-academy', where: { site: { equals: siteA.id } }, locale: 'ru', depth: 0 })).docs[0] as unknown as Record<string, any>
const academy = mapAcademy(academyDoc)
assert.equal('video' in academy.articles[0], false)
assert.equal('recording' in academy.webinars[0] || 'joinUrl' in academy.webinars[0], false)
assert.ok(validateContract('academy', academy).valid)
console.info('OK    миграция видео-ссылок: только новые пустые колонки, прежние эфиры и вебинары отдаются как раньше')

const legalIndex = migrations.findIndex((m) => m.name === LEGAL_ENTITY)
assert.equal(legalIndex, videoIndex + 1)
assert.equal('legalEntity' in brand, false)
await migrations[legalIndex]!.up(args)
await db.execute(sql`
  UPDATE "sites" SET "legal_entity_name" = 'Example Ltd', "legal_entity_registration_number" = 'EX-000000' WHERE "slug" = 'old-a';
  INSERT INTO "sites_locales" ("legal_entity_address", "_locale", "_parent_id")
  SELECT 'Пример, ул. Примерная, 1', 'ru'::"_locales", "id" FROM "sites" WHERE "slug" = 'old-a';
  INSERT INTO "sites_legal_entity_licenses" ("_order", "_parent_id", "id", "number", "verify_url")
  SELECT 1, "id", 'lic-1', 'LIC-0001', 'https://register.example.test/firms/LIC-0001' FROM "sites" WHERE "slug" = 'old-a';
  INSERT INTO "sites_legal_entity_licenses_locales" ("activity", "regulator", "_locale", "_parent_id")
  VALUES ('Брокер', 'Пример-регулятор', 'ru', 'lic-1'), ('Broker', 'Example Authority', 'en', 'lic-1');
`)
for (const [locale, activity, regulator] of [
  ['ru', 'Брокер', 'Пример-регулятор'],
  ['en', 'Broker', 'Example Authority'],
] as const) {
  const doc = (await payload.find({ collection: 'sites', where: { slug: { equals: 'old-a' } }, locale, depth: 0 })).docs[0] as unknown as Record<string, any>
  const localized = mapBrand(doc)
  assert.ok(validateContract('brand', localized).valid)
  assert.deepEqual(localized.legalEntity, {
    name: 'Example Ltd',
    registrationNumber: 'EX-000000',
    address: 'Пример, ул. Примерная, 1',
    licenses: [{
      number: 'LIC-0001',
      activity,
      regulator,
      regulatorCountry: null,
      verifyUrl: 'https://register.example.test/firms/LIC-0001',
      document: null,
    }],
  })
}
console.info('OK    миграция: юрлицо — повторный прогон безопасен, пустые сайты без legalEntity, переводы лицензии по локали, адрес с запасным ru')

const articlesIndexes = ARTICLES_CHAIN.map((name) => migrations.findIndex((m) => m.name === name))
const statusBeforeArticles = migrations.findIndex((m) => m.name === SYSTEM_STATUS)
assert.deepEqual(articlesIndexes, [statusBeforeArticles + 1, statusBeforeArticles + 2, statusBeforeArticles + 3])
assert.equal(articlesIndexes[2], migrations.length - 1 - AFTER_ARTICLES.length)
assert.deepEqual(migrations.slice(articlesIndexes[2]! + 1).map((m) => m.name), AFTER_ARTICLES)
const ARTICLES_STATE = sql`
  SELECT a."slug", a."section"::text AS section, a."level"::text AS level, a."_status"::text AS status, l."_locale"::text AS locale, l."title", l."body" IS NOT NULL AS has_body,
         (SELECT count(*)::int FROM "_articles_v" v WHERE v."parent_id" = a."id") AS versions
  FROM "articles" a JOIN "articles_locales" l ON l."_parent_id" = a."id" ORDER BY a."slug", l."_locale"`
const movedArticles = await db.execute(ARTICLES_STATE)
assert.deepEqual(movedArticles.rows, [
  { slug: 'what-is-forex', section: 'education', level: 'beginner', status: 'published', locale: 'ru', title: 'Что такое Forex', has_body: true, versions: 1 },
])
for (const i of articlesIndexes) await migrations[i]!.up(args)
assert.deepEqual((await db.execute(ARTICLES_STATE)).rows, movedArticles.rows)
assert.equal((await db.execute(sql`SELECT count(*)::int AS n FROM "article_categories"`)).rows[0]?.n, 0)
console.info('OK    миграции статей (последние в цепочке перед курсом): статья обучения перенесена в коллекцию с Lexical, повторный прогон ничего не меняет')

const expectedPlatform = [...TERMINAL_PAIRS, 'EURUSD', 'XAUUSD', 'AAPL.US', 'US500'].map((symbol) => ({ symbol, mode: 'trade' }))
assert.deepEqual(manualBefore.rows[0].instruments, expectedPlatform)
assert.equal(manualBefore.rows[0].version, 1)
const manualCloseOnly = expectedPlatform.map((i) =>
  ['BTCUSD', 'XAUUSD', 'SOLUSD'].includes(i.symbol) ? { ...i, mode: 'closeOnly' } : i,
)
const platformRows = await db.execute(sql`SELECT "instruments", "version"::int AS version, "computed_hash" FROM "platform_instruments"`)
assert.equal(platformRows.rows.length, 1)
assert.deepEqual(platformRows.rows[0].instruments, manualCloseOnly)
assert.equal(platformRows.rows[0].version, 5)
assert.equal(platformRows.rows[0].computed_hash, null)
console.info('OK    миграция: прежний ручной список платформы сохранён как был (данные не удалены), version не тронута')

const sitesInstruments = await db.execute(sql`SELECT "slug", "instruments", "close_only_instruments" FROM "sites" ORDER BY "slug"`)
assert.deepEqual(
  sitesInstruments.rows.map((r) => [r.slug, r.instruments, r.close_only_instruments]),
  [
    ['old-a', ['EURUSD', 'BTCUSD', 'XAUUSD'], ['BTCUSD', 'XAUUSD']],
    ['old-b', ['XAUUSD', 'AAPL.US', 'ETHUSD', 'US500'], ['XAUUSD']],
    ['old-c', null, []],
    ['old-d', [], []],
  ],
)
for (const row of sitesInstruments.rows) {
  assert.equal(validateCloseOnlyInstruments(row.close_only_instruments, { instruments: row.instruments }), true, row.slug)
}
console.info('OK    миграция: режим closeOnly перенесён из ручного списка в сайты, где символ включён (SOLUSD не включён никому — никуда); инструменты сайтов не изменились')

const platformDto = toPlatformInstrumentsDto(await refreshPlatformInstruments(payload))
assert.deepEqual(platformDto.instruments, [
  { symbol: 'EURUSD', mode: 'trade' },
  { symbol: 'BTCUSD', mode: 'closeOnly' },
  { symbol: 'XAUUSD', mode: 'closeOnly' },
  { symbol: 'AAPL.US', mode: 'trade' },
  { symbol: 'ETHUSD', mode: 'trade' },
  { symbol: 'US500', mode: 'trade' },
])
assert.equal(platformDto.version, 6)
assert.ok(validateContract('platform-instruments', platformDto).valid)
assert.equal((await refreshPlatformInstruments(payload)).version, 6)
const siteB = (await payload.find({ collection: 'sites', where: { slug: { equals: 'old-b' } }, depth: 0 })).docs[0] as unknown as Record<string, unknown>
assert.deepEqual(siteB.closeOnlyInstruments, ['XAUUSD'])
console.info(`OK    миграция: платформа теперь вычисляется из сайтов (${platformDto.instruments.length} вместо ${manualCloseOnly.length}), version 5 → 6 при первом запросе, дальше не растёт; Payload читает closeOnlyInstruments`)

const platformIndex = migrations.findIndex((m) => m.name === PLATFORM)
assert.equal(platformIndex, siteInstrumentsIndex - 1)
await db.execute(sql`UPDATE "sites" SET "close_only_instruments" = '["EURUSD"]'::jsonb WHERE "slug" = 'old-a'`)
await db.execute(sql`UPDATE "platform_instruments" SET "instruments" = '[{"symbol": "BTCUSD", "mode": "closeOnly"}]'::jsonb, "version" = 7`)
await migrations[platformIndex]!.up(args)
await migrations[siteInstrumentsIndex]!.up(args)
const reapplied = await db.execute(sql`SELECT "instruments", "version"::int AS version FROM "platform_instruments"`)
assert.deepEqual(reapplied.rows.map((r) => [r.instruments, r.version]), [[[{ symbol: 'BTCUSD', mode: 'closeOnly' }], 7]])
const reappliedSites = await db.execute(sql`SELECT "slug", "close_only_instruments" FROM "sites" ORDER BY "slug"`)
assert.deepEqual(reappliedSites.rows.map((r) => [r.slug, r.close_only_instruments]), [
  ['old-a', ['EURUSD']],
  ['old-b', ['XAUUSD']],
  ['old-c', []],
  ['old-d', []],
])
console.info('OK    миграция: повторный прогон не трогает ни ручной список, ни режимы сайтов')

const statusIndex = migrations.findIndex((m) => m.name === SYSTEM_STATUS)
assert.equal(statusIndex, legalIndex + 1)
assert.equal(statusIndex, migrations.length - 1 - ARTICLES_CHAIN.length - AFTER_ARTICLES.length)
const STATUS_COLUMNS = sql`
  SELECT count(*)::int AS n FROM information_schema.columns
  WHERE table_name LIKE '%system_status%' AND column_name IN ('check', 'manual_status', 'maintenance_note', 'occurred_on', 'state')`
assert.equal((await db.execute(STATUS_COLUMNS)).rows[0]?.n, 10)
console.info('OK    миграция статуса сервисов идёт после юрлица и применена')

for (const migration of migrations.slice(videoIndex + 1).reverse()) await migration.down(args)
assert.equal((await db.execute(STATUS_COLUMNS)).rows[0]?.n, 0)
console.info('OK    миграция: откат статуса сервисов проходит')
const legalDown = await db.execute(sql`
  SELECT to_regclass('public.sites_locales') AS a, to_regclass('public.sites_legal_entity_licenses') AS b,
    (SELECT count(*)::int FROM information_schema.columns WHERE column_name LIKE 'legal_entity_%') AS n`)
assert.deepEqual(legalDown.rows[0], { a: null, b: null, n: 0 })
assert.equal((await db.execute(sql`SELECT to_regclass('public.article_categories') AS t`)).rows[0]?.t ?? null, null)
assert.equal((await db.execute(sql`SELECT count(*)::int AS n FROM "articles"`)).rows[0]?.n, 0)
console.info('OK    миграция: откат статей и юрлица проходит')

await migrations[videoIndex]!.up(args)
await migrations[videoIndex]!.down(args)
assert.deepEqual((await db.execute(VIDEO_COLUMNS)).rows, [])
assert.deepEqual((await db.execute(CONTENT)).rows, contentBefore.rows)
console.info('OK    миграция видео-ссылок: повторный прогон и откат проходят, контент не тронут')

await migrations[siteInstrumentsIndex]!.down(args)
const siteDown = await db.execute(sql`
  SELECT count(*)::int AS n FROM information_schema.columns WHERE column_name IN ('close_only_instruments', 'computed_hash')`)
assert.equal(siteDown.rows[0]?.n, 0)
console.info('OK    миграция: откат closeOnlyInstruments проходит')

await migrations[platformIndex]!.down(args)
const platformDown = await db.execute(sql`SELECT to_regclass('public.platform_instruments') AS t`)
assert.equal(platformDown.rows[0]?.t ?? null, null)
console.info('OK    миграция: откат инструментов платформы проходит')

const liveParams = migrations.findIndex((m) => m.name === LIVE_PARAMS)
assert.equal(liveParams, platformIndex - 1)
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
