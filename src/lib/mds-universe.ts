export interface MdsItem {
  symbol: string
  provider?: string | null
  [key: string]: unknown
}

const FRESH_MS = 60_000
const STALE_MS = 10 * 60_000
let memo: { at: number; items: MdsItem[] } | null = null
let inflight: Promise<MdsItem[] | null> | null = null

async function loadUniverse(): Promise<MdsItem[] | null> {
  const base = process.env.MDS_HTTP_URL
  if (!base) return null
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/instruments?all=1`, {
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { items?: MdsItem[] }
    if (!Array.isArray(data.items)) return null
    memo = { at: Date.now(), items: data.items }
    return data.items
  } catch (error) {
    console.warn('[admin-mds] instruments unavailable:', (error as Error).message)
    return null
  }
}

/** Каталог MDS целиком: свежий — 60 с, при сбое MDS — последний удачный не старше 10 мин. */
export async function fetchUniverse(): Promise<MdsItem[] | null> {
  const now = Date.now()
  if (memo && now - memo.at < FRESH_MS) return memo.items
  inflight ??= loadUniverse().finally(() => {
    inflight = null
  })
  const items = await inflight
  if (items) return items
  return memo && now - memo.at < STALE_MS ? memo.items : null
}


/** Только для тестов: сбросить запомненный каталог. */
export function resetMdsUniverse(): void {
  memo = null
  inflight = null
}
