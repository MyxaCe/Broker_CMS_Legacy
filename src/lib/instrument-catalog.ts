export type InstrumentMode = 'trade' | 'closeOnly'

export interface CatalogItem {
  symbol: string
  name?: string
  category?: string | null
  segment?: string | null
  group?: string | null
  icon?: string | null
  provider?: string | null
  digits?: number
  platform?: string | null
}

export interface CatalogEntry {
  symbol: string
  name: string
  category: string
  segment: string | null
  segmentLabel: string | null
  hasIcon: boolean
  /** В каталоге MDS задан provider — у инструмента есть источник цен. */
  hasSource: boolean
  haystack: string
}

export interface SelectedRow {
  symbol: string
  mode: InstrumentMode
}

export const ALL = 'all'
export const NO_SEGMENT = ''
export const OTHER_CATEGORY = 'other'
export const LARGE_CATEGORY = 100
export const BULK_CONFIRM_THRESHOLD = 20

export const CATEGORIES: { id: string; label: string }[] = [
  { id: 'forex', label: 'Форекс' },
  { id: 'metals', label: 'Металлы' },
  { id: 'indices', label: 'Индексы' },
  { id: 'stocks', label: 'Акции' },
  { id: 'energy', label: 'Энергоносители' },
  { id: 'crypto', label: 'Крипто' },
  { id: OTHER_CATEGORY, label: 'Прочее' },
]

const CATEGORY_RANK = new Map(CATEGORIES.map((c, i) => [c.id, i]))

export const SEGMENT_LABELS: Record<string, string> = {
  major: 'Мажоры',
  minor: 'Миноры',
  exotic: 'Экзотика',
  america: 'Америка',
  europe: 'Европа',
  asia: 'Азия',
  oceania: 'Океания',
  africa: 'Африка',
  precious: 'Драгоценные',
  industrial: 'Промышленные',
  oil: 'Нефть',
  gas: 'Газ',
}

export function categoryOf(item: Pick<CatalogItem, 'category'>): string {
  const id = typeof item.category === 'string' ? item.category.toLowerCase() : ''
  return CATEGORY_RANK.has(id) ? id : OTHER_CATEGORY
}

export function categoryLabel(id: string): string {
  if (id === ALL) return 'Все'
  return CATEGORIES.find((c) => c.id === id)?.label ?? 'Прочее'
}

export function segmentLabel(segment: string | null | undefined, group?: string | null): string | null {
  if (!segment) return null
  const known = SEGMENT_LABELS[segment.toLowerCase()]
  if (known) return known
  if (group && group.includes(' — ')) return group.slice(group.lastIndexOf(' — ') + 3).trim() || segment
  return segment
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function buildCatalog(items: CatalogItem[]): CatalogEntry[] {
  const seen = new Set<string>()
  const entries: CatalogEntry[] = []
  for (const item of items) {
    if (!item || typeof item.symbol !== 'string' || seen.has(item.symbol)) continue
    seen.add(item.symbol)
    const name = typeof item.name === 'string' ? item.name : ''
    const segment = typeof item.segment === 'string' && item.segment ? item.segment : null
    entries.push({
      symbol: item.symbol,
      name,
      category: categoryOf(item),
      segment,
      segmentLabel: segmentLabel(segment, item.group),
      hasIcon: Boolean(item.icon),
      hasSource: typeof item.provider === 'string' && item.provider.trim() !== '',
      haystack: `${item.symbol.toLowerCase()}\u0000${name.toLowerCase()}`,
    })
  }
  const sizes = countByCategory(entries)
  const order = new Map(entries.map((e, i) => [e.symbol, i]))
  return entries.sort((a, b) => {
    const rank = CATEGORY_RANK.get(a.category)! - CATEGORY_RANK.get(b.category)!
    if (rank !== 0) return rank
    if ((sizes[a.category] ?? 0) > LARGE_CATEGORY) return compareSymbols(a.symbol, b.symbol)
    return order.get(a.symbol)! - order.get(b.symbol)!
  })
}

export function compareSymbols(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function countByCategory(entries: Pick<CatalogEntry, 'category'>[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const c of CATEGORIES) counts[c.id] = 0
  for (const e of entries) counts[e.category] = (counts[e.category] ?? 0) + 1
  return counts
}

export interface CategoryTab {
  id: string
  label: string
  count: number
  disabled: boolean
}

export function categoryTabs(entries: CatalogEntry[]): CategoryTab[] {
  const counts = countByCategory(entries)
  const tabs: CategoryTab[] = [{ id: ALL, label: categoryLabel(ALL), count: entries.length, disabled: entries.length === 0 }]
  for (const c of CATEGORIES) {
    const count = counts[c.id] ?? 0
    if (c.id === OTHER_CATEGORY && count === 0) continue
    tabs.push({ id: c.id, label: c.label, count, disabled: count === 0 })
  }
  return tabs
}

export interface SegmentChip {
  id: string
  label: string
  count: number
}

export function segmentChips(entries: CatalogEntry[], category: string): SegmentChip[] {
  if (category === ALL) return []
  const chips = new Map<string, SegmentChip>()
  let total = 0
  let withSegment = 0
  for (const e of entries) {
    if (e.category !== category) continue
    total++
    const id = e.segment ?? NO_SEGMENT
    if (e.segment) withSegment++
    const chip = chips.get(id)
    if (chip) chip.count++
    else chips.set(id, { id, label: e.segmentLabel ?? 'Без сегмента', count: 1 })
  }
  if (withSegment === 0) return []
  const known = Object.keys(SEGMENT_LABELS)
  const rank = (id: string) => {
    if (id === NO_SEGMENT) return Number.MAX_SAFE_INTEGER
    const i = known.indexOf(id.toLowerCase())
    return i === -1 ? known.length : i
  }
  const list = [...chips.values()].sort((a, b) => rank(a.id) - rank(b.id) || a.label.localeCompare(b.label, 'ru'))
  return [{ id: ALL, label: 'Все сегменты', count: total }, ...list]
}

export interface CatalogFilter {
  category: string
  segment: string
  query: string
  hideAdded: boolean
  added: ReadonlySet<string>
}

export function filterCatalog(entries: CatalogEntry[], filter: CatalogFilter): CatalogEntry[] {
  const q = normalizeQuery(filter.query)
  const anyCategory = filter.category === ALL
  const anySegment = anyCategory || filter.segment === ALL
  const out: CatalogEntry[] = []
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!
    if (!anyCategory && e.category !== filter.category) continue
    if (!anySegment && (e.segment ?? NO_SEGMENT) !== filter.segment) continue
    if (filter.hideAdded && filter.added.has(e.symbol)) continue
    if (q && !e.haystack.includes(q)) continue
    out.push(e)
  }
  return out
}

export const NO_SOURCE_LABEL = 'нет источника цен'
export const NO_SOURCE_HINT =
  'У инструмента нет источника цен в MDS. Терминал не знает таких символов и отклоняет весь список инструментов сайта — торговля закроется по всем инструментам'

export function addableSymbols(entries: CatalogEntry[], added: ReadonlySet<string>): string[] {
  const out: string[] = []
  for (const e of entries) if (!added.has(e.symbol) && e.hasSource) out.push(e.symbol)
  return out
}

/**
 * Выбранные символы, которые закроют торговлю на сайте: в каталоге без источника цен
 * или (когда каталог загружен) вовсе нет в каталоге.
 */
export function unpricedSymbols(
  rows: Pick<SelectedRow, 'symbol'>[],
  bySymbol: ReadonlyMap<string, Pick<CatalogEntry, 'hasSource'>>,
  catalogLoaded: boolean,
): string[] {
  if (!catalogLoaded) return []
  return rows.filter((r) => !bySymbol.get(r.symbol)?.hasSource).map((r) => r.symbol)
}

export function addSymbols(rows: SelectedRow[], symbols: string[]): SelectedRow[] {
  const present = new Set(rows.map((r) => r.symbol))
  const next = [...rows]
  for (const symbol of symbols) {
    if (present.has(symbol)) continue
    present.add(symbol)
    next.push({ symbol, mode: 'trade' })
  }
  return next
}

export function moveRow<T>(rows: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return rows
  const next = [...rows]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

export interface Highlight {
  text: string
  match: boolean
}

export function highlight(text: string, query: string): Highlight[] {
  const q = normalizeQuery(query)
  if (!q || !text) return text ? [{ text, match: false }] : []
  const lower = text.toLowerCase()
  const parts: Highlight[] = []
  let from = 0
  let at = lower.indexOf(q)
  while (at !== -1) {
    if (at > from) parts.push({ text: text.slice(from, at), match: false })
    parts.push({ text: text.slice(at, at + q.length), match: true })
    from = at + q.length
    at = lower.indexOf(q, from)
  }
  if (from < text.length) parts.push({ text: text.slice(from), match: false })
  return parts
}

export function letterOf(symbol: string): string {
  const c = symbol.charAt(0).toUpperCase()
  return c >= 'A' && c <= 'Z' ? c : '#'
}

export const ALPHABET = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']

export function letterIndex(entries: Pick<CatalogEntry, 'symbol'>[]): Map<string, number> {
  const index = new Map<string, number>()
  for (let i = 0; i < entries.length; i++) {
    const letter = letterOf(entries[i]!.symbol)
    if (!index.has(letter)) index.set(letter, i)
  }
  return index
}

export function isSortedBySymbol(entries: Pick<CatalogEntry, 'symbol'>[]): boolean {
  for (let i = 1; i < entries.length; i++) if (compareSymbols(entries[i - 1]!.symbol, entries[i]!.symbol) > 0) return false
  return true
}

export interface VisibleWindow {
  start: number
  end: number
}

export function visibleWindow(
  scrollTop: number,
  viewport: number,
  rowHeight: number,
  total: number,
  overscan = 8,
): VisibleWindow {
  if (total <= 0) return { start: 0, end: 0 }
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight)
  const count = Math.ceil(viewport / rowHeight)
  const start = Math.max(0, Math.min(first, total - 1) - overscan)
  const end = Math.min(total, first + count + overscan)
  return { start, end: Math.max(start, end) }
}

export interface SelectedGroup<T> {
  category: string
  label: string
  items: { row: SelectedRow; index: number; info: T }[]
  closeOnly: number
}

export function groupSelected<T extends { category: string }>(
  rows: SelectedRow[],
  describe: (symbol: string) => T,
): SelectedGroup<T>[] {
  const groups = new Map<string, SelectedGroup<T>>()
  rows.forEach((row, index) => {
    const info = describe(row.symbol)
    const category = info.category
    let group = groups.get(category)
    if (!group) {
      group = { category, label: categoryLabel(category), items: [], closeOnly: 0 }
      groups.set(category, group)
    }
    group.items.push({ row, index, info })
    if (row.mode === 'closeOnly') group.closeOnly++
  })
  const rank = (id: string) => CATEGORY_RANK.get(id) ?? CATEGORIES.length
  return [...groups.values()].sort((a, b) => rank(a.category) - rank(b.category))
}

export function neighbourInGroup(items: { index: number }[], position: number, step: -1 | 1): number | null {
  const target = items[position + step]
  return target ? target.index : null
}

export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

export function bulkAddMessage(adding: number, before: number, after: number): string {
  const word = plural(adding, ['инструмент', 'инструмента', 'инструментов'])
  const shared = adding - (after - before)
  const sharedNote =
    shared > 0
      ? ` ${shared} из них уже есть у других сайтов, новых подписок для них не будет.`
      : ''
  return (
    `Сайту будет добавлено ${adding} ${word}. Подписок у модуля рыночных данных по всей платформе станет ${after} ` +
    `(сейчас ${before}).${sharedNote} По каждому инструменту платформы модуль держит подписку у поставщика данных, ` +
    `и это может повысить тариф поставщика.`
  )
}

export function needsBulkConfirm(adding: number): boolean {
  return adding > BULK_CONFIRM_THRESHOLD
}

export function rowsFromSite(instruments: unknown, closeOnlyInstruments: unknown): SelectedRow[] {
  const closeOnly = new Set(Array.isArray(closeOnlyInstruments) ? closeOnlyInstruments : [])
  const seen = new Set<string>()
  const rows: SelectedRow[] = []
  if (!Array.isArray(instruments)) return rows
  for (const symbol of instruments) {
    if (typeof symbol !== 'string' || seen.has(symbol)) continue
    seen.add(symbol)
    rows.push({ symbol, mode: closeOnly.has(symbol) ? 'closeOnly' : 'trade' })
  }
  return rows
}

export function siteFieldsFromRows(rows: SelectedRow[]): { instruments: string[]; closeOnlyInstruments: string[] } {
  return {
    instruments: rows.map((r) => r.symbol),
    closeOnlyInstruments: rows.filter((r) => r.mode === 'closeOnly').map((r) => r.symbol),
  }
}

export interface PlatformUsage {
  symbol: string
  sites: (string | number)[]
}

export function symbolsOfOtherSites(usage: PlatformUsage[], siteId: string | number | null | undefined): Set<string> {
  const own = siteId === null || siteId === undefined ? null : String(siteId)
  const out = new Set<string>()
  for (const item of usage) if (item.sites.some((id) => String(id) !== own)) out.add(item.symbol)
  return out
}

export function platformSubscriptions(others: ReadonlySet<string>, ...lists: Iterable<string>[]): number {
  const all = new Set(others)
  for (const list of lists) for (const symbol of list) all.add(symbol)
  return all.size
}
