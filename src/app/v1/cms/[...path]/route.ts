import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { RESOURCE_TO_COLLECTION } from '@/collections/content/index'
import { articleWhere, parseSection } from '@/lib/contract/articles'
import { heroBackground, mapAcademyArticle, mapArticle } from '@/lib/contract/mappers'
import { RESOURCE_MAPPERS } from '@/lib/contract/resources'
import { requisiteValues, substituteRequisites, withRequisitesLegal } from '@/lib/requisites'
import { validateContract } from '@/lib/contract/validate'
import { parseLocale, siteLanguages } from '@/lib/languages'
import { defaultSiteSlug } from '@/lib/notify-site'
import { readSymbols, refreshPlatformInstruments, toPlatformInstrumentsDto } from '@/lib/platform-instruments'

export const dynamic = 'force-dynamic'

const ARTICLES_PAGE_SIZE = 20
const ARTICLES_PAGE_SIZE_MAX = 100
const ACADEMY_ARTICLES_LIMIT = 200
const SITE_SLUG_PATTERN = /^[a-z0-9-]{2,32}$/

function jsonWithVersion(dto: unknown, version: unknown, extra: Record<string, string> = {}) {
  return NextResponse.json(dto, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Version': String(version ?? ''),
      ...extra,
    },
  })
}

function contractViolation(resource: string, siteSlug: string, errors: string[]) {
  console.error(`[contract] ${resource} (site=${siteSlug}) violates schema:`, errors)
  return NextResponse.json({ error: 'contract_violation', details: errors }, { status: 500 })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params
  const url = new URL(request.url)
  const locale = parseLocale(url.searchParams.get('locale'))
  const draft = url.searchParams.get('draft') === 'true'
  const resource = segments[0] ?? ''
  const siteSlug = url.searchParams.get('site') ?? defaultSiteSlug()

  if (!SITE_SLUG_PATTERN.test(siteSlug)) {
    return NextResponse.json({ error: 'invalid_site' }, { status: 400 })
  }

  const isPublicBrand =
    resource === 'brand' && segments.length === 1 && Boolean(url.searchParams.get('site')) && !draft

  const expectedKey = process.env.CMS_API_KEY
  if (!isPublicBrand && expectedKey && request.headers.get('x-api-key') !== expectedKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getPayload({ config })

    if (resource === 'platform') {
      if (segments.length !== 2 || segments[1] !== 'instruments') {
        return NextResponse.json({ error: 'unknown_resource' }, { status: 404 })
      }
      const dto = toPlatformInstrumentsDto(await refreshPlatformInstruments(payload))
      const check = validateContract('platform-instruments', dto)
      if (!check.valid) return contractViolation('platform-instruments', '-', check.errors)
      return jsonWithVersion(dto, dto.version)
    }

    const sites = await payload.find({
      collection: 'sites',
      where: { slug: { equals: segments[0] === 'sites' ? (segments[1] ?? '') : siteSlug } },
      locale,
      limit: 1,
      depth: 2,
    })
    const site = sites.docs[0] as Record<string, any> | undefined

    if (resource === 'sites' && segments.length === 2) {
      if (!SITE_SLUG_PATTERN.test(segments[1] ?? '')) {
        return NextResponse.json({ error: 'invalid_site' }, { status: 400 })
      }
      if (!site) return NextResponse.json({ error: 'unknown_site' }, { status: 404 })
      const dto = {
        slug: String(site.slug),
        name: String(site.name ?? ''),
        demoStartBalanceCents: Number(site.demoStartBalanceCents ?? 1000000),
        instruments: Array.isArray(site.instruments) ? site.instruments.map(String) : [],
        closeOnlyInstruments: readSymbols(site.closeOnlyInstruments).filter(
          (symbol) => Array.isArray(site.instruments) && site.instruments.includes(symbol),
        ),
        heroBackground: heroBackground(site),
        ...siteLanguages(site),
      }
      const check = validateContract('sites', dto)
      if (!check.valid) return contractViolation('sites', String(site.slug), check.errors)
      return jsonWithVersion(dto, site.updatedAt)
    }

    if (!site) return NextResponse.json({ error: 'unknown_site' }, { status: 404 })

    if (resource === 'brand' && segments.length === 1) {
      const dto = RESOURCE_MAPPERS.brand!(site)
      const check = validateContract('brand', dto)
      if (!check.valid) return contractViolation('brand', siteSlug, check.errors)
      return jsonWithVersion(dto, site.updatedAt, isPublicBrand
        ? { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' }
        : {})
    }

    if (resource === 'articles' && segments.length === 2) {
      const found = await payload.find({
        collection: 'articles',
        where: articleWhere(site.id, { draft, slug: segments[1], section: parseSection(url.searchParams.get('section')) }) as never,
        locale,
        draft,
        limit: 1,
      })
      const doc = found.docs[0]
      if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      const dto = substituteRequisites(mapArticle(doc as Record<string, any>), requisiteValues(site))
      const check = validateContract('article', dto)
      if (!check.valid) return contractViolation('article', siteSlug, check.errors)
      return jsonWithVersion(dto, (doc as Record<string, any>).updatedAt)
    }

    if (segments.length !== 1) {
      return NextResponse.json({ error: 'unknown_resource' }, { status: 404 })
    }

    if (resource === 'articles') {
      const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
      const requestedSize = Number.parseInt(url.searchParams.get('pageSize') ?? '', 10)
      const pageSize = requestedSize > 0 ? Math.min(requestedSize, ARTICLES_PAGE_SIZE_MAX) : ARTICLES_PAGE_SIZE
      const section = parseSection(url.searchParams.get('section')) ?? 'news'
      const found = await payload.find({
        collection: 'articles',
        where: articleWhere(site.id, { draft, section }) as never,
        locale,
        draft,
        sort: '-publishedAt',
        page,
        limit: pageSize,
      })
      const dto = {
        items: substituteRequisites(found.docs.map((doc) => mapArticle(doc as Record<string, any>)), requisiteValues(site)),
        total: found.totalDocs,
        page: found.page ?? page,
        pageSize,
        section,
      }
      const check = validateContract('articles', dto)
      if (!check.valid) return contractViolation('articles', siteSlug, check.errors)
      const newest = found.docs[0] as Record<string, any> | undefined
      return jsonWithVersion(dto, newest?.updatedAt)
    }

    const collection = RESOURCE_TO_COLLECTION[resource]
    const mapper = RESOURCE_MAPPERS[resource]
    if (!collection || !mapper) {
      return NextResponse.json({ error: 'unknown_resource' }, { status: 404 })
    }

    const found = await payload.find({
      collection: collection as never,
      where: { site: { equals: site.id } },
      locale,
      draft,
      limit: 1,
      depth: 2,
    })
    const doc = found.docs[0] as Record<string, any> | undefined
    if (!doc) {
      return NextResponse.json({ error: 'no_content_for_site' }, { status: 404 })
    }

    const dto = mapper(doc) as Record<string, unknown>
    let version = doc.updatedAt
    if (resource === 'academy') {
      const education = await payload.find({
        collection: 'articles',
        where: articleWhere(site.id, { draft, section: 'education' }) as never,
        locale,
        draft,
        sort: '-publishedAt',
        limit: ACADEMY_ARTICLES_LIMIT,
      })
      dto.articles = education.docs.map((article) => mapAcademyArticle(article as Record<string, any>))
      const newest = (education.docs as Record<string, any>[]).map((a) => String(a.updatedAt ?? '')).sort().pop()
      if (newest && newest > String(version ?? '')) version = newest
    }
    // Реквизиты сайта ({{brand}}, {{company.*}}) подставляет CMS; документ с пустым реквизитом не отдаётся.
    const filled =
      resource === 'legal'
        ? withRequisitesLegal(dto as { items: Record<string, any>[] }, site)
        : substituteRequisites(dto, requisiteValues(site))
    const check = validateContract(resource, filled)
    if (!check.valid) return contractViolation(resource, siteSlug, check.errors)
    // Реквизиты живут в карточке сайта: их правка тоже новая версия ответа.
    const siteUpdated = String(site.updatedAt ?? '')
    if (siteUpdated > String(version ?? '')) version = siteUpdated
    return jsonWithVersion(filled, version)
  } catch (error) {
    console.error(`[contract] ${segments.join('/')} (site=${siteSlug}) failed:`, error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
