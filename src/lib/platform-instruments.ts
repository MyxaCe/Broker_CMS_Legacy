import type { Payload, PayloadRequest } from 'payload'

import { sendWebhook } from './notify-site'

export const PLATFORM_INSTRUMENTS_SLUG = 'platform-instruments'
export const PLATFORM_INSTRUMENTS_TAG = 'cms:platform:instruments'

export type PlatformInstrumentMode = 'trade' | 'closeOnly'

export const PLATFORM_INSTRUMENT_MODES: PlatformInstrumentMode[] = ['trade', 'closeOnly']

export interface PlatformInstrument {
  symbol: string
  mode: PlatformInstrumentMode
}

export interface PlatformInstrumentsDto {
  version: number
  updatedAt: string
  instruments: PlatformInstrument[]
}

export const TERMINAL_PAIRS = [
  'BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD', 'ADAUSD', 'TRXUSD', 'AVAXUSD', 'LINKUSD',
  'DOTUSD', 'LTCUSD', 'BCHUSD', 'UNIUSD', 'ATOMUSD', 'XLMUSD', 'ETCUSD', 'NEARUSD', 'FILUSD', 'APTUSD',
  'ARBUSD', 'OPUSD', 'INJUSD', 'AAVEUSD', 'HBARUSD', 'VETUSD', 'ICPUSD', 'SHIBUSD', 'SANDUSD', 'MANAUSD',
] as const

const SYMBOL_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/

type Api = Pick<Payload, 'findGlobal' | 'find'>

export function readPlatformInstruments(value: unknown): PlatformInstrument[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is { symbol: string; mode?: unknown } =>
      Boolean(item) && typeof item === 'object' && typeof (item as { symbol?: unknown }).symbol === 'string',
    )
    .map((item) => ({ symbol: item.symbol, mode: item.mode === 'closeOnly' ? 'closeOnly' : 'trade' }))
}

export function validatePlatformInstrumentsShape(value: unknown): true | string {
  if (!Array.isArray(value)) return 'Ожидается список инструментов'
  const seen = new Set<string>()
  for (const item of value) {
    const symbol = (item as { symbol?: unknown } | null)?.symbol
    const mode = (item as { mode?: unknown } | null)?.mode
    if (typeof symbol !== 'string' || !SYMBOL_PATTERN.test(symbol)) {
      return `Некорректный символ: ${JSON.stringify(symbol)}`
    }
    if (!PLATFORM_INSTRUMENT_MODES.includes(mode as PlatformInstrumentMode)) {
      return `У ${symbol} неизвестный режим ${JSON.stringify(mode)}: допустимо «trade» или «closeOnly»`
    }
    if (seen.has(symbol)) return `${symbol} встречается в списке дважды`
    seen.add(symbol)
  }
  return true
}

export async function loadPlatformInstruments(api: Api, req?: PayloadRequest) {
  const doc = (await api.findGlobal({
    slug: PLATFORM_INSTRUMENTS_SLUG as never,
    depth: 0,
    ...(req ? { req } : {}),
  })) as { instruments?: unknown; version?: unknown; updatedAt?: unknown }
  return {
    instruments: readPlatformInstruments(doc?.instruments),
    version: typeof doc?.version === 'number' ? doc.version : 0,
    updatedAt: typeof doc?.updatedAt === 'string' ? doc.updatedAt : null,
  }
}

export function toPlatformInstrumentsDto(doc: {
  instruments?: unknown
  version?: unknown
  updatedAt?: unknown
}): PlatformInstrumentsDto {
  return {
    version: typeof doc.version === 'number' ? doc.version : 0,
    updatedAt: new Date(typeof doc.updatedAt === 'string' ? doc.updatedAt : 0).toISOString(),
    instruments: readPlatformInstruments(doc.instruments),
  }
}

export async function sitesUsingSymbols(api: Api, symbols: string[], req?: PayloadRequest) {
  const drop = new Set(symbols)
  const usage = new Map<string, string[]>()
  if (drop.size === 0) return usage
  const sites = await api.find({
    collection: 'sites',
    depth: 0,
    pagination: false,
    sort: 'slug',
    ...(req ? { req } : {}),
  })
  for (const site of sites.docs as { slug?: string; instruments?: unknown }[]) {
    if (!Array.isArray(site.instruments)) continue
    for (const symbol of site.instruments) {
      if (typeof symbol !== 'string' || !drop.has(symbol)) continue
      const list = usage.get(symbol) ?? []
      list.push(String(site.slug))
      usage.set(symbol, list)
    }
  }
  return usage
}

export type DisableCheck = { allowed: true } | { allowed: false; reason: string }

export async function checkOpenPositions(_symbols: string[]): Promise<DisableCheck> {
  return { allowed: true }
}

export async function validatePlatformInstrumentsChange(
  value: unknown,
  req: PayloadRequest,
): Promise<true | string> {
  const shape = validatePlatformInstrumentsShape(value)
  if (shape !== true) return shape
  const next = new Set(readPlatformInstruments(value).map((i) => i.symbol))
  const current = await loadPlatformInstruments(req.payload, req)
  const removed = current.instruments.map((i) => i.symbol).filter((s) => !next.has(s))
  if (removed.length === 0) return true

  const usage = await sitesUsingSymbols(req.payload, removed, req)
  if (usage.size > 0) {
    const lines = [...usage.entries()].map(([symbol, sites]) => `${symbol} (сайты: ${sites.join(', ')})`)
    return `Нельзя убрать из платформы инструменты, включённые сайтам: ${lines.join('; ')}. Сначала уберите их в карточках этих сайтов`
  }

  const positions = await checkOpenPositions(removed)
  if (!positions.allowed) return positions.reason
  return true
}

export async function validateSiteInstruments(value: unknown, req: PayloadRequest): Promise<true | string> {
  if (value === null || value === undefined) return true
  if (!Array.isArray(value) || value.some((s) => typeof s !== 'string')) {
    return 'Ожидается список символов'
  }
  if (value.length === 0) return true
  const platform = await loadPlatformInstruments(req.payload, req)
  const allowed = new Set(platform.instruments.map((i) => i.symbol))
  const outside = [...new Set(value as string[])].filter((s) => !allowed.has(s))
  if (outside.length === 0) return true
  return `Этих инструментов нет в «Инструментах платформы»: ${outside.join(', ')}. Сначала добавьте их в разделе «Инструменты платформы» или уберите у сайта`
}

export function platformWebhookTargets(env: NodeJS.ProcessEnv = process.env): { urls: string[]; secret: string | null } {
  const urls = (env.PLATFORM_INSTRUMENTS_WEBHOOK_URLS ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
  const secret = env.PLATFORM_INSTRUMENTS_WEBHOOK_SECRET || env.SITE_WEBHOOK_SECRET || null
  return { urls, secret }
}

export async function notifyPlatformInstruments(): Promise<void> {
  const { urls, secret } = platformWebhookTargets()
  if (urls.length === 0) return
  if (!secret) {
    console.warn('[platform-instruments] webhook skipped: PLATFORM_INSTRUMENTS_WEBHOOK_SECRET / SITE_WEBHOOK_SECRET not set')
    return
  }
  await Promise.all(urls.map((url) => sendWebhook(url, secret, [PLATFORM_INSTRUMENTS_TAG])))
}
