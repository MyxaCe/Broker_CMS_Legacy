type PreviewArgs = { locale?: string | null }

const DEFAULT_LOCALE = 'ru'

export function localizedSitePath(path: string, locale?: string | null): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (!locale || locale === DEFAULT_LOCALE || locale === 'all') return clean
  return `/${locale}${clean === '/' ? '' : clean}`
}

export const sitePreviewUrl =
  (path: string) =>
  (_doc: unknown, { locale }: PreviewArgs): string | null => {
    const site = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    const secret = process.env.SITE_PREVIEW_SECRET
    if (!secret) return null
    return `${site}/api/preview?secret=${encodeURIComponent(secret)}&path=${encodeURIComponent(localizedSitePath(path, locale))}`
  }

export const sitePreviewUrlFor =
  (buildPath: (doc: Record<string, any>) => string) =>
  (doc: unknown, { locale }: PreviewArgs): string | null =>
    sitePreviewUrl(buildPath((doc ?? {}) as Record<string, any>))(doc, { locale })

export function articlePreviewPath(doc: Record<string, any>): string {
  const slug = encodeURIComponent(String(doc.slug ?? ''))
  return doc.section === 'education' ? `/education/articles/${slug}` : `/analytics/news/${slug}`
}
