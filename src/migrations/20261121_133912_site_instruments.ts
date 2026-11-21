import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "close_only_instruments" jsonb;
  ALTER TABLE "platform_instruments" ADD COLUMN IF NOT EXISTS "computed_hash" varchar;
  UPDATE "sites" s SET "close_only_instruments" = COALESCE((
    SELECT jsonb_agg(to_jsonb(c."symbol") ORDER BY c."ord")
    FROM (
      SELECT e."value" #>> '{}' AS "symbol", min(e."ord") AS "ord"
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(s."instruments") = 'array' THEN s."instruments" ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS e("value", "ord")
      WHERE jsonb_typeof(e."value") = 'string'
      GROUP BY e."value" #>> '{}'
    ) c
    WHERE EXISTS (
      SELECT 1
      FROM "platform_instruments" p
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(p."instruments") = 'array' THEN p."instruments" ELSE '[]'::jsonb END
      ) AS m("item")
      WHERE m."item" ->> 'symbol' = c."symbol" AND m."item" ->> 'mode' = 'closeOnly'
    )
  ), '[]'::jsonb)
  WHERE s."close_only_instruments" IS NULL;
  ALTER TABLE "sites" ALTER COLUMN "close_only_instruments" SET DEFAULT '[]'::jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sites" DROP COLUMN IF EXISTS "close_only_instruments";
  ALTER TABLE "platform_instruments" DROP COLUMN IF EXISTS "computed_hash";`)
}
