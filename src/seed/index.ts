import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

import { runSeed } from './run'

const SITE_SLUG = process.env.DEFAULT_SITE ?? 'apex-ru'

const payload = await getPayload({ config })

async function ensureUser(email: string, password: string, role: 'admin' | 'editor') {
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })
  if (existing.totalDocs === 0) {
    await payload.create({ collection: 'users', data: { email, password, role } })
    console.info(`[seed] user created: ${email} (${role})`)
  } else {
    console.info(`[seed] user already exists: ${email}`)
  }
}

await ensureUser(
  process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
  process.env.SEED_ADMIN_PASSWORD ?? 'admin1234',
  'admin',
)
await ensureUser(
  process.env.SEED_EDITOR_EMAIL ?? 'editor@example.com',
  process.env.SEED_EDITOR_PASSWORD ?? 'editor1234',
  'editor',
)

await runSeed(payload, SITE_SLUG)

console.info('[seed] done')
process.exit(0)
