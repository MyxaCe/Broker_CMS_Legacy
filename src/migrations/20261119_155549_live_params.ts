import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_sites_hero_background" AS ENUM('quotes', 'off');
  ALTER TABLE "sites" ADD COLUMN "hero_background" "enum_sites_hero_background" DEFAULT 'quotes' NOT NULL;
  ALTER TABLE "site_accounts_items" ADD COLUMN "portfolio_key" varchar;
  ALTER TABLE "_site_accounts_v_version_items" ADD COLUMN "portfolio_key" varchar;
  ALTER TABLE "site_promotions_items" ADD COLUMN "engine_promo_id" varchar;
  ALTER TABLE "_site_promotions_v_version_items" ADD COLUMN "engine_promo_id" varchar;
  UPDATE "site_accounts_items" SET "portfolio_key" = CASE lower("plan_id") WHEN 'standard' THEN 'standard' WHEN 'pro' THEN 'pro' WHEN 'ecn' THEN 'enc_prime' WHEN 'ecn_prime' THEN 'enc_prime' WHEN 'enc_prime' THEN 'enc_prime' END
    WHERE "portfolio_key" IS NULL AND lower("plan_id") IN ('standard', 'pro', 'ecn', 'ecn_prime', 'enc_prime');
  UPDATE "_site_accounts_v_version_items" SET "portfolio_key" = CASE lower("plan_id") WHEN 'standard' THEN 'standard' WHEN 'pro' THEN 'pro' WHEN 'ecn' THEN 'enc_prime' WHEN 'ecn_prime' THEN 'enc_prime' WHEN 'enc_prime' THEN 'enc_prime' END
    WHERE "portfolio_key" IS NULL AND lower("plan_id") IN ('standard', 'pro', 'ecn', 'ecn_prime', 'enc_prime');`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sites" DROP COLUMN "hero_background";
  ALTER TABLE "site_accounts_items" DROP COLUMN "portfolio_key";
  ALTER TABLE "_site_accounts_v_version_items" DROP COLUMN "portfolio_key";
  ALTER TABLE "site_promotions_items" DROP COLUMN "engine_promo_id";
  ALTER TABLE "_site_promotions_v_version_items" DROP COLUMN "engine_promo_id";
  DROP TYPE "public"."enum_sites_hero_background";`)
}
