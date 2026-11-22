import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "sites_legal_entity_licenses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"verify_url" varchar,
  	"document_id" integer
  );

  CREATE TABLE IF NOT EXISTS "sites_legal_entity_licenses_locales" (
  	"activity" varchar,
  	"regulator" varchar,
  	"regulator_country" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "sites_locales" (
  	"legal_entity_address" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );

  ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "legal_entity_name" varchar;
  ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "legal_entity_registration_number" varchar;
  DO $$ BEGIN
    ALTER TABLE "sites_legal_entity_licenses" ADD CONSTRAINT "sites_legal_entity_licenses_document_id_media_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    ALTER TABLE "sites_legal_entity_licenses" ADD CONSTRAINT "sites_legal_entity_licenses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    ALTER TABLE "sites_legal_entity_licenses_locales" ADD CONSTRAINT "sites_legal_entity_licenses_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sites_legal_entity_licenses"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    ALTER TABLE "sites_locales" ADD CONSTRAINT "sites_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  CREATE INDEX IF NOT EXISTS "sites_legal_entity_licenses_order_idx" ON "sites_legal_entity_licenses" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "sites_legal_entity_licenses_parent_id_idx" ON "sites_legal_entity_licenses" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "sites_legal_entity_licenses_document_idx" ON "sites_legal_entity_licenses" USING btree ("document_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "sites_legal_entity_licenses_locales_locale_parent_id_unique" ON "sites_legal_entity_licenses_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "sites_locales_locale_parent_id_unique" ON "sites_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "sites_legal_entity_licenses_locales" CASCADE;
  DROP TABLE IF EXISTS "sites_legal_entity_licenses" CASCADE;
  DROP TABLE IF EXISTS "sites_locales" CASCADE;
  ALTER TABLE "sites" DROP COLUMN IF EXISTS "legal_entity_name";
  ALTER TABLE "sites" DROP COLUMN IF EXISTS "legal_entity_registration_number";`)
}
