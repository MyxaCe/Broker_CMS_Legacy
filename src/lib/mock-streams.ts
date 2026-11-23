import { sql } from '@payloadcms/db-postgres'

/**
 * Пробные эфиры из первых фикстур (videoId — заглушки, на YouTube таких видео нет).
 * Миграция 20261123_150000_remove_mock_streams удаляет их у всех сайтов (и из версий), откат возвращает удалённые строки.
 */
export const MOCK_STREAM_IDS = ['mock-live-review', 'mock-gold-breakdown'] as const

type Db = { execute: (query: unknown) => Promise<{ rows: Record<string, unknown>[] }> }

const ids = sql.join(
  MOCK_STREAM_IDS.map((id) => sql`${id}`),
  sql`, `,
)

const BACKUP = sql.raw('"_removed_mock_streams"')

/**
 * Удаляет пробные эфиры из опубликованных данных и из всех версий (иначе черновик в админке вернёт их при сохранении).
 * Удалённые строки сохраняются в служебную таблицу — откат возвращает ровно их, а не данные фикстур.
 */
export async function removeMockStreams(db: Db): Promise<number> {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS ${BACKUP} ("tbl" text NOT NULL, "row" jsonb NOT NULL)`)
  await db.execute(sql`
    INSERT INTO ${BACKUP} ("tbl", "row")
    SELECT 'site_streams_items', to_jsonb(i) FROM "site_streams_items" i WHERE i."video_id" IN (${ids})
    UNION ALL
    SELECT '_site_streams_v_version_items', to_jsonb(v) FROM "_site_streams_v_version_items" v WHERE v."video_id" IN (${ids})
  `)
  const live = await db.execute(sql`DELETE FROM "site_streams_items" WHERE "video_id" IN (${ids}) RETURNING "id"`)
  await db.execute(sql`DELETE FROM "_site_streams_v_version_items" WHERE "video_id" IN (${ids})`)
  return live.rows.length
}

/** Откат: возвращает удалённые строки на прежние места (те же id, порядок и локали) и убирает служебную таблицу. */
export async function restoreMockStreams(db: Db): Promise<void> {
  const exists = await db.execute(sql`SELECT to_regclass('public._removed_mock_streams') AS t`)
  if (!exists.rows[0]?.t) return
  await db.execute(sql`
    INSERT INTO "site_streams_items"
    SELECT (jsonb_populate_record(NULL::"site_streams_items", b."row")).*
    FROM ${BACKUP} b
    WHERE b."tbl" = 'site_streams_items'
      AND NOT EXISTS (SELECT 1 FROM "site_streams_items" i WHERE i."id" = b."row"->>'id')
  `)
  await db.execute(sql`
    INSERT INTO "_site_streams_v_version_items"
    SELECT (jsonb_populate_record(NULL::"_site_streams_v_version_items", b."row")).*
    FROM ${BACKUP} b
    WHERE b."tbl" = '_site_streams_v_version_items'
      AND NOT EXISTS (SELECT 1 FROM "_site_streams_v_version_items" v WHERE v."id" = (b."row"->>'id')::int)
  `)
  await db.execute(sql`DROP TABLE ${BACKUP}`)
}
