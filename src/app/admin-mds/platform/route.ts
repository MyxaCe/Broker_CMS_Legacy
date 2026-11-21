import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
  loadSiteInstruments,
  readSymbols,
  refreshPlatformInstruments,
  sitesBySymbol,
} from '@/lib/platform-instruments'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) return NextResponse.json({ state: 'unauthorized' }, { status: 401 })
    const state = await refreshPlatformInstruments(payload)
    const sites = await loadSiteInstruments(payload)
    const usage = sitesBySymbol(sites)
    return NextResponse.json(
      {
        state: 'ok',
        version: state.version,
        updatedAt: state.updatedAt,
        instruments: state.instruments.map((i) => ({
          ...i,
          sites: (usage.get(i.symbol) ?? []).map((site) => site.id),
        })),
        sites: sites.map((site) => ({
          id: site.id,
          slug: site.slug,
          name: site.name ?? site.slug,
          instruments: readSymbols(site.instruments).length,
          closeOnly: readSymbols(site.closeOnlyInstruments).length,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.warn('[admin-mds] platform summary failed:', (error as Error).message)
    return NextResponse.json({ state: 'platform_list_unavailable' }, { status: 503 })
  }
}
