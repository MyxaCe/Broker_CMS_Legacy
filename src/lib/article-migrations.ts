import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { categoryTitles } from './article-categories'
import { markdownToLexical } from './article-editor'
import { slugify } from './article-slug'
import { LANGUAGES } from './languages'

type Row = Record<string, any>
export interface MigrationDb {
  execute: (query: unknown) => Promise<{ rows: Row[] }>
}

const log = (payload: Payload | undefined, message: string) =>
  payload?.logger ? payload.logger.info(message) : console.info(message)

export async function backfillLexicalBodies(db: MigrationDb, payload: Payload): Promise<number> {
  let converted = 0
  const main = await db.execute(sql`
    SELECT "id", "body_markdown" AS md FROM "articles_locales"
    WHERE "body" IS NULL AND coalesce(btrim("body_markdown"), '') <> ''`)
  for (const row of main.rows) {
    const body = JSON.stringify(markdownToLexical(payload, String(row.md)))
    await db.execute(sql`UPDATE "articles_locales" SET "body" = ${body}::jsonb WHERE "id" = ${row.id}`)
    converted++
  }
  const versions = await db.execute(sql`
    SELECT "id", "version_body_markdown" AS md FROM "_articles_v_locales"
    WHERE "version_body" IS NULL AND coalesce(btrim("version_body_markdown"), '') <> ''`)
  for (const row of versions.rows) {
    const body = JSON.stringify(markdownToLexical(payload, String(row.md)))
    await db.execute(sql`UPDATE "_articles_v_locales" SET "version_body" = ${body}::jsonb WHERE "id" = ${row.id}`)
  }
  log(payload, `[articles] Markdown → Lexical: статей-локалей ${converted}, версий ${versions.rows.length}`)
  return converted
}

async function legacyCategoryPairs(db: MigrationDb) {
  const found = await db.execute(sql`
    SELECT DISTINCT "site_id" AS site, "category" AS raw FROM "articles"
    WHERE "site_id" IS NOT NULL AND coalesce(btrim("category"), '') <> ''
    UNION
    SELECT DISTINCT "version_site_id", "version_category" FROM "_articles_v"
    WHERE "version_site_id" IS NOT NULL AND coalesce(btrim("version_category"), '') <> ''
    ORDER BY 1, 2`)
  return found.rows.map((r) => ({ site: Number(r.site), raw: String(r.raw), slug: slugify(r.raw) || 'category' }))
}

export async function migrateLegacyCategories(db: MigrationDb, payload?: Payload): Promise<number> {
  let created = 0
  for (const { site, raw, slug } of await legacyCategoryPairs(db)) {
    const existing = await db.execute(sql`
      SELECT "id" FROM "article_categories" WHERE "site_id" = ${site} AND "slug" = ${slug} ORDER BY "id" LIMIT 1`)
    let id = existing.rows[0]?.id as number | undefined
    if (id === undefined) {
      const inserted = await db.execute(sql`
        INSERT INTO "article_categories" ("site_id", "slug", "updated_at", "created_at")
        VALUES (${site}, ${slug}, now(), now()) RETURNING "id"`)
      id = inserted.rows[0]!.id as number
      const titles = categoryTitles(slug, raw)
      for (const locale of LANGUAGES) {
        const title = titles[locale]
        if (!title) continue
        await db.execute(sql`
          INSERT INTO "article_categories_locales" ("title", "_locale", "_parent_id")
          VALUES (${title}, ${locale}::"_locales", ${id})`)
      }
      created++
    }
    await db.execute(sql`
      UPDATE "articles" SET "article_category_id" = ${id}
      WHERE "site_id" = ${site} AND "category" = ${raw} AND "article_category_id" IS NULL`)
    await db.execute(sql`
      UPDATE "_articles_v" SET "version_article_category_id" = ${id}
      WHERE "version_site_id" = ${site} AND "version_category" = ${raw} AND "version_article_category_id" IS NULL`)
  }
  log(payload, `[articles] категории из текстовых значений: создано ${created}`)
  return created
}

export async function revertLegacyCategories(db: MigrationDb): Promise<void> {
  const touched = new Map<number, number>()
  for (const { site, raw, slug } of await legacyCategoryPairs(db)) {
    const found = await db.execute(sql`SELECT "id" FROM "article_categories" WHERE "site_id" = ${site} AND "slug" = ${slug}`)
    for (const row of found.rows) {
      const id = Number(row.id)
      touched.set(id, site)
      await db.execute(sql`
        UPDATE "articles" SET "article_category_id" = NULL
        WHERE "site_id" = ${site} AND "category" = ${raw} AND "article_category_id" = ${id}`)
      await db.execute(sql`
        UPDATE "_articles_v" SET "version_article_category_id" = NULL
        WHERE "version_site_id" = ${site} AND "version_category" = ${raw} AND "version_article_category_id" = ${id}`)
    }
  }
  for (const id of touched.keys()) {
    await db.execute(sql`
      DELETE FROM "article_categories" c WHERE c."id" = ${id}
        AND NOT EXISTS (SELECT 1 FROM "articles" a WHERE a."article_category_id" = c."id")
        AND NOT EXISTS (SELECT 1 FROM "_articles_v" v WHERE v."version_article_category_id" = c."id")`)
  }
}

const LOCALE_PRIORITY: readonly string[] = LANGUAGES

interface LegacyAcademyArticle {
  site: number
  slug: string
  status: string
  base: Date
  rows: Row[]
}

async function legacyAcademyArticles(db: MigrationDb): Promise<LegacyAcademyArticle[]> {
  const found = await db.execute(sql`
    SELECT a."site_id" AS site, a."_status"::text AS status, a."created_at" AS base,
           r."_order" AS ord, r."_locale"::text AS locale, r."slug", r."title", r."excerpt", r."level"::text AS level,
           r."reading_minutes" AS minutes, r."body_markdown" AS md, r."video_url" AS video
    FROM "site_academy" a JOIN "site_academy_articles" r ON r."_parent_id" = a."id"
    WHERE a."site_id" IS NOT NULL AND coalesce(btrim(r."slug"), '') <> ''
    ORDER BY a."site_id", r."_order"`)
  const groups = new Map<string, LegacyAcademyArticle>()
  for (const row of found.rows) {
    const key = `${row.site}\u0000${row.slug}`
    const group = groups.get(key) ?? {
      site: Number(row.site),
      slug: String(row.slug),
      status: row.status === 'published' ? 'published' : 'draft',
      base: new Date(row.base),
      rows: [],
    }
    group.rows.push(row)
    groups.set(key, group)
  }
  for (const group of groups.values()) {
    group.rows.sort((a, b) => LOCALE_PRIORITY.indexOf(a.locale) - LOCALE_PRIORITY.indexOf(b.locale))
  }
  return [...groups.values()]
}

export async function moveAcademyArticles(db: MigrationDb, payload: Payload): Promise<number> {
  let moved = 0
  for (const article of await legacyAcademyArticles(db)) {
    const exists = await db.execute(sql`
      SELECT "id" FROM "articles" WHERE "site_id" = ${article.site} AND "slug" = ${article.slug} AND "section" = 'education' LIMIT 1`)
    if (exists.rows.length) continue
    const clash = await db.execute(sql`
      SELECT "id" FROM "articles" WHERE "site_id" = ${article.site} AND "slug" = ${article.slug} LIMIT 1`)
    if (clash.rows.length) {
      log(payload, `[articles] внимание: на сайте #${article.site} slug «${article.slug}» уже есть у новости — статья обучения перенесена с тем же адресом`)
    }
    const primary = article.rows[0]!
    const level = primary.level === 'intermediate' ? 'intermediate' : 'beginner'
    const publishedAt = new Date(article.base.getTime() - Number(primary.ord ?? 0) * 60_000).toISOString()
    const inserted = await db.execute(sql`
      INSERT INTO "articles" ("site_id", "slug", "section", "level", "published_at", "updated_at", "created_at", "_status")
      VALUES (${article.site}, ${article.slug}, 'education', ${level}, ${publishedAt}, now(), now(), ${article.status}::"enum_articles_status")
      RETURNING "id"`)
    const id = inserted.rows[0]!.id as number
    const version = await db.execute(sql`
      INSERT INTO "_articles_v" ("parent_id", "version_site_id", "version_slug", "version_section", "version_level",
        "version_published_at", "version_updated_at", "version_created_at", "version__status", "latest", "autosave", "created_at", "updated_at")
      VALUES (${id}, ${article.site}, ${article.slug}, 'education', ${level}, ${publishedAt}, now(), now(),
        ${article.status}::"enum__articles_v_version_status", true, false, now(), now())
      RETURNING "id"`)
    const versionId = version.rows[0]!.id as number
    for (const row of article.rows) {
      const markdown = String(row.md ?? '')
      const body = markdown.trim() ? JSON.stringify(markdownToLexical(payload, markdown)) : null
      const minutes = row.minutes === null || row.minutes === undefined ? null : Number(row.minutes)
      await db.execute(sql`
        INSERT INTO "articles_locales" ("title", "excerpt", "body_markdown", "video_url", "body", "reading_minutes", "_locale", "_parent_id")
        VALUES (${row.title}, ${row.excerpt}, ${row.md}, ${row.video}, ${body}::jsonb, ${minutes}, ${row.locale}::"_locales", ${id})`)
      await db.execute(sql`
        INSERT INTO "_articles_v_locales" ("version_title", "version_excerpt", "version_body_markdown", "version_video_url",
          "version_body", "version_reading_minutes", "_locale", "_parent_id")
        VALUES (${row.title}, ${row.excerpt}, ${row.md}, ${row.video}, ${body}::jsonb, ${minutes}, ${row.locale}::"_locales", ${versionId})`)
    }
    const levels = new Set(article.rows.map((r) => r.level))
    if (levels.size > 1) {
      log(payload, `[articles] внимание: у «${article.slug}» разный уровень по языкам (${[...levels].join(', ')}) — взят ${level} (${primary.locale})`)
    }
    moved++
  }
  log(payload, `[articles] статьи обучения перенесены в коллекцию: ${moved}`)
  return moved
}

export async function revertAcademyArticles(db: MigrationDb): Promise<void> {
  for (const article of await legacyAcademyArticles(db)) {
    await db.execute(sql`
      DELETE FROM "_articles_v" WHERE "parent_id" IN (
        SELECT "id" FROM "articles" WHERE "site_id" = ${article.site} AND "slug" = ${article.slug} AND "section" = 'education')`)
    await db.execute(sql`
      DELETE FROM "articles" WHERE "site_id" = ${article.site} AND "slug" = ${article.slug} AND "section" = 'education'`)
  }
}
