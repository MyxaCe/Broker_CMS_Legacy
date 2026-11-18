export type MdsLoad<T> =
  | { state: 'ok'; items: T[] }
  | { state: 'failure'; reason: MdsFailureReason }

export type MdsFailureReason =
  | 'mds_unavailable'
  | 'no_active_site'
  | 'allow_list_unavailable'
  | 'unreachable'

const KNOWN: MdsFailureReason[] = ['mds_unavailable', 'no_active_site', 'allow_list_unavailable']

export const MDS_FAILURE_TEXT: Record<MdsFailureReason, string> = {
  mds_unavailable: 'MDS недоступен — список инструментов показать нельзя.',
  no_active_site: 'Рабочий сайт не выбран — выберите его на дашборде.',
  allow_list_unavailable: 'Не удалось прочитать доступ сайта — список показать нельзя.',
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
