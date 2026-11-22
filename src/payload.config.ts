import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Articles } from './collections/Articles'
import { CONTENT_COLLECTIONS } from './collections/content/index'
import { Media } from './collections/Media'
import { Sites } from './collections/Sites'
import { Users } from './collections/Users'
import { PlatformInstruments } from './globals/PlatformInstruments'
import { FALLBACK_LOCALE, LANGUAGE_NAMES, LANGUAGES } from './lib/languages'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      views: {
        dashboard: {
          Component: '/components/SiteDashboard#SiteDashboard',
        },
      },
      Nav: '/components/AdminNav#AdminNav',
    },
  },
  collections: [Users, Media, Sites, Articles, ...CONTENT_COLLECTIONS],
  globals: [PlatformInstruments],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  localization: {
    locales: LANGUAGES.map((code) => ({
      code,
      label: LANGUAGE_NAMES[code],
      ...(FALLBACK_LOCALE[code] ? { fallbackLocale: FALLBACK_LOCALE[code] } : {}),
    })),
    defaultLocale: 'ru',
    fallback: true,
  },
})
