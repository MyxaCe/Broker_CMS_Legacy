import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { activeSiteSlug } from '@/lib/active-site'

export const dynamic = 'force-dynamic'

interface MdsItem {
  symbol: string
  [key: string]: unknown
}

type FailureState = 'mds_unavailable' | 'no_active_site' | 'allow_list_unavailable'

function ok(items: MdsItem[]) {
  return NextResponse.json({ state: 'ok', items })
}

function failure(state: FailureState) {
  return NextResponse.json({ state }, { status: 503 })
}

async function fetchUniverse(): Promise<MdsItem[] | null> {
  const base = process.env.MDS_HTTP_URL
  if (!base) return null
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/instruments?all=1`, {
      signal: AbortSignal.timeout(3_000),
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { items?: MdsItem[] }
    return Array.isArray(data.items) ? data.items : null
  } catch (error) {
    console.warn('[admin-mds] instruments unavailable:', (error as Error).message)
    return null
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const wantAll = params.get('all') === '1'
  const items = await fetchUniverse()
  if (!items) return failure('mds_unavailable')

  if (wantAll) return ok(items)

  const slug = activeSiteSlug(request.headers)
  if (!slug) return failure('no_active_site')
  try {
    const payload = await getPayload({ config })
    const sites = await payload.find({
      collection: 'sites',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    })
    const allowed = (sites.docs[0] as { instruments?: unknown } | undefined)?.instruments
    const allowList = Array.isArray(allowed) ? new Set(allowed.map(String)) : new Set<string>()
    return ok(items.filter((i) => allowList.has(i.symbol)))
  } catch (error) {
    console.warn('[admin-mds] allow-list resolve failed:', (error as Error).message)
    return failure('allow_list_unavailable')
  }
}
