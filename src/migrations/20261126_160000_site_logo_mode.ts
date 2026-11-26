import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// «Как показывать бренд в шапке»: логотип и название / только логотип (wordmark) / только название.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_sites_logo_mode" AS ENUM('logo-name', 'logo', 'name');
  ALTER TABLE "sites" ADD COLUMN "logo_mode" "enum_sites_logo_mode" DEFAULT 'logo-name' NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sites" DROP COLUMN "logo_mode";
  DROP TYPE "public"."enum_sites_logo_mode";`)
}
