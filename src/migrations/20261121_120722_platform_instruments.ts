import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "platform_instruments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"instruments" jsonb DEFAULT '[]'::jsonb,
  	"version" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  INSERT INTO "platform_instruments" ("instruments", "version", "updated_at", "created_at")
  SELECT COALESCE(jsonb_agg(jsonb_build_object('symbol', u."symbol", 'mode', 'trade') ORDER BY u."rank"), '[]'::jsonb), 1, now(), now()
  FROM (
    SELECT c."symbol", min(c."rank") AS "rank"
    FROM (
      SELECT p."symbol", ARRAY[0::bigint, 0::bigint, p."ord"] AS "rank"
      FROM unnest(ARRAY[
        'BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD', 'ADAUSD', 'TRXUSD', 'AVAXUSD', 'LINKUSD',
        'DOTUSD', 'LTCUSD', 'BCHUSD', 'UNIUSD', 'ATOMUSD', 'XLMUSD', 'ETCUSD', 'NEARUSD', 'FILUSD', 'APTUSD',
        'ARBUSD', 'OPUSD', 'INJUSD', 'AAVEUSD', 'HBARUSD', 'VETUSD', 'ICPUSD', 'SHIBUSD', 'SANDUSD', 'MANAUSD'
      ]) WITH ORDINALITY AS p("symbol", "ord")
      UNION ALL
      SELECT e."symbol", ARRAY[1::bigint, s."id"::bigint, e."ord"]
      FROM "sites" s
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(s."instruments") = 'array' THEN s."instruments" ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS j("value", "ord")
      CROSS JOIN LATERAL (SELECT j."value" #>> '{}' AS "symbol", j."ord") AS e
      WHERE jsonb_typeof(j."value") = 'string' AND (j."value" #>> '{}') ~ '^[A-Za-z0-9._:-]{1,64}$'
    ) c
    GROUP BY c."symbol"
  ) u
  HAVING NOT EXISTS (SELECT 1 FROM "platform_instruments");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "platform_instruments" CASCADE;`)
}
