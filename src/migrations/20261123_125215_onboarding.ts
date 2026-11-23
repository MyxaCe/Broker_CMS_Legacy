import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_onboarding_parts_steps_anchor" AS ENUM('registration.firstName', 'registration.lastName', 'registration.email', 'registration.phone', 'registration.country', 'registration.password', 'registration.submit', 'cabinet.balanceDemo', 'cabinet.balanceReal', 'cabinet.deposit', 'cabinet.withdraw', 'cabinet.nextSteps', 'cabinet.wallet', 'cabinet.history', 'cabinet.profile', 'cabinet.security', 'cabinet.trade', 'cabinet.help', 'terminal.pairs', 'terminal.categories', 'terminal.chart', 'terminal.timeframes', 'terminal.deal', 'terminal.volume', 'terminal.sltp', 'terminal.buySell', 'terminal.positions', 'terminal.close', 'terminal.help');
  CREATE TYPE "public"."enum_site_onboarding_parts_part" AS ENUM('registration', 'cabinet', 'terminal');
  CREATE TYPE "public"."enum_site_onboarding_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__site_onboarding_v_version_parts_steps_anchor" AS ENUM('registration.firstName', 'registration.lastName', 'registration.email', 'registration.phone', 'registration.country', 'registration.password', 'registration.submit', 'cabinet.balanceDemo', 'cabinet.balanceReal', 'cabinet.deposit', 'cabinet.withdraw', 'cabinet.nextSteps', 'cabinet.wallet', 'cabinet.history', 'cabinet.profile', 'cabinet.security', 'cabinet.trade', 'cabinet.help', 'terminal.pairs', 'terminal.categories', 'terminal.chart', 'terminal.timeframes', 'terminal.deal', 'terminal.volume', 'terminal.sltp', 'terminal.buySell', 'terminal.positions', 'terminal.close', 'terminal.help');
  CREATE TYPE "public"."enum__site_onboarding_v_version_parts_part" AS ENUM('registration', 'cabinet', 'terminal');
  CREATE TYPE "public"."enum__site_onboarding_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__site_onboarding_v_published_locale" AS ENUM('ru', 'en', 'de', 'fr', 'es');
  CREATE TABLE "site_onboarding_parts_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" "enum_site_onboarding_parts_steps_anchor",
  	"title" varchar,
  	"body" varchar
  );
  
  CREATE TABLE "site_onboarding_parts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"part" "enum_site_onboarding_parts_part",
  	"enabled" boolean DEFAULT true,
  	"version" numeric DEFAULT 1
  );
  
  CREATE TABLE "site_onboarding" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_site_onboarding_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "site_onboarding_locales" (
  	"labels_back" varchar,
  	"labels_next" varchar,
  	"labels_skip" varchar,
  	"labels_done" varchar,
  	"labels_help" varchar,
  	"labels_step_of" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_site_onboarding_v_version_parts_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" "enum__site_onboarding_v_version_parts_steps_anchor",
  	"title" varchar,
  	"body" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_site_onboarding_v_version_parts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"part" "enum__site_onboarding_v_version_parts_part",
  	"enabled" boolean DEFAULT true,
  	"version" numeric DEFAULT 1,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_site_onboarding_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_site_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__site_onboarding_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__site_onboarding_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_site_onboarding_v_locales" (
  	"version_labels_back" varchar,
  	"version_labels_next" varchar,
  	"version_labels_skip" varchar,
  	"version_labels_done" varchar,
  	"version_labels_help" varchar,
  	"version_labels_step_of" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "site_onboarding_id" integer;
  ALTER TABLE "site_onboarding_parts_steps" ADD CONSTRAINT "site_onboarding_parts_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_onboarding_parts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_onboarding_parts" ADD CONSTRAINT "site_onboarding_parts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_onboarding"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_onboarding" ADD CONSTRAINT "site_onboarding_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_onboarding_locales" ADD CONSTRAINT "site_onboarding_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_onboarding"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_onboarding_v_version_parts_steps" ADD CONSTRAINT "_site_onboarding_v_version_parts_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_onboarding_v_version_parts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_onboarding_v_version_parts" ADD CONSTRAINT "_site_onboarding_v_version_parts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_onboarding_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_onboarding_v" ADD CONSTRAINT "_site_onboarding_v_parent_id_site_onboarding_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_onboarding"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_onboarding_v" ADD CONSTRAINT "_site_onboarding_v_version_site_id_sites_id_fk" FOREIGN KEY ("version_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_onboarding_v_locales" ADD CONSTRAINT "_site_onboarding_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_onboarding_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_onboarding_parts_steps_order_idx" ON "site_onboarding_parts_steps" USING btree ("_order");
  CREATE INDEX "site_onboarding_parts_steps_parent_id_idx" ON "site_onboarding_parts_steps" USING btree ("_parent_id");
  CREATE INDEX "site_onboarding_parts_steps_locale_idx" ON "site_onboarding_parts_steps" USING btree ("_locale");
  CREATE INDEX "site_onboarding_parts_order_idx" ON "site_onboarding_parts" USING btree ("_order");
  CREATE INDEX "site_onboarding_parts_parent_id_idx" ON "site_onboarding_parts" USING btree ("_parent_id");
  CREATE INDEX "site_onboarding_parts_locale_idx" ON "site_onboarding_parts" USING btree ("_locale");
  CREATE UNIQUE INDEX "site_onboarding_site_idx" ON "site_onboarding" USING btree ("site_id");
  CREATE INDEX "site_onboarding_updated_at_idx" ON "site_onboarding" USING btree ("updated_at");
  CREATE INDEX "site_onboarding_created_at_idx" ON "site_onboarding" USING btree ("created_at");
  CREATE INDEX "site_onboarding__status_idx" ON "site_onboarding" USING btree ("_status");
  CREATE UNIQUE INDEX "site_onboarding_locales_locale_parent_id_unique" ON "site_onboarding_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_site_onboarding_v_version_parts_steps_order_idx" ON "_site_onboarding_v_version_parts_steps" USING btree ("_order");
  CREATE INDEX "_site_onboarding_v_version_parts_steps_parent_id_idx" ON "_site_onboarding_v_version_parts_steps" USING btree ("_parent_id");
  CREATE INDEX "_site_onboarding_v_version_parts_steps_locale_idx" ON "_site_onboarding_v_version_parts_steps" USING btree ("_locale");
  CREATE INDEX "_site_onboarding_v_version_parts_order_idx" ON "_site_onboarding_v_version_parts" USING btree ("_order");
  CREATE INDEX "_site_onboarding_v_version_parts_parent_id_idx" ON "_site_onboarding_v_version_parts" USING btree ("_parent_id");
  CREATE INDEX "_site_onboarding_v_version_parts_locale_idx" ON "_site_onboarding_v_version_parts" USING btree ("_locale");
  CREATE INDEX "_site_onboarding_v_parent_idx" ON "_site_onboarding_v" USING btree ("parent_id");
  CREATE INDEX "_site_onboarding_v_version_version_site_idx" ON "_site_onboarding_v" USING btree ("version_site_id");
  CREATE INDEX "_site_onboarding_v_version_version_updated_at_idx" ON "_site_onboarding_v" USING btree ("version_updated_at");
  CREATE INDEX "_site_onboarding_v_version_version_created_at_idx" ON "_site_onboarding_v" USING btree ("version_created_at");
  CREATE INDEX "_site_onboarding_v_version_version__status_idx" ON "_site_onboarding_v" USING btree ("version__status");
  CREATE INDEX "_site_onboarding_v_created_at_idx" ON "_site_onboarding_v" USING btree ("created_at");
  CREATE INDEX "_site_onboarding_v_updated_at_idx" ON "_site_onboarding_v" USING btree ("updated_at");
  CREATE INDEX "_site_onboarding_v_snapshot_idx" ON "_site_onboarding_v" USING btree ("snapshot");
  CREATE INDEX "_site_onboarding_v_published_locale_idx" ON "_site_onboarding_v" USING btree ("published_locale");
  CREATE INDEX "_site_onboarding_v_latest_idx" ON "_site_onboarding_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_site_onboarding_v_locales_locale_parent_id_unique" ON "_site_onboarding_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_onboarding_fk" FOREIGN KEY ("site_onboarding_id") REFERENCES "public"."site_onboarding"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_site_onboarding_id_idx" ON "payload_locked_documents_rels" USING btree ("site_onboarding_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_onboarding_parts_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_onboarding_parts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_onboarding" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_onboarding_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_onboarding_v_version_parts_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_onboarding_v_version_parts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_onboarding_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_onboarding_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "site_onboarding_parts_steps" CASCADE;
  DROP TABLE "site_onboarding_parts" CASCADE;
  DROP TABLE "site_onboarding" CASCADE;
  DROP TABLE "site_onboarding_locales" CASCADE;
  DROP TABLE "_site_onboarding_v_version_parts_steps" CASCADE;
  DROP TABLE "_site_onboarding_v_version_parts" CASCADE;
  DROP TABLE "_site_onboarding_v" CASCADE;
  DROP TABLE "_site_onboarding_v_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_site_onboarding_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_site_onboarding_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "site_onboarding_id";
  DROP TYPE "public"."enum_site_onboarding_parts_steps_anchor";
  DROP TYPE "public"."enum_site_onboarding_parts_part";
  DROP TYPE "public"."enum_site_onboarding_status";
  DROP TYPE "public"."enum__site_onboarding_v_version_parts_steps_anchor";
  DROP TYPE "public"."enum__site_onboarding_v_version_parts_part";
  DROP TYPE "public"."enum__site_onboarding_v_version_status";
  DROP TYPE "public"."enum__site_onboarding_v_published_locale";`)
}
