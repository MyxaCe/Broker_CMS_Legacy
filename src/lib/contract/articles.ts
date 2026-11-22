export const ARTICLE_SECTIONS = ['news', 'education'] as const
export type ArticleSection = (typeof ARTICLE_SECTIONS)[number]

export function parseSection(value: string | null): ArticleSection | null {
  return ARTICLE_SECTIONS.includes(value as ArticleSection) ? (value as ArticleSection) : null
}

export function articleWhere(
  siteId: unknown,
  { draft, section, slug, now = new Date() }: { draft: boolean; section?: ArticleSection | null; slug?: string; now?: Date },
) {
  const and: Record<string, unknown>[] = [{ site: { equals: siteId } }]
  if (section) and.push({ section: { equals: section } })
  if (slug !== undefined) and.push({ slug: { equals: slug } })
  if (!draft) {
    and.push({ _status: { equals: 'published' } }, { publishedAt: { less_than_equal: now.toISOString() } })
  }
  return { and }
}
