import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_system_status_services_check" AS ENUM('site', 'cabinet', 'terminal', 'quotes', 'cms', 'storage');
  CREATE TYPE "public"."enum_site_system_status_services_manual_status" AS ENUM('auto', 'maintenance');
  CREATE TYPE "public"."enum_site_system_status_incidents_state" AS ENUM('investigating', 'fixing', 'resolved');
  CREATE TYPE "public"."enum__site_system_status_v_version_services_check" AS ENUM('site', 'cabinet', 'terminal', 'quotes', 'cms', 'storage');
  CREATE TYPE "public"."enum__site_system_status_v_version_services_manual_status" AS ENUM('auto', 'maintenance');
  CREATE TYPE "public"."enum__site_system_status_v_version_incidents_state" AS ENUM('investigating', 'fixing', 'resolved');
  ALTER TABLE "site_system_status_services" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "_site_system_status_v_version_services" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "site_system_status_services" ADD COLUMN "check" "enum_site_system_status_services_check";
  ALTER TABLE "site_system_status_services" ADD COLUMN "manual_status" "enum_site_system_status_services_manual_status" DEFAULT 'auto';
  ALTER TABLE "site_system_status_services" ADD COLUMN "maintenance_note" varchar;
  ALTER TABLE "site_system_status_services" ADD COLUMN "maintenance_from" timestamp(3) with time zone;
  ALTER TABLE "site_system_status_services" ADD COLUMN "maintenance_to" timestamp(3) with time zone;
  ALTER TABLE "site_system_status_incidents" ADD COLUMN "occurred_on" timestamp(3) with time zone;
  ALTER TABLE "site_system_status_incidents" ADD COLUMN "state" "enum_site_system_status_incidents_state";
  ALTER TABLE "_site_system_status_v_version_services" ADD COLUMN "check" "enum__site_system_status_v_version_services_check";
  ALTER TABLE "_site_system_status_v_version_services" ADD COLUMN "manual_status" "enum__site_system_status_v_version_services_manual_status" DEFAULT 'auto';
  ALTER TABLE "_site_system_status_v_version_services" ADD COLUMN "maintenance_note" varchar;
  ALTER TABLE "_site_system_status_v_version_services" ADD COLUMN "maintenance_from" timestamp(3) with time zone;
  ALTER TABLE "_site_system_status_v_version_services" ADD COLUMN "maintenance_to" timestamp(3) with time zone;
  ALTER TABLE "_site_system_status_v_version_incidents" ADD COLUMN "occurred_on" timestamp(3) with time zone;
  ALTER TABLE "_site_system_status_v_version_incidents" ADD COLUMN "state" "enum__site_system_status_v_version_incidents_state";
  UPDATE "site_system_status_services" SET "manual_status" = CASE WHEN "status" = 'maintenance' THEN 'maintenance' ELSE 'auto' END::"enum_site_system_status_services_manual_status";
  UPDATE "site_system_status_services" SET "check" = CASE "service_id"
      WHEN 'svc-0' THEN 'site' WHEN 'svc-1' THEN 'terminal' WHEN 'quotes-ws' THEN 'quotes' WHEN 'svc-2' THEN 'cabinet'
    END::"enum_site_system_status_services_check"
    WHERE "check" IS NULL AND "service_id" IN ('svc-0', 'svc-1', 'quotes-ws', 'svc-2');
  UPDATE "site_system_status_incidents" SET "state" = CASE
      WHEN lower(trim("status")) IN ('решено', 'завершено', 'resolved', 'completed', 'behoben', 'abgeschlossen', 'résolu', 'résolue', 'terminé', 'terminée', 'resuelto', 'resuelta', 'completado', 'completada') THEN 'resolved'
      WHEN lower(trim("status")) IN ('расследуем', 'investigating', 'wird untersucht', 'en cours d''analyse', 'investigando') THEN 'investigating'
      WHEN lower(trim("status")) IN ('исправляем', 'fixing', 'identified', 'monitoring', 'wird behoben', 'correction en cours', 'corrigiendo') THEN 'fixing'
    END::"enum_site_system_status_incidents_state"
    WHERE "state" IS NULL;
  DO $$ DECLARE r record; BEGIN
    FOR r IN SELECT "id", trim("date") AS "d" FROM "site_system_status_incidents"
      WHERE "occurred_on" IS NULL AND trim("date") ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    LOOP
      BEGIN
        UPDATE "site_system_status_incidents" SET "occurred_on" = (r."d" || 'T12:00:00Z')::timestamptz WHERE "id" = r."id";
      EXCEPTION WHEN others THEN NULL;
      END;
    END LOOP;
  END $$;
  UPDATE "_site_system_status_v_version_services" SET "manual_status" = CASE WHEN "status" = 'maintenance' THEN 'maintenance' ELSE 'auto' END::"enum__site_system_status_v_version_services_manual_status";
  UPDATE "_site_system_status_v_version_services" SET "check" = CASE "service_id"
      WHEN 'svc-0' THEN 'site' WHEN 'svc-1' THEN 'terminal' WHEN 'quotes-ws' THEN 'quotes' WHEN 'svc-2' THEN 'cabinet'
    END::"enum__site_system_status_v_version_services_check"
    WHERE "check" IS NULL AND "service_id" IN ('svc-0', 'svc-1', 'quotes-ws', 'svc-2');
  UPDATE "_site_system_status_v_version_incidents" SET "state" = CASE
      WHEN lower(trim("status")) IN ('решено', 'завершено', 'resolved', 'completed', 'behoben', 'abgeschlossen', 'résolu', 'résolue', 'terminé', 'terminée', 'resuelto', 'resuelta', 'completado', 'completada') THEN 'resolved'
      WHEN lower(trim("status")) IN ('расследуем', 'investigating', 'wird untersucht', 'en cours d''analyse', 'investigando') THEN 'investigating'
      WHEN lower(trim("status")) IN ('исправляем', 'fixing', 'identified', 'monitoring', 'wird behoben', 'correction en cours', 'corrigiendo') THEN 'fixing'
    END::"enum__site_system_status_v_version_incidents_state"
    WHERE "state" IS NULL;
  DO $$ DECLARE r record; BEGIN
    FOR r IN SELECT "id", trim("date") AS "d" FROM "_site_system_status_v_version_incidents"
      WHERE "occurred_on" IS NULL AND trim("date") ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    LOOP
      BEGIN
        UPDATE "_site_system_status_v_version_incidents" SET "occurred_on" = (r."d" || 'T12:00:00Z')::timestamptz WHERE "id" = r."id";
      EXCEPTION WHEN others THEN NULL;
      END;
    END LOOP;
  END $$;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_system_status_services" ALTER COLUMN "status" SET DEFAULT 'operational';
  ALTER TABLE "_site_system_status_v_version_services" ALTER COLUMN "status" SET DEFAULT 'operational';
  ALTER TABLE "site_system_status_services" DROP COLUMN "check";
  ALTER TABLE "site_system_status_services" DROP COLUMN "manual_status";
  ALTER TABLE "site_system_status_services" DROP COLUMN "maintenance_note";
  ALTER TABLE "site_system_status_services" DROP COLUMN "maintenance_from";
  ALTER TABLE "site_system_status_services" DROP COLUMN "maintenance_to";
  ALTER TABLE "site_system_status_incidents" DROP COLUMN "occurred_on";
  ALTER TABLE "site_system_status_incidents" DROP COLUMN "state";
  ALTER TABLE "_site_system_status_v_version_services" DROP COLUMN "check";
  ALTER TABLE "_site_system_status_v_version_services" DROP COLUMN "manual_status";
  ALTER TABLE "_site_system_status_v_version_services" DROP COLUMN "maintenance_note";
  ALTER TABLE "_site_system_status_v_version_services" DROP COLUMN "maintenance_from";
  ALTER TABLE "_site_system_status_v_version_services" DROP COLUMN "maintenance_to";
  ALTER TABLE "_site_system_status_v_version_incidents" DROP COLUMN "occurred_on";
  ALTER TABLE "_site_system_status_v_version_incidents" DROP COLUMN "state";
  DROP TYPE "public"."enum_site_system_status_services_check";
  DROP TYPE "public"."enum_site_system_status_services_manual_status";
  DROP TYPE "public"."enum_site_system_status_incidents_state";
  DROP TYPE "public"."enum__site_system_status_v_version_services_check";
  DROP TYPE "public"."enum__site_system_status_v_version_services_manual_status";
  DROP TYPE "public"."enum__site_system_status_v_version_incidents_state";`)
}
