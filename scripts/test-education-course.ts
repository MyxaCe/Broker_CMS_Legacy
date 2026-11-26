import 'dotenv/config'

import assert from 'node:assert/strict'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { GET } from '../src/app/v1/cms/[...path]/route'
import { lexicalToPlainText } from '../src/lib/article-text'
import { validateContract } from '../src/lib/contract/validate'
import { cleanUrls, EDUCATION_ARTICLES, insertEducationArticles } from '../src/lib/education-articles'
import { migrations } from '../src/migrations/index'

type Doc = Record<string, any>

const API_KEY = 'education-test-key'
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

function links(node: Doc, out: Doc[] = []): Doc[] {
  if (node?.type === 'link') out.push(node.fields ?? {})
  for (const child of node?.children ?? []) links(child, out)
  return out
}

const payload = await getPayload({ config })
const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: any[] }> } }).drizzle
const args = { db, payload, req: {} } as never

const empty = await db.execute(sql`SELECT to_regclass('public.sites') AS t`)
assert.equal(empty.rows[0]?.t ?? null, null, 'нужна пустая база: тест создаёт схему миграциями сам')

const index = migrations.findIndex((m) => m.name === '20261123_090000_education_course')
assert.ok(index > 0, 'миграция курса есть в списке')
const ours = migrations[index]!
for (const migration of migrations.slice(0, index)) await migration.up(args)
// Колонку sites.logo_mode читает любой запрос Payload к сайтам — накатываем её сразу (миграция независимая).
const siteLogoMode = migrations.find((m) => m.name === '20261126_160000_site_logo_mode')!
await siteLogoMode.up(args)

await db.execute(sql`
  INSERT INTO "sites" ("slug", "name", "primary_color", "demo_start_balance_cents", "updated_at", "created_at")
  VALUES ('apex-ru', 'Apex', '#d4a437', 0, now(), now()), ('other', 'Other', '#d4a437', 0, now(), now());
  INSERT INTO "articles" ("site_id", "slug", "section", "level", "published_at", "updated_at", "created_at", "_status")
  SELECT "id", 'what-is-forex', 'education', 'beginner', '2026-07-01T09:00:00Z', now(), now(), 'published' FROM "sites" WHERE "slug" = 'apex-ru';
  INSERT INTO "articles_locales" ("title", "excerpt", "body_markdown", "_locale", "_parent_id")
  SELECT 'Что такое Forex', 'Анонс', 'Текст.', 'ru'::"_locales", "id" FROM "articles" WHERE "slug" = 'what-is-forex';
`)

const STATE = sql`
  SELECT (SELECT json_agg(json_build_object('site', s.slug, 'slug', a.slug, 'level', a.level, 'status', a._status, 'at', a.published_at) ORDER BY s.slug, a.slug)
            FROM articles a JOIN sites s ON s.id = a.site_id) AS articles,
         (SELECT json_agg(json_build_object('slug', a.slug, 'l', l._locale, 'title', l.title, 'md', l.body_markdown, 'body', l.body, 'rm', l.reading_minutes) ORDER BY a.slug, l._locale)
            FROM articles a JOIN articles_locales l ON l._parent_id = a.id) AS locales,
         (SELECT count(*)::int FROM _articles_v) AS versions`

await ours.up(args)
const migrated = (await db.execute(STATE)).rows[0]
const ourSlugs = new Set(EDUCATION_ARTICLES.map((a) => a.slug))

await check('курс: все статьи добавлены на apex-ru, опубликованы, ru и en с текстом и временем чтения', () => {
  const added = migrated.articles.filter((a: Doc) => ourSlugs.has(a.slug))
  assert.equal(added.length, EDUCATION_ARTICLES.length)
  assert.equal(ourSlugs.size, EDUCATION_ARTICLES.length, 'slug не повторяются')
  assert.ok(added.every((a: Doc) => a.site === 'apex-ru' && a.status === 'published'))
  for (const article of EDUCATION_ARTICLES) {
    assert.equal(added.find((a: Doc) => a.slug === article.slug).level, article.level)
    for (const l of ['ru', 'en']) {
      const row = migrated.locales.find((r: Doc) => r.slug === article.slug && r.l === l)
      assert.ok(row, `${article.slug}:${l}`)
      assert.ok(lexicalToPlainText(row.body).length > 500, `${article.slug}:${l} текст`)
      assert.ok(row.rm >= 1)
    }
  }
  assert.equal(migrated.versions, EDUCATION_ARTICLES.length)
})

await check('курс: ссылки без utm, внешние открываются в новой вкладке, предупреждение о риске в каждой статье', () => {
  assert.equal(cleanUrls('[x](https://www.youtube.com/results?search_query=a+b&utm_source=chatgpt.com)'), '[x](https://www.youtube.com/results?search_query=a+b)')
  for (const row of migrated.locales.filter((r: Doc) => ourSlugs.has(r.slug))) {
    assert.ok(!/utm_/.test(row.md), row.slug)
    const found = links(row.body.root)
    assert.ok(found.every((f) => f.newTab === true && /^https:\/\/www\.youtube\.com\/results\?search_query=/.test(String(f.url))), row.slug)
    const text = lexicalToPlainText(row.body)
    assert.ok(row.l === 'ru' ? text.includes('не является инвестиционной рекомендацией') : text.includes('not investment advice'), `${row.slug}:${row.l} риск`)
  }
})

await check('курс: без обещаний дохода, без авторов-персон из списка, без адресов стенда', () => {
  const all = migrated.locales.filter((r: Doc) => ourSlugs.has(r.slug)).map((r: Doc) => `${r.title}\n${r.md}`).join('\n')
  for (const banned of [/гарантированн\S*\s+(доход|прибыл)/i, /guaranteed\s+(profit|income|return)/i, /Арапов/, /Герчик/, /Зв[её]здин/, /wholesalefy/i, /\b\d{1,3}(\.\d{1,3}){3}\b/]) {
    assert.ok(!banned.test(all), String(banned))
  }
})

await check('курс: порядок на сайте — первая статья курса сверху, старая статья обучения ниже, контракт статьи валиден', async () => {
  const list = await fetchJson('articles', 'site=apex-ru&locale=ru&section=education')
  assert.equal(list.status, 200, JSON.stringify(list.body))
  const slugs = list.body.items.map((i: Doc) => i.slug)
  assert.deepEqual(slugs, [...EDUCATION_ARTICLES.map((a) => a.slug), 'what-is-forex'])
  const one = await fetchJson(`articles/${EDUCATION_ARTICLES[0]!.slug}`, 'site=apex-ru&locale=en')
  assert.equal(one.status, 200, JSON.stringify(one.body))
  assert.ok(validateContract('article', one.body).valid, JSON.stringify(validateContract('article', one.body)))
  const de = await fetchJson(`articles/${EDUCATION_ARTICLES[0]!.slug}`, 'site=apex-ru&locale=de')
  assert.equal(de.body.title, EDUCATION_ARTICLES[0]!.locales.en.title, 'de берёт запасной en')
})

await check('курс: повторный прогон ничего не меняет и не трогает правки редактора', async () => {
  const slug = EDUCATION_ARTICLES[1]!.slug
  await db.execute(sql`
    UPDATE "articles_locales" SET "title" = 'Правка редактора'
    WHERE "_locale" = 'ru' AND "_parent_id" = (SELECT "id" FROM "articles" WHERE "slug" = ${slug})`)
  const edited = (await db.execute(STATE)).rows[0]
  await ours.up(args)
  assert.deepEqual((await db.execute(STATE)).rows[0], edited)
})

await check('курс: другого сайта нет — пропуск без ошибки; на сайте other статей курса нет', async () => {
  assert.equal(await insertEducationArticles(db as never, payload, 'no-such-site'), 0)
  assert.ok(!migrated.articles.some((a: Doc) => a.site === 'other'))
})

await check('курс: откат удаляет только статьи курса, повторное применение возвращает их', async () => {
  await ours.down(args)
  const after = (await db.execute(STATE)).rows[0]
  assert.deepEqual(after.articles.map((a: Doc) => a.slug), ['what-is-forex'])
  assert.equal(after.versions, 0)
  await ours.up(args)
  const again = (await db.execute(STATE)).rows[0]
  const strip = (s: Doc) => s.locales.map(({ title: _t, body, ...r }: Doc) => ({ ...r, text: lexicalToPlainText(body) }))
  assert.deepEqual(strip(again), strip(migrated))
})

for (const migration of migrations.slice(index + 1)) if (migration !== siteLogoMode) await migration.up(args)

console.info(failures ? `\n${failures} FAIL` : '\nALL OK')
process.exit(failures ? 1 : 0)
