import type { Language } from './languages'

export const KNOWN_CATEGORY_TITLES: Record<string, Record<Language, string>> = {
  economy: { ru: 'Экономика', en: 'Economy', de: 'Wirtschaft', fr: 'Économie', es: 'Economía' },
  forex: { ru: 'Forex', en: 'Forex', de: 'Forex', fr: 'Forex', es: 'Forex' },
  stocks: { ru: 'Акции', en: 'Stocks', de: 'Aktien', fr: 'Actions', es: 'Acciones' },
  crypto: { ru: 'Криптовалюты', en: 'Crypto', de: 'Krypto', fr: 'Crypto', es: 'Criptomonedas' },
}

export function categoryTitles(slug: string, original?: string): Partial<Record<Language, string>> {
  const known = KNOWN_CATEGORY_TITLES[slug]
  if (known) return known
  const title = original?.trim() || slug.replace(/[-_]+/g, ' ').replace(/^\p{L}/u, (c) => c.toUpperCase())
  return { ru: title, en: title }
}
