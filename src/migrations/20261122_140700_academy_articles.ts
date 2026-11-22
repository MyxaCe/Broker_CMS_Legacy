import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

import { moveAcademyArticles, revertAcademyArticles } from '../lib/article-migrations'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await moveAcademyArticles(db as never, payload)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await revertAcademyArticles(db as never)
}
