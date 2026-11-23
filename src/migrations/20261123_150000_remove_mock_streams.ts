import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { removeMockStreams, restoreMockStreams } from '../lib/mock-streams'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const removed = await removeMockStreams(db as never)
  payload.logger.info(`[migration] пробные эфиры удалены: ${removed} записей`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await restoreMockStreams(db as never)
}
