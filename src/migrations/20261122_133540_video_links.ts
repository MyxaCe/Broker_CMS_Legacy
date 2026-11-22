import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_academy_articles" ADD COLUMN IF NOT EXISTS "video_url" varchar;
  ALTER TABLE "site_academy_webinars" ADD COLUMN IF NOT EXISTS "recording_url" varchar;
  ALTER TABLE "site_academy_webinars" ADD COLUMN IF NOT EXISTS "join_url" varchar;
  ALTER TABLE "_site_academy_v_version_articles" ADD COLUMN IF NOT EXISTS "video_url" varchar;
  ALTER TABLE "_site_academy_v_version_webinars" ADD COLUMN IF NOT EXISTS "recording_url" varchar;
  ALTER TABLE "_site_academy_v_version_webinars" ADD COLUMN IF NOT EXISTS "join_url" varchar;
  ALTER TABLE "site_streams_items" ADD COLUMN IF NOT EXISTS "video_url" varchar;
  ALTER TABLE "_site_streams_v_version_items" ADD COLUMN IF NOT EXISTS "video_url" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_academy_articles" DROP COLUMN IF EXISTS "video_url";
  ALTER TABLE "site_academy_webinars" DROP COLUMN IF EXISTS "recording_url";
  ALTER TABLE "site_academy_webinars" DROP COLUMN IF EXISTS "join_url";
  ALTER TABLE "_site_academy_v_version_articles" DROP COLUMN IF EXISTS "video_url";
  ALTER TABLE "_site_academy_v_version_webinars" DROP COLUMN IF EXISTS "recording_url";
  ALTER TABLE "_site_academy_v_version_webinars" DROP COLUMN IF EXISTS "join_url";
  ALTER TABLE "site_streams_items" DROP COLUMN IF EXISTS "video_url";
  ALTER TABLE "_site_streams_v_version_items" DROP COLUMN IF EXISTS "video_url";`)
}
