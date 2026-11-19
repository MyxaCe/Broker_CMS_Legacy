export const LANGUAGES = ['ru', 'en', 'de', 'fr', 'es'] as const

export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_NAMES: Record<Language, string> = {
  ru: 'Русский',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
}

export const FALLBACK_LOCALE: Record<Language, Language[] | undefined> = {
  ru: undefined,
  en: ['ru'],
  de: ['en', 'ru'],
  fr: ['en', 'ru'],
  es: ['en', 'ru'],
}

export const DEFAULT_SITE_LANGUAGES: Language[] = ['ru', 'en']
export const DEFAULT_SITE_LANGUAGE: Language = 'ru'

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

export function parseLocale(value: string | null): Language {
  return isLanguage(value) ? value : 'ru'
}

export function siteLanguages(site: { languages?: unknown; defaultLanguage?: unknown }): {
  languages: Language[]
  defaultLanguage: Language
} {
  const raw = Array.isArray(site.languages) ? site.languages : []
  const languages = raw.filter(isLanguage).filter((code, i, all) => all.indexOf(code) === i)
  if (languages.length === 0) {
    return { languages: [...DEFAULT_SITE_LANGUAGES], defaultLanguage: DEFAULT_SITE_LANGUAGE }
  }
  const defaultLanguage = isLanguage(site.defaultLanguage) && languages.includes(site.defaultLanguage)
    ? site.defaultLanguage
    : languages[0]!
  return { languages, defaultLanguage }
}

export function validateLanguages(value: unknown): true | string {
  if (!Array.isArray(value) || value.length === 0) return 'Выберите хотя бы один язык'
  if (!value.every(isLanguage)) return `Допустимые коды: ${LANGUAGES.join(', ')}`
  if (new Set(value).size !== value.length) return 'Язык указан дважды'
  return true
}

export function validateDefaultLanguage(value: unknown, languages: unknown): true | string {
  if (!isLanguage(value)) return `Допустимые коды: ${LANGUAGES.join(', ')}`
  if (!Array.isArray(languages) || !languages.includes(value)) {
    return 'Язык по умолчанию должен входить в список языков сайта'
  }
  return true
}
