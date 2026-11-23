import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Третий уровень статей обучения: «Профессиональный» (advanced).
// Payload выполняет каждую миграцию в своей транзакции: значение enum фиксируется здесь,
// а следующая миграция (обучающий курс) уже может его записывать.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TYPE "public"."enum_articles_level" ADD VALUE IF NOT EXISTS 'advanced';
  ALTER TYPE "public"."enum__articles_v_version_level" ADD VALUE IF NOT EXISTS 'advanced';`)
}

// Откат: статьи и версии с «advanced» становятся «intermediate» (как было до третьего уровня),
// затем типы пересобираются без значения — Postgres не умеет удалять значение enum.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "articles" SET "level" = 'intermediate' WHERE "level" = 'advanced';
  UPDATE "_articles_v" SET "version_level" = 'intermediate' WHERE "version_level" = 'advanced';
  ALTER TABLE "articles" ALTER COLUMN "level" DROP DEFAULT;
  ALTER TABLE "_articles_v" ALTER COLUMN "version_level" DROP DEFAULT;
  ALTER TYPE "public"."enum_articles_level" RENAME TO "enum_articles_level_old";
  CREATE TYPE "public"."enum_articles_level" AS ENUM('beginner', 'intermediate');
  ALTER TABLE "articles" ALTER COLUMN "level" TYPE "public"."enum_articles_level" USING "level"::text::"public"."enum_articles_level";
  DROP TYPE "public"."enum_articles_level_old";
  ALTER TYPE "public"."enum__articles_v_version_level" RENAME TO "enum__articles_v_version_level_old";
  CREATE TYPE "public"."enum__articles_v_version_level" AS ENUM('beginner', 'intermediate');
  ALTER TABLE "_articles_v" ALTER COLUMN "version_level" TYPE "public"."enum__articles_v_version_level" USING "version_level"::text::"public"."enum__articles_v_version_level";
  DROP TYPE "public"."enum__articles_v_version_level_old";
  ALTER TABLE "articles" ALTER COLUMN "level" SET DEFAULT 'beginner';
  ALTER TABLE "_articles_v" ALTER COLUMN "version_level" SET DEFAULT 'beginner';`)
}
