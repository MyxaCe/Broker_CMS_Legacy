import 'dotenv/config'

import assert from 'node:assert/strict'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { GET } from '../src/app/v1/cms/[...path]/route'
import { Articles } from '../src/collections/Articles'
import { slugify, uniqueSlug } from '../src/lib/article-slug'
import { SLUG_TAKEN_ERROR } from '../src/lib/article-hooks'
import { countWords, lexicalToPlainText, readingMinutesFor } from '../src/lib/article-text'
import { articleWhere } from '../src/lib/contract/articles'
import { mapAcademyArticle, mapArticle, mapLexicalBody } from '../src/lib/contract/mappers'
import { validateContract } from '../src/lib/contract/validate'
import { articlePreviewPath, localizedSitePath } from '../src/lib/preview-url'
import { migrations } from '../src/migrations/index'

type Doc = Record<string, any>

const API_KEY = 'articles-test-key'
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

const text = (t: string, format = 0) => ({ type: 'text', text: t, format, version: 1, mode: 'normal', style: '', detail: 0 })
const paragraph = (...children: Doc[]) => ({ type: 'paragraph', version: 1, format: '', indent: 0, direction: null, children })
const lexical = (...children: Doc[]) => ({ root: { type: 'root', version: 1, format: '', indent: 0, direction: null, children } })
const words = (n: number) => Array.from({ length: n }, (_, i) => `слово${i}`).join(' ')

await check('slug: кириллица транслитерируется, de/fr/es — без диакритики', () => {
  assert.equal(slugify('ФРС даёт сигнал: рынки ждут снижения ставки!'), 'frs-dayot-signal-rynki-zhdut-snizheniya-stavki')
  assert.equal(slugify('Щука, ёж и чай'), 'shchuka-yozh-i-chay')
  assert.equal(slugify('Größe & Übermäßige Ölpreise'), 'groesse-uebermaessige-oelpreise')
  assert.equal(slugify('Économie : où va l’euro ? Ça dépend'), 'economie-ou-va-l-euro-ca-depend')
  assert.equal(slugify('¿Qué pasará con el año fiscal? Señales'), 'que-pasara-con-el-ano-fiscal-senales')
  assert.equal(slugify('  --Gold 2026: $2,450--  '), 'gold-2026-2-450')
  assert.equal(slugify('!!!'), '')
  assert.equal(slugify(undefined), '')
  const long = slugify('очень длинный заголовок '.repeat(10))
  assert.ok(long.length <= 80 && !long.endsWith('-'), long)
})

await check('slug: уникальность — суффикс -2, -3', async () => {
  const taken = new Set(['zoloto', 'zoloto-2'])
  assert.equal(await uniqueSlug('zoloto', async (s) => taken.has(s)), 'zoloto-3')
  assert.equal(await uniqueSlug('neft', async (s) => taken.has(s)), 'neft')
  assert.equal(await uniqueSlug('', async () => false), 'article')
})

await check('время чтения: 200 слов в минуту, минимум 1, текст из Lexical', () => {
  assert.equal(readingMinutesFor(''), 1)
  assert.equal(readingMinutesFor(words(200)), 1)
  assert.equal(readingMinutesFor(words(201)), 2)
  assert.equal(readingMinutesFor(words(1000)), 5)
  assert.equal(countWords('EUR/USD — 1.0850, rock’n’roll и т. п.'), 8)
  const body = lexical(
    { type: 'heading', tag: 'h2', version: 1, children: [text('Заголовок')] },
    paragraph(text('раз два '), text('три', 1)),
    { type: 'list', listType: 'bullet', version: 1, children: [{ type: 'listitem', version: 1, children: [text('пункт')] }] },
  )
  assert.equal(lexicalToPlainText(body), 'Заголовок\nраз два три\nпункт')
})

await check('контракт: Lexical очищается — картинка из media, видео-блок, ссылки только безопасные', () => {
  const media = { url: '/api/media/file/a.png', width: 800, height: 400, alt: 'График', mimeType: 'image/png' }
  const body = mapLexicalBody(
    lexical(
      paragraph(
        { type: 'link', version: 3, fields: { url: 'https://example.com/x', newTab: true, linkType: 'custom', doc: null }, children: [text('ссылка')] },
        { type: 'link', version: 3, fields: { url: 'javascript:alert(1)', linkType: 'custom' }, children: [text('плохая')] },
        { type: 'link', version: 3, fields: { linkType: 'internal', doc: { value: 1 } }, children: [text('внутренняя')] },
      ),
      { type: 'upload', version: 3, relationTo: 'media', value: media },
      { type: 'upload', version: 3, relationTo: 'media', value: 42 },
      { type: 'block', version: 2, fields: { id: 'b1', blockType: 'video', blockName: '', url: 'https://youtu.be/dQw4w9WgXcQ', caption: ' Разбор ' } },
      { type: 'block', version: 2, fields: { blockType: 'video', url: 'https://example.com/v' } },
      { type: 'relationship', version: 2, value: 1 },
    ),
  )!
  const [p, upload, video, ...rest] = body.root.children
  assert.equal(rest.length, 0)
  assert.deepEqual(p.children[0].fields, { url: 'https://example.com/x', newTab: true })
  assert.deepEqual(p.children.slice(1).map((n: Doc) => n.type + ':' + n.text), ['text:плохая', 'text:внутренняя'])
  assert.equal(upload.media.url, 'http://localhost:3001/api/media/file/a.png')
  assert.deepEqual(video.fields, { blockType: 'video', video: { provider: 'youtube', videoId: 'dQw4w9WgXcQ', url: 'https://youtu.be/dQw4w9WgXcQ' }, caption: 'Разбор' })
  assert.equal(mapLexicalBody(null), null)
  assert.equal(mapLexicalBody(lexical()), null)
})

await check('контракт: прежние поля на месте, новые — необязательные; старый ответ валиден', () => {
  const base = { slug: 's', title: 't', excerpt: 'e', source: 'src', publishedAt: '2026-01-01T00:00:00Z', readingMinutes: 3, bodyMarkdown: 'b' }
  const legacy = mapArticle({ ...base, category: 'forex' })
  assert.deepEqual(legacy, { ...base, publishedAt: '2026-01-01T00:00:00.000Z', category: 'forex', section: 'news' })
  assert.ok(validateContract('article', legacy).valid)
  const { section: _s, ...oldCms } = legacy
  assert.ok(validateContract('article', oldCms).valid)
  const full = mapArticle({
    ...base,
    articleCategory: { slug: 'economy', title: 'Экономика' },
    category: 'forex',
    cover: { url: 'https://cdn.example/c.jpg', width: 10, height: 5, alt: '', mimeType: 'image/jpeg' },
    body: lexical(paragraph(text('Текст'))),
  })
  assert.equal(full.category, 'economy')
  assert.equal(full.categoryTitle, 'Экономика')
  assert.equal(full.cover?.url, 'https://cdn.example/c.jpg')
  assert.ok(full.body)
  assert.ok(validateContract('article', full).valid, JSON.stringify(validateContract('article', full)))
  const education = mapArticle({ ...base, section: 'education', level: 'intermediate', videoUrl: 'vimeo.com/76979871', category: 'x' })
  assert.equal(education.category, '')
  assert.equal(education.level, 'intermediate')
  assert.deepEqual((education as Doc).video, { provider: 'vimeo', videoId: '76979871', url: 'https://vimeo.com/76979871' })
  assert.ok(validateContract('article', education).valid)
  assert.deepEqual(Object.keys(mapAcademyArticle({ ...base, level: 'beginner', readingMinutes: null })).sort(), ['bodyMarkdown', 'excerpt', 'level', 'readingMinutes', 'slug', 'title'])
  assert.ok(!validateContract('article', { ...legacy, section: 'blog' }).valid)
  const pro = mapArticle({ ...base, section: 'education', level: 'advanced', category: 'x' })
  assert.equal(pro.level, 'advanced', 'третий уровень «Профессиональный» доходит до контракта')
  assert.ok(validateContract('article', pro).valid)
  assert.equal(mapAcademyArticle({ ...base, level: 'advanced' }).level, 'advanced')
  assert.equal(mapArticle({ ...base, section: 'education', level: 'expert', category: 'x' }).level, 'beginner', 'неизвестный уровень читается как начальный')
  const levelField = Articles.fields.find((f) => 'name' in f && f.name === 'level') as { options: { value: string }[] }
  assert.deepEqual(levelField.options.map((o) => o.value), ['beginner', 'intermediate', 'advanced'])
})

await check('расписание: без черновиков — только опубликованные с наступившей датой', () => {
  const now = new Date('2026-11-22T10:00:00Z')
  assert.deepEqual(articleWhere(7, { draft: false, section: 'news', now }), {
    and: [
      { site: { equals: 7 } },
      { section: { equals: 'news' } },
      { _status: { equals: 'published' } },
      { publishedAt: { less_than_equal: '2026-11-22T10:00:00.000Z' } },
    ],
  })
  assert.deepEqual(articleWhere(7, { draft: true, slug: 'x' }), { and: [{ site: { equals: 7 } }, { slug: { equals: 'x' } }] })
})

await check('предпросмотр: путь по разделу, префикс языка, без секрета кнопки нет', () => {
  assert.equal(articlePreviewPath({ slug: 'gold', section: 'news' }), '/analytics/news/gold')
  assert.equal(articlePreviewPath({ slug: 'what-is-forex', section: 'education' }), '/education/articles/what-is-forex')
  assert.equal(localizedSitePath('/analytics/news/gold', 'ru'), '/analytics/news/gold')
  assert.equal(localizedSitePath('/analytics/news/gold', 'de'), '/de/analytics/news/gold')
  assert.equal(localizedSitePath('/', 'en'), '/en')
  const preview = Articles.admin!.preview as (doc: Doc, args: { locale: string }) => string | null
  const saved = process.env.SITE_PREVIEW_SECRET
  process.env.SITE_PREVIEW_SECRET = 'test-secret'
  process.env.SITE_URL = 'http://site.test/'
  const url = new URL(preview({ slug: 'what-is-forex', section: 'education' }, { locale: 'fr' })!)
  assert.equal(url.origin + url.pathname, 'http://site.test/api/preview')
  assert.equal(url.searchParams.get('secret'), 'test-secret')
  assert.equal(url.searchParams.get('path'), '/fr/education/articles/what-is-forex')
  delete process.env.SITE_PREVIEW_SECRET
  assert.equal(preview({ slug: 'x' }, { locale: 'ru' }), null)
  if (saved !== undefined) process.env.SITE_PREVIEW_SECRET = saved
})

const payload = await getPayload({ config })
const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: any[] }> } }).drizzle
const args = { db, payload, req: {} } as never

const empty = await db.execute(sql`SELECT to_regclass('public.sites') AS t`)
assert.equal(empty.rows[0]?.t ?? null, null, 'нужна пустая база: тест создаёт схему миграциями сам')

const NAMES = ['20261122_140507_articles_editor', '20261122_140600_article_categories', '20261122_140700_academy_articles']
const indexes = NAMES.map((name) => migrations.findIndex((m) => m.name === name))
assert.ok(indexes.every((i, n) => i > 0 && (n === 0 || i === indexes[n - 1]! + 1)), 'миграции статей идут подряд')
const ours = indexes.map((i) => migrations[i]!)
for (const migration of migrations.slice(0, indexes[0])) await migration.up(args)
// Колонку sites.logo_mode читает любой запрос Payload к сайтам — накатываем её сразу (миграция независимая).
const siteLogoMode = migrations.find((m) => m.name === '20261126_160000_site_logo_mode')!
await siteLogoMode.up(args)
// То же с реквизитами сайта (sites.requisites_*, sites_requisites_extra).
const siteRequisites = migrations.find((m) => m.name === '20261128_190000_site_requisites')!
await siteRequisites.up(args)

const LEGACY_MD_RU = 'Первый абзац про **ставку** ФРС.\n\nВторой абзац: доллар ослаб.'
await db.execute(sql`
  INSERT INTO "sites" ("slug", "name", "primary_color", "demo_start_balance_cents", "updated_at", "created_at")
  VALUES ('art-a', 'A', '#d4a437', 0, now(), now()), ('art-b', 'B', '#d4a437', 0, now(), now());
  INSERT INTO "articles" ("site_id", "slug", "category", "published_at", "reading_minutes", "_status", "updated_at", "created_at")
  SELECT s."id", v.slug, v.cat, v.at::timestamptz, v.rm, v.st::"enum_articles_status", now(), now()
  FROM "sites" s, (VALUES ('fed-rate', 'economy', '2026-07-23T08:30:00Z', 4, 'published'), ('gold', 'Forex', '2026-07-22T08:30:00Z', 3, 'published'),
                          ('draft-news', 'economy', '2026-07-21T08:30:00Z', 2, 'draft')) AS v(slug, cat, at, rm, st)
  WHERE s."slug" = 'art-a';
  INSERT INTO "articles" ("site_id", "slug", "category", "published_at", "reading_minutes", "_status", "updated_at", "created_at")
  SELECT "id", 'b-news', 'Commodities & Energy', '2026-07-20T08:30:00Z', 5, 'published', now(), now() FROM "sites" WHERE "slug" = 'art-b';
  INSERT INTO "articles_locales" ("title", "excerpt", "source", "body_markdown", "_locale", "_parent_id")
  SELECT 'Заголовок ' || a."slug", 'Анонс', 'Отдел', 'Первый абзац про **ставку** ФРС.' || chr(10) || chr(10) || 'Второй абзац: доллар ослаб.', 'ru'::"_locales", a."id" FROM "articles" a
  UNION ALL SELECT 'Title ' || a."slug", 'Excerpt', 'Desk', 'First paragraph.' || chr(10) || chr(10) || 'Second.', 'en'::"_locales", a."id" FROM "articles" a WHERE a."slug" <> 'b-news';
  INSERT INTO "_articles_v" ("parent_id", "version_site_id", "version_slug", "version_category", "version_published_at", "version_reading_minutes",
    "version__status", "latest", "version_updated_at", "version_created_at")
  SELECT "id", "site_id", "slug", "category", "published_at", "reading_minutes", "_status"::text::"enum__articles_v_version_status", true, now(), now() FROM "articles";
  INSERT INTO "_articles_v_locales" ("version_title", "version_excerpt", "version_source", "version_body_markdown", "_locale", "_parent_id")
  SELECT l."title", l."excerpt", l."source", l."body_markdown", l."_locale", v."id"
  FROM "_articles_v" v JOIN "articles_locales" l ON l."_parent_id" = v."parent_id";
  INSERT INTO "site_academy" ("site_id", "_status", "updated_at", "created_at")
  SELECT "id", 'published', now(), '2026-08-01T12:00:00Z' FROM "sites" WHERE "slug" = 'art-a';
  INSERT INTO "site_academy_articles" ("_order", "_parent_id", "_locale", "id", "slug", "title", "excerpt", "level", "reading_minutes", "body_markdown", "video_url")
  SELECT v.o, a."id", v.l::"_locales", v.l || '-' || v.slug, v.slug, v.title, 'Анонс ' || v.l, v.lvl::"enum_site_academy_articles_level", v.rm, v.md, v.video
  FROM "site_academy" a, (VALUES
    (1, 'ru', 'what-is-forex', 'Что такое Forex', 'beginner', 7, 'Forex — рынок.' || chr(10) || chr(10) || 'Пары: EURUSD.', 'https://youtu.be/dQw4w9WgXcQ'),
    (2, 'ru', 'risk', 'Риск', 'intermediate', 5, 'Про риск.', NULL),
    (1, 'en', 'what-is-forex', 'What is Forex', 'beginner', 7, 'Forex is a market.', 'https://vimeo.com/76979871'),
    (2, 'en', 'risk', 'Risk', 'intermediate', 5, 'About risk.', NULL),
    (1, 'de', 'what-is-forex', 'Was ist Forex', 'beginner', 8, 'Forex ist ein Markt.', NULL),
    (3, 'en', 'en-only', 'Only English', 'beginner', 2, 'Only here.', NULL)
  ) AS v(o, l, slug, title, lvl, rm, md, video);
  INSERT INTO "site_academy_webinars" ("_order", "_parent_id", "_locale", "id", "webinar_id", "title", "speaker", "speaker_role", "starts_at", "duration_minutes", "level", "description")
  SELECT 1, "id", 'ru'::"_locales", 'web-ru', 'web-1', 'Вебинар', 'Анна Б', 'Аналитик', '2026-07-01T10:00:00Z', 60, 'Новичок', 'Описание' FROM "site_academy";
`)

const LEGACY = sql`
  SELECT (SELECT json_agg(json_build_object('id', a.id, 'slug', a.slug, 'category', a.category, 'rm', a.reading_minutes, 'status', a._status, 'at', a.published_at) ORDER BY a.id) FROM articles a) AS articles,
         (SELECT json_agg(json_build_object('p', l._parent_id, 'l', l._locale, 'title', l.title, 'md', l.body_markdown, 'source', l.source) ORDER BY l._parent_id, l._locale) FROM articles_locales l) AS locales,
         (SELECT json_agg(json_build_object('p', l._parent_id, 'l', l._locale, 'md', l.version_body_markdown) ORDER BY l._parent_id, l._locale) FROM _articles_v_locales l) AS version_locales,
         (SELECT count(*)::int FROM _articles_v) AS versions,
         (SELECT json_agg(to_jsonb(t) ORDER BY t._locale, t._order) FROM site_academy_articles t) AS academy_articles,
         (SELECT json_agg(to_jsonb(t) ORDER BY t._locale, t._order) FROM site_academy_webinars t) AS academy_webinars`
const legacyBefore = (await db.execute(LEGACY)).rows[0]

async function runOurs() {
  for (const migration of ours) await migration.up(args)
}
const STATE = sql`
  SELECT (SELECT json_agg(json_build_object('slug', a.slug, 'section', a.section, 'level', a.level, 'cat', c.slug, 'status', a._status, 'at', a.published_at) ORDER BY a.site_id, a.slug)
            FROM articles a LEFT JOIN article_categories c ON c.id = a.article_category_id) AS articles,
         (SELECT json_agg(json_build_object('slug', a.slug, 'l', l._locale, 'title', l.title, 'md', l.body_markdown, 'body', l.body, 'rm', l.reading_minutes, 'video', l.video_url) ORDER BY a.slug, l._locale)
            FROM articles a JOIN articles_locales l ON l._parent_id = a.id) AS locales,
         (SELECT json_agg(json_build_object('slug', v.version_slug, 'section', v.version_section, 'cat', v.version_article_category_id IS NOT NULL, 'latest', v.latest, 'status', v.version__status) ORDER BY v.version_slug)
            FROM _articles_v v) AS versions,
         (SELECT json_agg(json_build_object('l', l._locale, 'body', l.version_body IS NOT NULL, 'rm', l.version_reading_minutes) ORDER BY v.version_slug, l._locale)
            FROM _articles_v v JOIN _articles_v_locales l ON l._parent_id = v.id) AS version_locales,
         (SELECT json_agg(json_build_object('site', c.site_id, 'slug', c.slug, 'titles', (SELECT json_object_agg(t._locale, t.title) FROM article_categories_locales t WHERE t._parent_id = c.id)) ORDER BY c.site_id, c.slug)
            FROM article_categories c) AS categories`

await runOurs()
const migrated = (await db.execute(STATE)).rows[0]

await check('миграция Markdown → Lexical: у каждой статьи-локали и версии есть Lexical, Markdown не тронут', async () => {
  const fed = migrated.locales.find((l: Doc) => l.slug === 'fed-rate' && l.l === 'ru')
  assert.equal(fed.md, LEGACY_MD_RU)
  assert.equal(lexicalToPlainText(fed.body), 'Первый абзац про ставку ФРС.\nВторой абзац: доллар ослаб.')
  assert.equal(fed.body.root.children.length, 2)
  assert.equal(fed.body.root.children[0].children.find((c: Doc) => c.text === 'ставку')?.format, 1)
  assert.ok(migrated.locales.every((l: Doc) => l.body?.root), 'везде есть body')
  assert.ok(migrated.version_locales.every((l: Doc) => l.body), 'в версиях тоже')
  assert.equal(fed.rm, 4)
  const after = (await db.execute(LEGACY)).rows[0]
  const legacyIds = new Set(legacyBefore.articles.map((a: Doc) => a.id))
  assert.deepEqual(after.locales.filter((l: Doc) => legacyIds.has(l.p)), legacyBefore.locales)
  assert.deepEqual(after.articles.filter((a: Doc) => legacyIds.has(a.id)), legacyBefore.articles)
  assert.deepEqual(after.academy_articles, legacyBefore.academy_articles)
  assert.deepEqual(after.academy_webinars, legacyBefore.academy_webinars)
})

await check('миграция категорий: свободный текст → коллекция на сайт, названия на 5 языках, ссылки в статьях и версиях', () => {
  assert.deepEqual(
    migrated.categories.map((c: Doc) => [c.slug, c.titles]),
    [
      ['economy', { ru: 'Экономика', en: 'Economy', de: 'Wirtschaft', fr: 'Économie', es: 'Economía' }],
      ['forex', { ru: 'Forex', en: 'Forex', de: 'Forex', fr: 'Forex', es: 'Forex' }],
      ['commodities-energy', { ru: 'Commodities & Energy', en: 'Commodities & Energy' }],
    ],
  )
  const news = migrated.articles.filter((a: Doc) => a.section === 'news')
  assert.deepEqual(news.map((a: Doc) => [a.slug, a.cat]), [['draft-news', 'economy'], ['fed-rate', 'economy'], ['gold', 'forex'], ['b-news', 'commodities-energy']])
  assert.ok(migrated.versions.filter((v: Doc) => v.section === 'news').every((v: Doc) => v.cat))
})

await check('миграция обучения: статьи из глобального контента → коллекция, все языки, видео и уровень, порядок сохранён', () => {
  const education = migrated.articles.filter((a: Doc) => a.section === 'education')
  assert.deepEqual(education.map((a: Doc) => [a.slug, a.level, a.status]), [
    ['en-only', 'beginner', 'published'],
    ['risk', 'intermediate', 'published'],
    ['what-is-forex', 'beginner', 'published'],
  ])
  const at = Object.fromEntries(education.map((a: Doc) => [a.slug, new Date(a.at).getTime()]))
  assert.ok(at['what-is-forex']! > at.risk! && at.risk! > at['en-only']!)
  const forex = migrated.locales.filter((l: Doc) => l.slug === 'what-is-forex')
  assert.deepEqual(forex.map((l: Doc) => [l.l, l.title, l.video, l.rm]), [
    ['ru', 'Что такое Forex', 'https://youtu.be/dQw4w9WgXcQ', 7],
    ['en', 'What is Forex', 'https://vimeo.com/76979871', 7],
    ['de', 'Was ist Forex', null, 8],
  ])
  assert.equal(lexicalToPlainText(forex[0].body), 'Forex — рынок.\nПары: EURUSD.')
  assert.equal(forex[0].md, 'Forex — рынок.\n\nПары: EURUSD.')
  const versions = migrated.versions.filter((v: Doc) => v.section === 'education')
  assert.equal(versions.length, 3)
  assert.ok(versions.every((v: Doc) => v.latest && v.status === 'published'))
})

async function fetchJson(path: string, query: string) {
  const res = await GET(new Request(`http://cms.test/v1/cms/${path}?${query}`, { headers: { 'X-API-Key': API_KEY } }), {
    params: Promise.resolve({ path: path.split('/') }),
  })
  return { status: res.status, body: (await res.json()) as Doc }
}

await check('после миграции: контракт отдаёт обучение из коллекции (articles?section=education и academy), черновик новости скрыт', async () => {
  const ru = await fetchJson('articles', 'site=art-a&locale=ru&section=education')
  assert.equal(ru.status, 200, JSON.stringify(ru.body))
  assert.equal(ru.body.section, 'education')
  assert.deepEqual(ru.body.items.map((i: Doc) => [i.slug, i.level, i.video?.provider ?? null]), [
    ['what-is-forex', 'beginner', 'youtube'],
    ['risk', 'intermediate', null],
    ['en-only', 'beginner', null],
  ])
  assert.ok(validateContract('articles', ru.body).valid)
  const de = await fetchJson('articles', 'site=art-a&locale=de&section=education')
  assert.equal(de.body.items[0].title, 'Was ist Forex')
  assert.equal(de.body.items[1].title, 'Risk')
  const academy = await fetchJson('academy', 'site=art-a&locale=en')
  assert.equal(academy.status, 200, JSON.stringify(academy.body))
  assert.deepEqual(academy.body.articles.map((a: Doc) => [a.slug, a.title, a.readingMinutes, a.video?.videoId ?? null]), [
    ['what-is-forex', 'What is Forex', 7, '76979871'],
    ['risk', 'Risk', 5, null],
    ['en-only', 'Only English', 2, null],
  ])
  assert.ok(validateContract('academy', academy.body).valid)
  const news = await fetchJson('articles', 'site=art-a&locale=ru')
  assert.deepEqual(news.body.items.map((i: Doc) => [i.slug, i.category, i.categoryTitle]), [['fed-rate', 'economy', 'Экономика'], ['gold', 'forex', 'Forex']])
  const newsDraft = await fetchJson('articles', 'site=art-a&locale=ru&draft=true')
  assert.equal(newsDraft.body.items.length, 3)
})

await check('миграции статей: повторный прогон ничего не меняет', async () => {
  await runOurs()
  assert.deepEqual((await db.execute(STATE)).rows[0], migrated)
})

await check('миграции статей: откат возвращает прежнее состояние, исходные данные целы; повторное применение даёт тот же результат', async () => {
  for (const migration of [...ours].reverse()) await migration.down(args)
  const columns = await db.execute(sql`
    SELECT count(*)::int AS n FROM information_schema.columns
    WHERE (table_name = 'articles' AND column_name IN ('section', 'level', 'cover_id', 'article_category_id'))
       OR (table_name = 'articles_locales' AND column_name IN ('body', 'video_url', 'reading_minutes'))`)
  assert.equal(columns.rows[0].n, 0)
  assert.equal((await db.execute(sql`SELECT to_regclass('public.article_categories') AS t`)).rows[0].t, null)
  assert.deepEqual((await db.execute(LEGACY)).rows[0], legacyBefore)
  await runOurs()
  const again = (await db.execute(STATE)).rows[0]
  const strip = (s: Doc) => ({ ...s, articles: s.articles.map(({ at: _a, ...r }: Doc) => r) })
  assert.deepEqual(strip(again), strip(migrated))
})

for (const migration of migrations.slice(indexes[2]! + 1)) if (migration !== siteLogoMode && migration !== siteRequisites) await migration.up(args)

const site = (await payload.find({ collection: 'sites', where: { slug: { equals: 'art-a' } }, depth: 0 })).docs[0] as Doc
const economy = (await payload.find({ collection: 'article-categories', where: { slug: { equals: 'economy' } }, depth: 0 })).docs[0] as Doc
const newsBase = { site: site.id, section: 'news', articleCategory: economy.id, source: 'Отдел', excerpt: 'Анонс' }

async function create(data: Doc, options: Doc = {}) {
  return (await payload.create({ collection: 'articles', locale: 'ru', data: data as never, ...options })) as Doc
}

async function expectInvalid(action: () => Promise<unknown>, fragment: string) {
  try {
    await action()
  } catch (error) {
    const details = (error as { data?: { errors?: { message?: string }[] } }).data?.errors ?? []
    const message = [(error as Error).message, ...details.map((d) => d.message ?? '')].join(' | ')
    assert.ok(message.includes(fragment), `в ошибке нет «${fragment}»: ${message}`)
    return
  }
  assert.fail('ожидался отказ')
}

await check('создание: slug из заголовка (транслит), уникальность в пределах сайта, ручной slug нормализуется, занятый — ошибка', async () => {
  const first = await create({ ...newsBase, title: 'Золото обновило максимум', body: lexical(paragraph(text(words(450)))), _status: 'published' })
  assert.equal(first.slug, 'zoloto-obnovilo-maksimum')
  assert.equal(first.readingMinutes, 3)
  assert.match(first.bodyMarkdown, /^слово0 слово1/)
  const second = await create({ ...newsBase, title: 'Золото обновило максимум!', body: lexical(paragraph(text('Коротко'))), _status: 'published' })
  assert.equal(second.slug, 'zoloto-obnovilo-maksimum-2')
  assert.equal(second.readingMinutes, 1)
  const manual = await create({ ...newsBase, title: 'Другое', slug: 'Мой Слаг', body: lexical(paragraph(text('x'))), _status: 'published' })
  assert.equal(manual.slug, 'moy-slag')
  await expectInvalid(() => create({ ...newsBase, title: 'Ещё', slug: 'gold', body: lexical(paragraph(text('x'))) }), SLUG_TAKEN_ERROR)
  const siteB = (await payload.find({ collection: 'sites', where: { slug: { equals: 'art-b' } }, depth: 0 })).docs[0] as Doc
  const otherSite = await create({ site: siteB.id, section: 'education', level: 'beginner', excerpt: 'e', title: 'Золото обновило максимум', body: lexical(paragraph(text('x'))) })
  assert.equal(otherSite.slug, 'zoloto-obnovilo-maksimum')
})

await check('черновик: slug следует за заголовком до первой публикации, потом не меняется', async () => {
  const draft = await create({ ...newsBase, title: 'Н', body: lexical(paragraph(text('x'))), _status: 'draft' }, { draft: true })
  assert.equal(draft.slug, 'n')
  const grown = (await payload.update({ collection: 'articles', id: draft.id, locale: 'ru', draft: true, data: { title: 'Нефть дешевеет', _status: 'draft' } as never })) as Doc
  assert.equal(grown.slug, 'neft-desheveet')
  const published = (await payload.update({ collection: 'articles', id: draft.id, locale: 'ru', data: { _status: 'published' } as never })) as Doc
  assert.equal(published.slug, 'neft-desheveet')
  const renamed = (await payload.update({ collection: 'articles', id: draft.id, locale: 'ru', draft: true, data: { title: 'Нефть дорожает', _status: 'draft' } as never })) as Doc
  assert.equal(renamed.slug, 'neft-desheveet')
})

await check('Markdown ↔ Lexical: запись только Markdown даёт Lexical, правка Lexical обновляет Markdown; другие языки не трогаются', async () => {
  const doc = await create({ ...newsBase, title: 'Markdown', bodyMarkdown: '## Итоги\n\nТекст **жирный**.', _status: 'published' })
  assert.equal(doc.body.root.children[0].type, 'heading')
  const en = (await payload.update({ collection: 'articles', id: doc.id, locale: 'en', data: { title: 'EN', excerpt: 'e', source: 's', body: lexical(paragraph(text('Bold', 1))), _status: 'published' } as never })) as Doc
  assert.equal(en.bodyMarkdown, '**Bold**')
  const ru = (await payload.findByID({ collection: 'articles', id: doc.id, locale: 'ru', depth: 0 })) as Doc
  assert.equal(ru.bodyMarkdown, '## Итоги\n\nТекст **жирный**.')
})

await check('проверки раздела: новости требуют категорию и источник, обучение — уровень; плохое видео отклоняется', async () => {
  await expectInvalid(() => create({ site: site.id, section: 'news', title: 'Без категории', excerpt: 'e', source: 's', body: lexical(paragraph(text('x'))), _status: 'published' }), 'Выберите категорию')
  await expectInvalid(() => create({ site: site.id, section: 'news', articleCategory: economy.id, title: 'Без источника', excerpt: 'e', body: lexical(paragraph(text('x'))), _status: 'published' }), 'Укажите источник')
  await expectInvalid(() => create({ site: site.id, section: 'news', articleCategory: economy.id, source: 's', title: 'Пусто', excerpt: 'e', _status: 'published' }), 'Напишите текст статьи')
  await expectInvalid(() => create({ site: site.id, section: 'education', level: 'beginner', title: 'Видео', excerpt: 'e', videoUrl: 'https://example.com/v', body: lexical(paragraph(text('x'))), _status: 'published' }), 'YouTube или Vimeo')
  const ok = await create({ site: site.id, section: 'education', level: 'intermediate', title: 'Обучение без категории', excerpt: 'e', body: lexical(paragraph(text('x'))), _status: 'published' })
  assert.equal(ok.slug, 'obuchenie-bez-kategorii')
})

await check('расписание и черновики: будущая дата и черновик не видны, в предпросмотре (draft=true) видны', async () => {
  const future = new Date(Date.now() + 86_400_000).toISOString()
  await create({ ...newsBase, title: 'Завтрашняя новость', publishedAt: future, body: lexical(paragraph(text('x'))), _status: 'published' })
  await create({ ...newsBase, title: 'Черновик новости', body: lexical(paragraph(text('x'))), _status: 'draft' }, { draft: true })
  const list = await fetchJson('articles', 'site=art-a&locale=ru&pageSize=100')
  const slugs = list.body.items.map((i: Doc) => i.slug)
  assert.ok(!slugs.includes('zavtrashnyaya-novost') && !slugs.includes('chernovik-novosti'), slugs.join(','))
  assert.ok(slugs.includes('zoloto-obnovilo-maksimum'))
  assert.equal((await fetchJson('articles/zavtrashnyaya-novost', 'site=art-a&locale=ru')).status, 404)
  assert.equal((await fetchJson('articles/chernovik-novosti', 'site=art-a&locale=ru')).status, 404)
  const preview = await fetchJson('articles', 'site=art-a&locale=ru&pageSize=100&draft=true')
  const previewSlugs = preview.body.items.map((i: Doc) => i.slug)
  assert.ok(previewSlugs.includes('zavtrashnyaya-novost') && previewSlugs.includes('chernovik-novosti'))
  assert.equal((await fetchJson('articles/chernovik-novosti', 'site=art-a&locale=ru&draft=true')).status, 200)
  assert.equal(list.body.pageSize, 100)
  assert.equal((await fetchJson('articles', 'site=art-a&locale=ru&pageSize=500')).body.pageSize, 100)
})

await check('обложка, картинка и видео в тексте доходят до контракта', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const media = (await payload.create({ collection: 'media', data: { alt: 'Обложка' } as never, file: { data: png, mimetype: 'image/png', name: 'cover-test.png', size: png.length } })) as Doc
  await create({
    ...newsBase,
    title: 'С картинками',
    cover: media.id,
    body: lexical(
      paragraph(text('До')),
      { type: 'upload', version: 3, format: '', relationTo: 'media', value: media.id, fields: null },
      { type: 'block', version: 2, format: '', fields: { id: '65f0c0ffee0000000000abcd', blockName: '', blockType: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } },
    ),
    _status: 'published',
  })
  const { status, body } = await fetchJson('articles/s-kartinkami', 'site=art-a&locale=ru')
  assert.equal(status, 200, JSON.stringify(body))
  assert.equal(body.cover.alt, 'Обложка')
  const types = body.body.root.children.map((n: Doc) => n.type)
  assert.deepEqual(types, ['paragraph', 'upload', 'block'])
  assert.equal(body.body.root.children[1].media.width, 1)
  assert.equal(body.body.root.children[2].fields.video.videoId, 'dQw4w9WgXcQ')
  assert.ok(validateContract('article', body).valid)
})

console.info(failures ? `\n${failures} FAIL` : '\nALL OK')
process.exit(failures ? 1 : 0)
