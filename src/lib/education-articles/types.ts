export interface EducationText {
  title: string
  excerpt: string
  markdown: string
}

export interface EducationSeed {
  slug: string
  // На сайте два уровня. Третий уровень курса («Профессиональный») идёт как intermediate,
  // а «Уровень 3» стоит в заголовке — пока в CMS и на сайте нет значения advanced.
  level: 'beginner' | 'intermediate'
  locales: { ru: EducationText; en: EducationText }
}

const yt = (query: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query).replace(/%20/g, '+')}`

export function videos(heading: string, items: ReadonlyArray<readonly [string, string]>): string {
  return `## ${heading}\n\n${items.map(([title, query]) => `- [${title}](${yt(query)})`).join('\n')}`
}

export const RISK_RU =
  '---\n\n*Материал носит образовательный характер и не является инвестиционной рекомендацией. Торговля инструментами с кредитным плечом связана с высоким риском: можно быстро потерять вложенные средства. Используйте только те деньги, потерю которых готовы перенести, и начинайте с демо-счёта.*'

export const RISK_EN =
  '---\n\n*This material is for educational purposes only and is not investment advice. Trading leveraged instruments carries a high level of risk: you can lose the money you invest quickly. Only trade with money you can afford to lose, and start on a demo account.*'
