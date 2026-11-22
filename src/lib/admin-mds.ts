export type MdsLoad<T> =
  | { state: 'ok'; items: T[] }
  | { state: 'failure'; reason: MdsFailureReason }

export type MdsFailureReason =
  | 'mds_unavailable'
  | 'no_active_site'
  | 'allow_list_unavailable'
  | 'platform_list_unavailable'
  | 'unreachable'

const KNOWN: MdsFailureReason[] = [
  'mds_unavailable',
  'no_active_site',
  'allow_list_unavailable',
  'platform_list_unavailable',
]

export const MDS_FAILURE_TEXT: Record<MdsFailureReason, string> = {
  mds_unavailable: 'MDS недоступен — список инструментов показать нельзя.',
  no_active_site: 'Рабочий сайт не выбран — выберите его на дашборде.',
  allow_list_unavailable: 'Не удалось прочитать доступ сайта — список показать нельзя.',
  platform_list_unavailable: 'Не удалось прочитать «Инструменты платформы» — список показать нельзя.',
  unreachable: 'Сервис инструментов не ответил — список показать нельзя.',
}

export async function loadMdsInstruments<T>(url: string): Promise<MdsLoad<T>> {
  let body: unknown
  try {
    const res = await fetch(url)
    body = await res.json()
  } catch {
    return { state: 'failure', reason: 'unreachable' }
  }
  const data = body as { state?: unknown; items?: unknown } | null
  if (data?.state === 'ok' && Array.isArray(data.items)) {
    return { state: 'ok', items: data.items as T[] }
  }
  const reason = KNOWN.find((r) => r === data?.state) ?? 'unreachable'
  return { state: 'failure', reason }
}

export interface PlatformSummary {
  version: number
  updatedAt: string
  instruments: { symbol: string; mode: 'trade' | 'closeOnly'; sites: (string | number)[] }[]
  sites: { id: string | number; slug: string; name: string; instruments: number; closeOnly: number }[]
}

export async function loadPlatformSummary(): Promise<
  { state: 'ok'; summary: PlatformSummary } | { state: 'failure'; reason: MdsFailureReason }
> {
  try {
    const res = await fetch('/admin-mds/platform', { credentials: 'include', cache: 'no-store' })
    const body = (await res.json()) as Partial<PlatformSummary> & { state?: unknown }
    if (body?.state === 'ok' && Array.isArray(body.instruments) && Array.isArray(body.sites)) {
      return { state: 'ok', summary: body as PlatformSummary }
    }
  } catch {
    return { state: 'failure', reason: 'unreachable' }
  }
  return { state: 'failure', reason: 'platform_list_unavailable' }
}
