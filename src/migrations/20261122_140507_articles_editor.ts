import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { backfillLexicalBodies } from '../lib/article-migrations'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN CREATE TYPE "public"."enum_articles_section" AS ENUM('news', 'education'); EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_articles_level" AS ENUM('beginner', 'intermediate'); EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum__articles_v_version_section" AS ENUM('news', 'education'); EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum__articles_v_version_level" AS ENUM('beginner', 'intermediate'); EXCEPTION WHEN duplicate_object THEN null; END $$;
  CREATE TABLE IF NOT EXISTS "article_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE TABLE IF NOT EXISTS "article_categories_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "section" "enum_articles_section" DEFAULT 'news';
  ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "cover_id" integer;
  ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "article_category_id" integer;
  ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "level" "enum_articles_level" DEFAULT 'beginner';
  ALTER TABLE "articles_locales" ADD COLUMN IF NOT EXISTS "video_url" varchar;
  ALTER TABLE "articles_locales" ADD COLUMN IF NOT EXISTS "body" jsonb;
  ALTER TABLE "articles_locales" ADD COLUMN IF NOT EXISTS "reading_minutes" numeric;
  ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_section" "enum__articles_v_version_section" DEFAULT 'news';
  ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_cover_id" integer;
  ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_article_category_id" integer;
  ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_level" "enum__articles_v_version_level" DEFAULT 'beginner';
  ALTER TABLE "_articles_v_locales" ADD COLUMN IF NOT EXISTS "version_video_url" varchar;
  ALTER TABLE "_articles_v_locales" ADD COLUMN IF NOT EXISTS "version_body" jsonb;
  ALTER TABLE "_articles_v_locales" ADD COLUMN IF NOT EXISTS "version_reading_minutes" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "article_categories_id" integer;
  DO $$ BEGIN ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN ALTER TABLE "article_categories_locales" ADD CONSTRAINT "article_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."article_categories"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN ALTER TABLE "articles" ADD CONSTRAINT "articles_article_category_id_article_categories_id_fk" FOREIGN KEY ("article_category_id") REFERENCES "public"."article_categories"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_article_category_id_article_categories_id_fk" FOREIGN KEY ("version_article_category_id") REFERENCES "public"."article_categories"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_article_categories_fk" FOREIGN KEY ("article_categories_id") REFERENCES "public"."article_categories"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
  CREATE INDEX IF NOT EXISTS "article_categories_site_idx" ON "article_categories" USING btree ("site_id");
  CREATE INDEX IF NOT EXISTS "article_categories_slug_idx" ON "article_categories" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "article_categories_updated_at_idx" ON "article_categories" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "article_categories_created_at_idx" ON "article_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "article_categories_locales_locale_parent_id_unique" ON "article_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX IF NOT EXISTS "articles_section_idx" ON "articles" USING btree ("section");
  CREATE INDEX IF NOT EXISTS "articles_cover_idx" ON "articles" USING btree ("cover_id");
  CREATE INDEX IF NOT EXISTS "articles_article_category_idx" ON "articles" USING btree ("article_category_id");
  CREATE INDEX IF NOT EXISTS "_articles_v_version_version_section_idx" ON "_articles_v" USING btree ("version_section");
  CREATE INDEX IF NOT EXISTS "_articles_v_version_version_cover_idx" ON "_articles_v" USING btree ("version_cover_id");
  CREATE INDEX IF NOT EXISTS "_articles_v_version_version_article_category_idx" ON "_articles_v" USING btree ("version_article_category_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_article_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("article_categories_id");
  UPDATE "articles_locales" l SET "reading_minutes" = a."reading_minutes"
    FROM "articles" a WHERE l."_parent_id" = a."id" AND l."reading_minutes" IS NULL;
  UPDATE "_articles_v_locales" l SET "version_reading_minutes" = v."version_reading_minutes"
    FROM "_articles_v" v WHERE l."_parent_id" = v."id" AND l."version_reading_minutes" IS NULL;`)
  await backfillLexicalBodies(db as never, payload)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "articles" a SET "reading_minutes" = l."reading_minutes"
    FROM "articles_locales" l WHERE l."_parent_id" = a."id" AND l."_locale" = 'ru' AND l."reading_minutes" IS NOT NULL;
  DROP TABLE IF EXISTS "article_categories_locales" CASCADE;
  DROP TABLE IF EXISTS "article_categories" CASCADE;
  ALTER TABLE "articles" DROP CONSTRAINT IF EXISTS "articles_cover_id_media_id_fk";
  ALTER TABLE "articles" DROP CONSTRAINT IF EXISTS "articles_article_category_id_article_categories_id_fk";
  ALTER TABLE "_articles_v" DROP CONSTRAINT IF EXISTS "_articles_v_version_cover_id_media_id_fk";
  ALTER TABLE "_articles_v" DROP CONSTRAINT IF EXISTS "_articles_v_version_article_category_id_article_categories_id_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_article_categories_fk";
  DROP INDEX IF EXISTS "articles_section_idx";
  DROP INDEX IF EXISTS "articles_cover_idx";
  DROP INDEX IF EXISTS "articles_article_category_idx";
  DROP INDEX IF EXISTS "_articles_v_version_version_section_idx";
  DROP INDEX IF EXISTS "_articles_v_version_version_cover_idx";
  DROP INDEX IF EXISTS "_articles_v_version_version_article_category_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_article_categories_id_idx";
  ALTER TABLE "articles" DROP COLUMN IF EXISTS "section";
  ALTER TABLE "articles" DROP COLUMN IF EXISTS "cover_id";
  ALTER TABLE "articles" DROP COLUMN IF EXISTS "article_category_id";
  ALTER TABLE "articles" DROP COLUMN IF EXISTS "level";
  ALTER TABLE "articles_locales" DROP COLUMN IF EXISTS "video_url";
  ALTER TABLE "articles_locales" DROP COLUMN IF EXISTS "body";
  ALTER TABLE "articles_locales" DROP COLUMN IF EXISTS "reading_minutes";
  ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_section";
  ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_cover_id";
  ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_article_category_id";
  ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_level";
  ALTER TABLE "_articles_v_locales" DROP COLUMN IF EXISTS "version_video_url";
  ALTER TABLE "_articles_v_locales" DROP COLUMN IF EXISTS "version_body";
  ALTER TABLE "_articles_v_locales" DROP COLUMN IF EXISTS "version_reading_minutes";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "article_categories_id";
  DROP TYPE IF EXISTS "public"."enum_articles_section";
  DROP TYPE IF EXISTS "public"."enum_articles_level";
  DROP TYPE IF EXISTS "public"."enum__articles_v_version_section";
  DROP TYPE IF EXISTS "public"."enum__articles_v_version_level";`)
}
