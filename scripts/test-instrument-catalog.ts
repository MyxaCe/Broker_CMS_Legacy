import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'

import {
  addableSymbols,
  addSymbols,
  ALL,
  buildCatalog,
  bulkAddMessage,
  type CatalogItem,
  categoryLabel,
  categoryTabs,
  filterCatalog,
  groupSelected,
  highlight,
  isSortedBySymbol,
  letterIndex,
  moveRow,
  needsBulkConfirm,
  neighbourInGroup,
  NO_SEGMENT,
  plural,
  segmentChips,
  segmentLabel,
  type SelectedRow,
  visibleWindow,
} from '../src/lib/instrument-catalog'

let failures = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    console.info(`OK    ${name}`)
  } catch (error) {
    failures++
    console.info(`FAIL  ${name}\n      ${error instanceof Error ? error.message : String(error)}`)
  }
}

const STAND: CatalogItem[] = [
  { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'forex', segment: 'major', group: 'Валюта — Мажоры' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', category: 'forex', segment: 'major', group: 'Валюта — Мажоры' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', category: 'forex', segment: 'major', group: 'Валюта — Мажоры' },
  { symbol: 'EURGBP', name: 'Euro / British Pound', category: 'forex', segment: 'minor', group: 'Валюта — Миноры' },
  { symbol: 'USDTRY', name: 'US Dollar / Turkish Lira', category: 'forex', segment: 'exotic', group: 'Валюта — Экзотика' },
  { symbol: 'XAUUSD', name: 'Gold', category: 'metals', segment: null, group: 'Металлы' },
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'stocks', segment: 'america', group: 'Акции — Америка' },
  { symbol: 'SPX500', name: 'S&P 500', category: 'indices', segment: 'america', group: 'Индексы — Америка' },
  { symbol: 'DE40', name: 'DAX 40', category: 'indices', segment: 'europe', group: 'Индексы — Европа' },
  { symbol: 'NIKKEI', name: 'Nikkei 225', category: 'indices', segment: 'japan', group: 'Индексы — Япония' },
  { symbol: 'BTCUSD', name: 'Bitcoin', category: 'crypto', segment: null, group: 'Криптовалюты', icon: '/icons/BTCUSD.svg' },
  { symbol: 'ETHUSD', name: 'Ethereum', category: 'crypto', segment: null, group: 'Криптовалюты' },
  { symbol: 'WEIRD', name: 'Без категории', category: 'bonds', segment: null },
]

function crypto(n: number): CatalogItem[] {
  const out: CatalogItem[] = []
  for (let i = 0; i < n; i++) {
    const letters = String.fromCharCode(90 - (i % 26)) + String.fromCharCode(65 + ((i * 7) % 26))
    out.push({ symbol: `${letters}${i}USD`, name: `Coin ${i}`, category: 'crypto', segment: null, group: 'Криптовалюты' })
  }
  return out
}

function universe(n: number): CatalogItem[] {
  const cats = ['crypto', 'forex', 'metals', 'indices', 'stocks', 'energy']
  const segs: Record<string, (string | null)[]> = {
    crypto: [null],
    forex: ['major', 'minor', 'exotic'],
    metals: [null],
    indices: ['america', 'europe', 'asia'],
    stocks: ['america', 'europe', 'asia'],
    energy: [null],
  }
  const out: CatalogItem[] = []
  for (let i = 0; i < n; i++) {
    const category = cats[i % cats.length]!
    const s = segs[category]!
    out.push({
      symbol: `SYM${i.toString(36).toUpperCase()}X`,
      name: `${category} instrument number ${i}`,
      category,
      segment: s[Math.floor(i / cats.length) % s.length]!,
    })
  }
  return out
}

const none = new Set<string>()

check('категории: одна таблица русских названий, неизвестная → «Прочее»', () => {
  assert.equal(categoryLabel('forex'), 'Форекс')
  assert.equal(categoryLabel('energy'), 'Энергоносители')
  assert.equal(categoryLabel('crypto'), 'Крипто')
  assert.equal(categoryLabel(ALL), 'Все')
  const cat = buildCatalog(STAND)
  assert.equal(cat.find((e) => e.symbol === 'WEIRD')?.category, 'other')
})

check('вкладки: «Все» первой, затем форекс…крипто, пустые неактивны со счётчиком 0, «Прочее» только если есть', () => {
  const tabs = categoryTabs(buildCatalog(STAND))
  assert.deepEqual(
    tabs.map((t) => `${t.id}:${t.count}:${t.disabled ? 'off' : 'on'}`),
    ['all:13:on', 'forex:5:on', 'metals:1:on', 'indices:3:on', 'stocks:1:on', 'energy:0:off', 'crypto:2:on', 'other:1:on'],
  )
  const clean = categoryTabs(buildCatalog(STAND.filter((i) => i.symbol !== 'WEIRD')))
  assert.ok(!clean.some((t) => t.id === 'other'))
  assert.equal(categoryTabs(buildCatalog([]))[0]!.disabled, true)
})

check('сегменты: подписи из таблицы, иначе из group, порядок мажоры→миноры→экзотика, «все сегменты» первым', () => {
  const cat = buildCatalog(STAND)
  assert.deepEqual(
    segmentChips(cat, 'forex').map((c) => `${c.label} ${c.count}`),
    ['Все сегменты 5', 'Мажоры 3', 'Миноры 1', 'Экзотика 1'],
  )
  assert.deepEqual(
    segmentChips(cat, 'indices').map((c) => c.label),
    ['Все сегменты', 'Америка', 'Европа', 'Япония'],
  )
  assert.deepEqual(segmentChips(cat, 'crypto'), [])
  assert.deepEqual(segmentChips(cat, ALL), [])
  assert.equal(segmentLabel('latam', 'Акции — Латинская Америка'), 'Латинская Америка')
  assert.equal(segmentLabel('latam', null), 'latam')
  assert.equal(segmentLabel(null, 'Криптовалюты'), null)
})

check('сегмент «без сегмента» рядом с размеченными', () => {
  const cat = buildCatalog([...STAND, { symbol: 'TSLA', name: 'Tesla', category: 'stocks', segment: null }])
  const chips = segmentChips(cat, 'stocks')
  assert.deepEqual(chips.map((c) => c.id), [ALL, 'america', NO_SEGMENT])
  const only = filterCatalog(cat, { category: 'stocks', segment: NO_SEGMENT, query: '', hideAdded: false, added: none })
  assert.deepEqual(only.map((e) => e.symbol), ['TSLA'])
})

check('фильтр: категория, сегмент, поиск по символу и названию без учёта регистра', () => {
  const cat = buildCatalog(STAND)
  const f = (category: string, segment: string, query: string) =>
    filterCatalog(cat, { category, segment, query, hideAdded: false, added: none }).map((e) => e.symbol)
  assert.deepEqual(f('forex', 'major', ''), ['EURUSD', 'GBPUSD', 'USDJPY'])
  assert.deepEqual(f('forex', ALL, 'pound'), ['GBPUSD', 'EURGBP'])
  assert.deepEqual(f('forex', ALL, '  EUR '), ['EURUSD', 'EURGBP'])
  assert.deepEqual(f(ALL, 'major', 'bitcoin'), ['BTCUSD'])
  assert.deepEqual(f('crypto', ALL, 'eur'), [])
  assert.deepEqual(f(ALL, ALL, 'usd').length, 7)
})

check('скрыть добавленные; «Добавить все показанные» берёт только недобавленные', () => {
  const cat = buildCatalog(STAND)
  const added = new Set(['EURUSD'])
  const shown = filterCatalog(cat, { category: 'forex', segment: 'major', query: '', hideAdded: false, added })
  assert.equal(shown.length, 3)
  assert.deepEqual(addableSymbols(shown, added), ['GBPUSD', 'USDJPY'])
  const hidden = filterCatalog(cat, { category: 'forex', segment: 'major', query: '', hideAdded: true, added })
  assert.deepEqual(hidden.map((e) => e.symbol), ['GBPUSD', 'USDJPY'])
})

check('порядок: малые категории — как в MDS, большие (>100) — по символу; дубликаты отброшены', () => {
  const cat = buildCatalog([...STAND, ...crypto(150), STAND[0]!])
  const fx = cat.filter((e) => e.category === 'forex').map((e) => e.symbol)
  assert.deepEqual(fx, ['EURUSD', 'GBPUSD', 'USDJPY', 'EURGBP', 'USDTRY'])
  const cr = cat.filter((e) => e.category === 'crypto')
  assert.equal(cr.length, 152)
  assert.ok(isSortedBySymbol(cr))
  assert.equal(cat.filter((e) => e.symbol === 'EURUSD').length, 1)
  assert.equal(cat[0]!.category, 'forex')
})

check('A–Z: первая строка на букву, цифры — в «#»', () => {
  const idx = letterIndex([{ symbol: '1INCHUSD' }, { symbol: 'AAVEUSD' }, { symbol: 'ADAUSD' }, { symbol: 'BTCUSD' }])
  assert.deepEqual([...idx.entries()], [['#', 0], ['A', 1], ['B', 3]])
})

check('подсветка: все вхождения, регистр исходника сохранён', () => {
  assert.deepEqual(highlight('EURUSD', 'us'), [
    { text: 'EUR', match: false },
    { text: 'US', match: true },
    { text: 'D', match: false },
  ])
  assert.deepEqual(highlight('Euro / US Dollar', 'o'), [
    { text: 'Eur', match: false },
    { text: 'o', match: true },
    { text: ' / US D', match: false },
    { text: 'o', match: true },
    { text: 'llar', match: false },
  ])
  assert.deepEqual(highlight('BTC', ''), [{ text: 'BTC', match: false }])
  assert.deepEqual(highlight('', 'x'), [])
})

check('виртуализация: окно строк с запасом и в границах списка', () => {
  assert.deepEqual(visibleWindow(0, 440, 32, 5000, 8), { start: 0, end: 22 })
  assert.deepEqual(visibleWindow(3200, 440, 32, 5000, 8), { start: 92, end: 122 })
  assert.deepEqual(visibleWindow(999999, 440, 32, 50, 8), { start: 41, end: 50 })
  assert.deepEqual(visibleWindow(0, 440, 32, 0), { start: 0, end: 0 })
})

check('правая панель: группы по категориям в порядке вкладок, внутри — прежний порядок, счётчик закрытия', () => {
  const cat = new Map(buildCatalog(STAND).map((e) => [e.symbol, e]))
  const rows: SelectedRow[] = [
    { symbol: 'BTCUSD', mode: 'trade' },
    { symbol: 'EURUSD', mode: 'trade' },
    { symbol: 'ETHUSD', mode: 'closeOnly' },
    { symbol: 'GONE', mode: 'trade' },
    { symbol: 'USDJPY', mode: 'trade' },
  ]
  const groups = groupSelected(rows, (s) => cat.get(s) ?? { category: 'other' })
  assert.deepEqual(
    groups.map((g) => `${g.label}:${g.items.map((i) => i.row.symbol).join(',')}:${g.closeOnly}`),
    ['Форекс:EURUSD,USDJPY:0', 'Крипто:BTCUSD,ETHUSD:1', 'Прочее:GONE:0'],
  )
  const crypto = groups[1]!
  assert.equal(neighbourInGroup(crypto.items, 0, -1), null)
  assert.equal(neighbourInGroup(crypto.items, 0, 1), 2)
})

check('перестановка внутри категории не меняет взаимный порядок других категорий', () => {
  const rows = ['BTC', 'EUR', 'ETH', 'GBP', 'SOL'].map((symbol) => ({ symbol, mode: 'trade' as const }))
  const moved = moveRow(rows, 4, 0).map((r) => r.symbol)
  assert.deepEqual(moved, ['SOL', 'BTC', 'EUR', 'ETH', 'GBP'])
  assert.deepEqual(moved.filter((s) => s === 'EUR' || s === 'GBP'), ['EUR', 'GBP'])
  assert.equal(moveRow(rows, 1, 1), rows)
  assert.equal(moveRow(rows, -1, 2), rows)
})

check('добавление: без дублей, режим «Торговля», порядок прежних не меняется', () => {
  const rows: SelectedRow[] = [{ symbol: 'BTCUSD', mode: 'closeOnly' }]
  assert.deepEqual(addSymbols(rows, ['EURUSD', 'BTCUSD', 'EURUSD', 'XAUUSD']), [
    { symbol: 'BTCUSD', mode: 'closeOnly' },
    { symbol: 'EURUSD', mode: 'trade' },
    { symbol: 'XAUUSD', mode: 'trade' },
  ])
})

check('массовое добавление: подтверждение при N > 20, текст про подписки и тариф', () => {
  assert.equal(needsBulkConfirm(20), false)
  assert.equal(needsBulkConfirm(21), true)
  const text = bulkAddMessage(523, 30)
  assert.ok(text.includes('523 инструмента'), text)
  assert.ok(text.includes('станет 553'), text)
  assert.ok(text.includes('сейчас 30'), text)
  assert.ok(text.includes('тариф поставщика'), text)
  assert.equal(plural(1, ['инструмент', 'инструмента', 'инструментов']), 'инструмент')
  assert.equal(plural(11, ['инструмент', 'инструмента', 'инструментов']), 'инструментов')
  assert.equal(plural(22, ['инструмент', 'инструмента', 'инструментов']), 'инструмента')
  assert.equal(plural(25, ['инструмент', 'инструмента', 'инструментов']), 'инструментов')
})

check('производительность: 5000 элементов — сборка < 100 мс, фильтр + поиск < 10 мс на нажатие', () => {
  const items = universe(5000)
  const t0 = performance.now()
  const cat = buildCatalog(items)
  const build = performance.now() - t0
  const added = new Set(items.slice(0, 1500).map((i) => i.symbol))
  const queries = ['', 's', 'sy', 'sym', 'sym1', 'number 4', 'FOREX', 'zz-nothing']
  const categories = [ALL, 'crypto', 'forex', 'stocks']
  for (let i = 0; i < 5; i++) filterCatalog(cat, { category: ALL, segment: ALL, query: 'x', hideAdded: true, added })
  let runs = 0
  const t1 = performance.now()
  for (const category of categories) {
    for (const query of queries) {
      for (const hideAdded of [false, true]) {
        const shown = filterCatalog(cat, { category, segment: ALL, query, hideAdded, added })
        addableSymbols(shown, added)
        if (category !== ALL) letterIndex(shown)
        runs++
      }
    }
  }
  const perRun = (performance.now() - t1) / runs
  console.info(`      сборка каталога 5000: ${build.toFixed(1)} мс; фильтр+поиск: ${perRun.toFixed(2)} мс на нажатие (${runs} прогонов)`)
  assert.equal(cat.length, 5000)
  assert.ok(build < 100, `сборка ${build.toFixed(1)} мс`)
  assert.ok(perRun < 10, `фильтр ${perRun.toFixed(2)} мс`)
  const forex = filterCatalog(cat, { category: 'forex', segment: 'major', query: 'number', hideAdded: false, added: none })
  assert.ok(forex.length > 0 && forex.every((e) => e.category === 'forex' && e.segment === 'major'))
})

console.info(failures ? `\n${failures} FAILURES` : '\nALL OK')
process.exit(failures ? 1 : 0)
