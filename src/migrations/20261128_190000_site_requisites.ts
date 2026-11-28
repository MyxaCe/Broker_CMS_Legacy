import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// «Реквизиты для документов» в карточке сайта: значения меток {{company.*}} в юридических текстах;
// код лицензии для меток {{license.<код>.*}}.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "sites_requisites_extra" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "sites_requisites_extra_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );

  ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "requisites_phone" varchar;
  ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "requisites_email" varchar;
  ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "requisites_website" varchar;
  ALTER TABLE "sites_locales" ADD COLUMN IF NOT EXISTS "requisites_jurisdiction" varchar;
  ALTER TABLE "sites_locales" ADD COLUMN IF NOT EXISTS "requisites_jurisdiction_in" varchar;
  ALTER TABLE "sites_legal_entity_licenses" ADD COLUMN IF NOT EXISTS "key" varchar;

  DO $$ BEGIN
    ALTER TABLE "sites_requisites_extra" ADD CONSTRAINT "sites_requisites_extra_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
    ALTER TABLE "sites_requisites_extra_locales" ADD CONSTRAINT "sites_requisites_extra_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sites_requisites_extra"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;

  CREATE INDEX IF NOT EXISTS "sites_requisites_extra_order_idx" ON "sites_requisites_extra" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "sites_requisites_extra_parent_id_idx" ON "sites_requisites_extra" USING btree ("_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "sites_requisites_extra_locales_locale_parent_id_unique" ON "sites_requisites_extra_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "sites_requisites_extra_locales" CASCADE;
  DROP TABLE IF EXISTS "sites_requisites_extra" CASCADE;
  ALTER TABLE "sites" DROP COLUMN IF EXISTS "requisites_phone";
  ALTER TABLE "sites" DROP COLUMN IF EXISTS "requisites_email";
  ALTER TABLE "sites" DROP COLUMN IF EXISTS "requisites_website";
  ALTER TABLE "sites_locales" DROP COLUMN IF EXISTS "requisites_jurisdiction";
  ALTER TABLE "sites_locales" DROP COLUMN IF EXISTS "requisites_jurisdiction_in";
  ALTER TABLE "sites_legal_entity_licenses" DROP COLUMN IF EXISTS "key";`)
}
