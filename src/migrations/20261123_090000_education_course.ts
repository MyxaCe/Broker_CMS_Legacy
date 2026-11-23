import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

import { insertEducationArticles, revertEducationArticles } from '../lib/education-articles'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await insertEducationArticles(db as never, payload)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await revertEducationArticles(db as never)
}
