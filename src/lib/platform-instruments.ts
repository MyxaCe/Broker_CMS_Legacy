import { createHash } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
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

export interface SiteInstrumentsRow {
  id: number | string
  slug: string
  name?: string
  instruments?: unknown
  closeOnlyInstruments?: unknown
}

export interface PlatformState {
  version: number
  updatedAt: string
  instruments: PlatformInstrument[]
  changed: boolean
}

export const TERMINAL_PAIRS = [
  'BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD', 'ADAUSD', 'TRXUSD', 'AVAXUSD', 'LINKUSD',
  'DOTUSD', 'LTCUSD', 'BCHUSD', 'UNIUSD', 'ATOMUSD', 'XLMUSD', 'ETCUSD', 'NEARUSD', 'FILUSD', 'APTUSD',
  'ARBUSD', 'OPUSD', 'INJUSD', 'AAVEUSD', 'HBARUSD', 'VETUSD', 'ICPUSD', 'SHIBUSD', 'SANDUSD', 'MANAUSD',
] as const

const SYMBOL_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/

type Api = Pick<Payload, 'find'>

type SqlDb = { execute: (query: unknown) => Promise<{ rows: Record<string, unknown>[] }> }

export function readSymbols(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

function compareIds(a: number | string, b: number | string): number {
  const na = Number(a)
  const nb = Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0
}

function byId(sites: SiteInstrumentsRow[]): SiteInstrumentsRow[] {
  return [...sites].sort((a, b) => compareIds(a.id, b.id))
}

export function computePlatformInstruments(sites: SiteInstrumentsRow[]): PlatformInstrument[] {
  const modes = new Map<string, PlatformInstrumentMode>()
  for (const site of byId(sites)) {
    const closeOnly = new Set(readSymbols(site.closeOnlyInstruments))
    for (const symbol of readSymbols(site.instruments)) {
      const mode: PlatformInstrumentMode = closeOnly.has(symbol) ? 'closeOnly' : 'trade'
      if (modes.get(symbol) !== 'trade') modes.set(symbol, mode)
    }
  }
  return [...modes.entries()].map(([symbol, mode]) => ({ symbol, mode }))
}

export function platformInstrumentsHash(instruments: PlatformInstrument[]): string {
  return createHash('sha256')
    .update(JSON.stringify(instruments.map((i) => [i.symbol, i.mode])))
    .digest('hex')
}

export function sitesBySymbol(sites: SiteInstrumentsRow[]): Map<string, SiteInstrumentsRow[]> {
  const usage = new Map<string, SiteInstrumentsRow[]>()
  for (const site of byId(sites)) {
    for (const symbol of readSymbols(site.instruments)) {
      const list = usage.get(symbol) ?? []
      list.push(site)
      usage.set(symbol, list)
    }
  }
  return usage
}

export function withSiteInstruments(
  sites: SiteInstrumentsRow[],
  id: number | string | undefined | null,
  instruments: unknown,
  closeOnlyInstruments: unknown,
): SiteInstrumentsRow[] {
  const replaced = { id: id ?? Number.MAX_SAFE_INTEGER, slug: '', instruments, closeOnlyInstruments }
  if (id === undefined || id === null) return [...sites, replaced]
  let found = false
  const out = sites.map((site) => {
    if (String(site.id) !== String(id)) return site
    found = true
    return { ...site, instruments, closeOnlyInstruments }
  })
  return found ? out : [...out, replaced]
}

export function withoutSite(sites: SiteInstrumentsRow[], id: number | string): SiteInstrumentsRow[] {
  return sites.filter((site) => String(site.id) !== String(id))
}

export async function loadSiteInstruments(api: Api, req?: PayloadRequest): Promise<SiteInstrumentsRow[]> {
  const found = await api.find({
    collection: 'sites',
    depth: 0,
    pagination: false,
    sort: 'id',
    select: { slug: true, name: true, instruments: true, closeOnlyInstruments: true } as never,
    ...(req ? { req } : {}),
  })
  return (found.docs as unknown as SiteInstrumentsRow[]).map((site) => ({
    id: site.id,
    slug: String(site.slug ?? ''),
    name: typeof site.name === 'string' ? site.name : undefined,
    instruments: site.instruments,
    closeOnlyInstruments: site.closeOnlyInstruments,
  }))
}

async function database(payload: Payload, req?: PayloadRequest): Promise<SqlDb> {
  const adapter = payload.db as unknown as { drizzle: SqlDb; sessions?: Record<string, { db?: SqlDb }> }
  const id = req?.transactionID ? await req.transactionID : undefined
  return (id !== undefined && adapter.sessions?.[String(id)]?.db) || adapter.drizzle
}

function toIso(value: unknown): string {
  const date = value instanceof Date ? value : new Date(typeof value === 'string' ? value : 0)
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString()
}

function stateOf(row: Record<string, unknown> | undefined, instruments: PlatformInstrument[], changed: boolean): PlatformState {
  return { instruments, version: Number(row?.version ?? 0), updatedAt: toIso(row?.updated_at), changed }
}

export async function syncPlatformInstruments(payload: Payload, req?: PayloadRequest): Promise<PlatformState> {
  const instruments = computePlatformInstruments(await loadSiteInstruments(payload, req))
  const hash = platformInstrumentsHash(instruments)
  const db = await database(payload, req)
  const bumped = await db.execute(sql`
    UPDATE "platform_instruments"
    SET "version" = COALESCE("version", 0) + 1, "computed_hash" = ${hash}, "updated_at" = now()
    WHERE "id" = (SELECT min("id") FROM "platform_instruments") AND "computed_hash" IS DISTINCT FROM ${hash}
    RETURNING "version"::int AS "version", "updated_at"
  `)
  if (bumped.rows[0]) return stateOf(bumped.rows[0], instruments, true)
  const stored = await db.execute(sql`
    SELECT "version"::int AS "version", "updated_at" FROM "platform_instruments" ORDER BY "id" LIMIT 1
  `)
  if (stored.rows[0]) return stateOf(stored.rows[0], instruments, false)
  const created = await db.execute(sql`
    INSERT INTO "platform_instruments" ("instruments", "version", "computed_hash", "updated_at", "created_at")
    VALUES ('[]'::jsonb, 1, ${hash}, now(), now())
    RETURNING "version"::int AS "version", "updated_at"
  `)
  return stateOf(created.rows[0], instruments, true)
}

export function toPlatformInstrumentsDto(state: Pick<PlatformState, 'version' | 'updatedAt' | 'instruments'>): PlatformInstrumentsDto {
  return { version: state.version, updatedAt: state.updatedAt, instruments: state.instruments }
}

async function waitForCommit(payload: Payload, req?: PayloadRequest): Promise<void> {
  const id = req?.transactionID ? await req.transactionID : undefined
  if (id === undefined) return
  const sessions = (payload.db as unknown as { sessions?: Record<string, unknown> }).sessions
  for (let i = 0; i < 400 && sessions?.[String(id)]; i++) await new Promise((resolve) => setTimeout(resolve, 25))
}

export async function refreshPlatformInstruments(payload: Payload, req?: PayloadRequest): Promise<PlatformState> {
  const state = await syncPlatformInstruments(payload, req)
  if (state.changed) {
    const targets = platformWebhookTargets()
    void waitForCommit(payload, req)
      .then(() => notifyPlatformInstruments(targets))
      .catch((error) => console.warn('[platform-instruments] webhook failed:', error))
  }
  return state
}

export type DisableCheck = { allowed: true } | { allowed: false; reason: string }

export const EXPOSURE_TIMEOUT_MS = 3_000

export const EXPOSURE_UNAVAILABLE_ERROR =
  'Не удалось проверить открытые позиции и отложенные ордера по убираемым инструментам, попробуйте позже'

type Exposure = { symbol: string; openPositions: number; pendingOrders: number }

async function fetchExposure(base: string, token: string, symbol: string): Promise<Exposure> {
  const res = await fetch(`${base}/internal/instruments/${encodeURIComponent(symbol)}/exposure`, {
    headers: { 'X-Internal-Token': token },
    signal: AbortSignal.timeout(EXPOSURE_TIMEOUT_MS),
  })
  if (res.status !== 200) throw new Error(`${symbol}: HTTP ${res.status}`)
  const body = (await res.json()) as Partial<Exposure>
  const openPositions = Number(body.openPositions)
  const pendingOrders = Number(body.pendingOrders)
  if (!Number.isFinite(openPositions) || !Number.isFinite(pendingOrders)) throw new Error(`${symbol}: bad body`)
  return { symbol, openPositions, pendingOrders }
}

export async function checkOpenPositions(symbols: string[], env: Record<string, string | undefined> = process.env): Promise<DisableCheck> {
  const base = env.TERMINAL_INTERNAL_URL?.trim().replace(/\/+$/, '')
  const token = env.TERMINAL_INTERNAL_TOKEN?.trim()
  if (!base && !token) {
    console.warn('[platform-instruments] exposure check skipped: TERMINAL_INTERNAL_URL / TERMINAL_INTERNAL_TOKEN not set')
    return { allowed: true }
  }
  if (!base || !token) {
    console.error('[platform-instruments] exposure check misconfigured: set both TERMINAL_INTERNAL_URL and TERMINAL_INTERNAL_TOKEN')
    return { allowed: false, reason: EXPOSURE_UNAVAILABLE_ERROR }
  }
  if (symbols.length === 0) return { allowed: true }
  let results: Exposure[]
  try {
    results = await Promise.all(symbols.map((symbol) => fetchExposure(base, token, symbol)))
  } catch (error) {
    console.error('[platform-instruments] exposure check failed:', error)
    return { allowed: false, reason: EXPOSURE_UNAVAILABLE_ERROR }
  }
  const busy = results.filter((r) => r.openPositions > 0 || r.pendingOrders > 0)
  if (busy.length === 0) return { allowed: true }
  const details = busy.map((r) => `${r.symbol} — открытых позиций: ${r.openPositions}, отложенных ордеров: ${r.pendingOrders}`)
  return {
    allowed: false,
    reason:
      `Нельзя убрать из платформы инструменты, по которым у клиентов есть открытые позиции или отложенные ордера: ${details.join('; ')}. ` +
      'Сначала переведите эти инструменты в «Только закрытие», дождитесь закрытия позиций и отмены ордеров, затем уберите их',
  }
}

export const platformChecks = { openPositions: checkOpenPositions }

export function validateSymbolList(value: unknown): true | string {
  if (value === null || value === undefined) return true
  if (!Array.isArray(value)) return 'Ожидается список символов'
  const seen = new Set<string>()
  for (const symbol of value) {
    if (typeof symbol !== 'string' || !SYMBOL_PATTERN.test(symbol)) return `Некорректный символ: ${JSON.stringify(symbol)}`
    if (seen.has(symbol)) return `${symbol} встречается в списке дважды`
    seen.add(symbol)
  }
  return true
}

export const EMPTY_PLATFORM_ERROR =
  'Так сохранить нельзя: ни у одного сайта не останется инструментов, и список инструментов платформы станет пустым. Модуль рыночных данных пустой список не применит, а цены пропадут на всех сайтах. Оставьте сайту хотя бы один инструмент или сначала включите инструменты другому сайту'

export async function checkPlatformChange(
  req: PayloadRequest,
  nextSites: (sites: SiteInstrumentsRow[]) => SiteInstrumentsRow[],
  checkPositions: boolean,
): Promise<true | string> {
  const sites = await loadSiteInstruments(req.payload, req)
  const current = computePlatformInstruments(sites)
  const next = computePlatformInstruments(nextSites(sites))
  if (current.length > 0 && next.length === 0) return EMPTY_PLATFORM_ERROR
  if (!checkPositions) return true
  const remaining = new Set(next.map((i) => i.symbol))
  const vanishing = current.map((i) => i.symbol).filter((s) => !remaining.has(s))
  if (vanishing.length === 0) return true
  const positions = await platformChecks.openPositions(vanishing)
  return positions.allowed ? true : positions.reason
}

export async function validateSiteInstruments(
  value: unknown,
  options: { req: PayloadRequest; id?: number | string; siblingData?: Record<string, unknown>; event?: string },
): Promise<true | string> {
  const shape = validateSymbolList(value)
  if (shape !== true) return shape
  const { req, id, siblingData, event } = options
  return checkPlatformChange(
    req,
    (sites) => withSiteInstruments(sites, id, value ?? [], siblingData?.closeOnlyInstruments),
    event !== 'onChange',
  )
}

export function validateCloseOnlyInstruments(value: unknown, siblingData?: Record<string, unknown>): true | string {
  const shape = validateSymbolList(value)
  if (shape !== true) return shape
  const enabled = new Set(readSymbols(siblingData?.instruments))
  const outside = readSymbols(value).filter((s) => !enabled.has(s))
  if (outside.length === 0) return true
  return `«Только закрытие» можно поставить только инструментам этого сайта, а ${outside.join(', ')} у сайта не включены`
}

export function platformWebhookTargets(env: NodeJS.ProcessEnv = process.env): { urls: string[]; secret: string | null } {
  const urls = (env.PLATFORM_INSTRUMENTS_WEBHOOK_URLS ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
  const secret = env.PLATFORM_INSTRUMENTS_WEBHOOK_SECRET || env.SITE_WEBHOOK_SECRET || null
  return { urls, secret }
}

export async function notifyPlatformInstruments(
  targets: { urls: string[]; secret: string | null } = platformWebhookTargets(),
): Promise<void> {
  const { urls, secret } = targets
  if (urls.length === 0) return
  if (!secret) {
    console.warn('[platform-instruments] webhook skipped: PLATFORM_INSTRUMENTS_WEBHOOK_SECRET / SITE_WEBHOOK_SECRET not set')
    return
  }
  await Promise.all(urls.map((url) => sendWebhook(url, secret, [PLATFORM_INSTRUMENTS_TAG])))
}
