import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

import { migrateLegacyCategories, revertLegacyCategories } from '../lib/article-migrations'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await migrateLegacyCategories(db as never, payload)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await revertLegacyCategories(db as never)
}
