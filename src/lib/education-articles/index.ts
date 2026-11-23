import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { MigrationDb } from '../article-migrations'
import { markdownToLexical } from '../article-editor'
import { lexicalToPlainText, readingMinutesFor } from '../article-text'
import { LEVEL_1 } from './level-1'
import { LEVEL_2 } from './level-2'
import { LEVEL_3 } from './level-3'
import { PLATFORM } from './platform'
import type { EducationSeed } from './types'

export type { EducationSeed } from './types'

export const EDUCATION_SITE = 'apex-ru'

// Порядок курса. Сайт сортирует обучение по дате публикации (новые выше), поэтому
// первая статья курса получает самую позднюю дату, следующие — на минуту раньше.
export const EDUCATION_ARTICLES: readonly EducationSeed[] = [...PLATFORM, ...LEVEL_1, ...LEVEL_2, ...LEVEL_3]
const COURSE_START = Date.parse('2026-11-23T09:00:00Z')

const UTM = /([?&])utm_[a-z]+=[^&)\s]*&?/gi

export function cleanUrls(markdown: string): string {
  return markdown.replace(/\]\((https?:\/\/[^)\s]+)\)/g, (_, url: string) => {
    const clean = url.replace(UTM, (_m, sep: string) => sep).replace(/[?&]$/, '')
    return `](${clean})`
  })
}

type Node = { type?: string; fields?: Record<string, unknown>; children?: Node[] }

function externalLinksInNewTab(node: Node): void {
  if (node.type === 'link' && node.fields && /^https?:\/\//.test(String(node.fields.url ?? ''))) {
    node.fields.newTab = true
  }
  node.children?.forEach(externalLinksInNewTab)
}

export function educationBody(payload: Payload, markdown: string): { body: Record<string, unknown>; minutes: number } {
  const body = markdownToLexical(payload, markdown) as { root: Node }
  externalLinksInNewTab(body.root)
  return { body: body as unknown as Record<string, unknown>, minutes: readingMinutesFor(lexicalToPlainText(body)) }
}

const log = (payload: Payload | undefined, message: string) =>
  payload?.logger ? payload.logger.info(message) : console.info(message)

async function siteIdOf(db: MigrationDb, slug: string): Promise<number | null> {
  const found = await db.execute(sql`SELECT "id" FROM "sites" WHERE "slug" = ${slug} ORDER BY "id" LIMIT 1`)
  return found.rows[0] ? Number(found.rows[0].id) : null
}

export async function insertEducationArticles(db: MigrationDb, payload: Payload, siteSlug = EDUCATION_SITE): Promise<number> {
  const site = await siteIdOf(db, siteSlug)
  if (site === null) {
    log(payload, `[articles] сайта «${siteSlug}» нет — обучающие статьи курса не добавлены`)
    return 0
  }
  let created = 0
  for (const [index, article] of EDUCATION_ARTICLES.entries()) {
    const exists = await db.execute(sql`
      SELECT "id" FROM "articles" WHERE "site_id" = ${site} AND "slug" = ${article.slug} AND "section" = 'education' LIMIT 1`)
    if (exists.rows.length) continue
    const publishedAt = new Date(COURSE_START - index * 60_000).toISOString()
    const inserted = await db.execute(sql`
      INSERT INTO "articles" ("site_id", "slug", "section", "level", "published_at", "updated_at", "created_at", "_status")
      VALUES (${site}, ${article.slug}, 'education', ${article.level}, ${publishedAt}, now(), now(), 'published')
      RETURNING "id"`)
    const id = inserted.rows[0]!.id as number
    const version = await db.execute(sql`
      INSERT INTO "_articles_v" ("parent_id", "version_site_id", "version_slug", "version_section", "version_level",
        "version_published_at", "version_updated_at", "version_created_at", "version__status", "latest", "autosave", "created_at", "updated_at")
      VALUES (${id}, ${site}, ${article.slug}, 'education', ${article.level}, ${publishedAt}, now(), now(),
        'published', true, false, now(), now())
      RETURNING "id"`)
    const versionId = version.rows[0]!.id as number
    for (const [locale, text] of Object.entries(article.locales)) {
      const markdown = cleanUrls(text.markdown)
      const { body, minutes } = educationBody(payload, markdown)
      const json = JSON.stringify(body)
      await db.execute(sql`
        INSERT INTO "articles_locales" ("title", "excerpt", "body_markdown", "body", "reading_minutes", "_locale", "_parent_id")
        VALUES (${text.title}, ${text.excerpt}, ${markdown}, ${json}::jsonb, ${minutes}, ${locale}::"_locales", ${id})`)
      await db.execute(sql`
        INSERT INTO "_articles_v_locales" ("version_title", "version_excerpt", "version_body_markdown", "version_body",
          "version_reading_minutes", "_locale", "_parent_id")
        VALUES (${text.title}, ${text.excerpt}, ${markdown}, ${json}::jsonb, ${minutes}, ${locale}::"_locales", ${versionId})`)
    }
    created++
  }
  log(payload, `[articles] обучающий курс: добавлено статей ${created} из ${EDUCATION_ARTICLES.length}`)
  return created
}

export async function revertEducationArticles(db: MigrationDb, siteSlug = EDUCATION_SITE): Promise<void> {
  const site = await siteIdOf(db, siteSlug)
  if (site === null) return
  for (const article of EDUCATION_ARTICLES) {
    await db.execute(sql`
      DELETE FROM "_articles_v" WHERE "parent_id" IN (
        SELECT "id" FROM "articles" WHERE "site_id" = ${site} AND "slug" = ${article.slug} AND "section" = 'education')`)
    await db.execute(sql`
      DELETE FROM "articles" WHERE "site_id" = ${site} AND "slug" = ${article.slug} AND "section" = 'education'`)
  }
}
