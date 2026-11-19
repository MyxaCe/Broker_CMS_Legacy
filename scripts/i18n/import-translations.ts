import 'dotenv/config'

import { readFileSync } from 'node:fs'
import path from 'node:path'

import config from '@payload-config'
import { getPayload } from 'payload'

import {
  formatSummary,
  importFaqLive,
  importTranslations,
  TRANSLATED_LOCALES,
  type TranslationsFile,
} from '../../src/lib/i18n/import'
import { isLanguage, type Language } from '../../src/lib/languages'

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(name)
const option = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

const apply = flag('--apply')
const faqLive = flag('--faq-live')
const site = option('--site')
const defaultFile = faqLive ? 'scripts/i18n/faq-live.json' : 'scripts/i18n/content.de-fr-es.json'
const file = path.resolve(process.cwd(), option('--file') ?? defaultFile)
const localesArg = option('--locales')
const locales = localesArg ? localesArg.split(',').map((s) => s.trim()) : undefined

if (locales && !locales.every((l) => isLanguage(l) && TRANSLATED_LOCALES.includes(l))) {
  console.error(`--locales принимает только ${TRANSLATED_LOCALES.join(',')}`)
  process.exit(2)
}

const translations = JSON.parse(readFileSync(file, 'utf8')) as TranslationsFile
const payload = await getPayload({ config })

console.info(`Файл: ${file}`)
console.info(`Сайт: ${site ?? translations.site}`)
console.info(`Режим: ${faqLive ? 'новый FAQ во все пять локалей' : 'переводы de/fr/es'}, ${apply ? 'ЗАПИСЬ' : 'dry-run (для записи добавьте --apply)'}`)

try {
  const summary = faqLive
    ? await importFaqLive(payload, translations, { apply, site })
    : await importTranslations(payload, translations, { apply, site, locales: locales as Language[] | undefined })
  console.info(formatSummary(summary, apply))
  process.exit(summary.errors ? 1 : 0)
} catch (error) {
  console.error(`Импорт остановлен: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
