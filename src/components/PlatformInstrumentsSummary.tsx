'use client'

import React, { useEffect, useMemo, useState } from 'react'

import {
  loadMdsInstruments,
  loadPlatformSummary,
  MDS_FAILURE_TEXT,
  type MdsFailureReason,
  type PlatformSummary,
} from '@/lib/admin-mds'
import {
  ALL,
  buildCatalog,
  type CatalogEntry,
  type CatalogItem,
  categoryLabel,
  categoryTabs,
  filterCatalog,
  type InstrumentMode,
  OTHER_CATEGORY,
  plural,
  visibleWindow,
} from '@/lib/instrument-catalog'

import {
  badgeStyle,
  CategoryTabs,
  countStyle,
  ErrorBox,
  Icon,
  INSTRUMENT_FORMS,
  inputStyle,
  LIST_HEIGHT,
  listStyle,
  Marked,
  MODE_LABELS,
  modeColor,
  mutedText,
  noteStyle,
  panelStyle,
  ROW_HEIGHT,
  rowStyle,
} from './instrument-ui'

interface Row extends CatalogEntry {
  mode: InstrumentMode
  siteIds: (string | number)[]
}

const NO_ADDED: ReadonlySet<string> = new Set()
const TABLE_HEIGHT = LIST_HEIGHT + 120

export function PlatformInstrumentsSummary() {
  const [summary, setSummary] = useState<PlatformSummary | null>(null)
  const [summaryFailure, setSummaryFailure] = useState<MdsFailureReason | null>(null)
  const [raw, setRaw] = useState<CatalogItem[] | null>(null)
  const [catalogFailure, setCatalogFailure] = useState<MdsFailureReason | null>(null)
  const [category, setCategory] = useState(ALL)
  const [query, setQuery] = useState('')
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    let alive = true
    loadPlatformSummary().then((result) => {
      if (!alive) return
      if (result.state === 'ok') setSummary(result.summary)
      else setSummaryFailure(result.reason)
    })
    loadMdsInstruments<CatalogItem>('/admin-mds/instruments?all=1').then((result) => {
      if (!alive) return
      if (result.state === 'ok') setRaw(result.items)
      else setCatalogFailure(result.reason)
    })
    return () => {
      alive = false
    }
  }, [])

  const bySymbol = useMemo(() => new Map(buildCatalog(raw ?? []).map((e) => [e.symbol, e])), [raw])
  const sitesById = useMemo(() => new Map((summary?.sites ?? []).map((s) => [String(s.id), s])), [summary])
  const slugOf = (id: string | number) => sitesById.get(String(id))?.slug ?? String(id)

  const rows = useMemo<Row[]>(
    () =>
      (summary?.instruments ?? []).map((i) => {
        const entry: CatalogEntry = bySymbol.get(i.symbol) ?? {
          symbol: i.symbol,
          name: raw ? 'нет в каталоге MDS' : '',
          category: OTHER_CATEGORY,
          segment: null,
          segmentLabel: null,
          hasIcon: false,
          hasSource: false,
          haystack: i.symbol.toLowerCase(),
        }
        const slugs = i.sites.map((id) => sitesById.get(String(id))?.slug ?? String(id)).join(' ')
        return { ...entry, haystack: `${entry.haystack} ${slugs.toLowerCase()}`, mode: i.mode, siteIds: i.sites }
      }),
    [summary, bySymbol, sitesById, raw],
  )

  const tabs = useMemo(() => categoryTabs(rows), [rows])
  const shown = useMemo(
    () => filterCatalog(rows, { category, segment: ALL, query, hideAdded: false, added: NO_ADDED }) as Row[],
    [rows, category, query],
  )
  const { start, end } = visibleWindow(scrollTop, TABLE_HEIGHT, ROW_HEIGHT, shown.length)
  const closeOnly = rows.filter((r) => r.mode === 'closeOnly').length

  return (
    <div style={{ marginBottom: 'var(--base, 20px)' }}>
      <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--theme-elevation-600)' }}>
        <strong>Выбор делается в карточках сайтов.</strong> Здесь только просмотр: инструменты платформы — объединение
        инструментов всех сайтов, на этот список подписываются модуль рыночных данных и шлюз терминала. Режим у
        платформы — «Торговля», если хотя бы один сайт держит инструмент в торговле, иначе «Только закрытие».
      </p>

      {summaryFailure && <ErrorBox>{MDS_FAILURE_TEXT[summaryFailure]}</ErrorBox>}
      {catalogFailure && (
        <p style={{ fontSize: '12px', color: 'var(--theme-error-500, #d93025)' }}>
          {MDS_FAILURE_TEXT[catalogFailure]} Категории и названия не показаны.
        </p>
      )}
      {!summary && !summaryFailure && <p style={mutedText}>Загрузка…</p>}

      {summary && (
        <>
          <div style={{ ...noteStyle, marginBottom: '10px' }} data-total="platform">
            <div style={{ fontSize: '13px', color: 'var(--theme-elevation-800)', marginBottom: '4px' }}>
              Подписок у модуля: <strong>{rows.length}</strong>
              <span style={countStyle}>
                {' '}
                · торговля: {rows.length - closeOnly} · только закрытие: {closeOnly} · версия списка {summary.version} от{' '}
                {new Date(summary.updatedAt).toLocaleString('ru-RU')}
              </span>
            </div>
            Сайты:{' '}
            {summary.sites.map((s, k) => (
              <React.Fragment key={String(s.id)}>
                {k > 0 && ', '}
                <a href={`/admin/collections/sites/${s.id}`} style={{ color: 'inherit' }}>
                  {s.slug}
                </a>{' '}
                — {s.instruments} {plural(s.instruments, INSTRUMENT_FORMS)}
                {s.closeOnly > 0 ? ` (только закрытие: ${s.closeOnly})` : ''}
              </React.Fragment>
            ))}
            {summary.sites.length === 0 && 'пока нет'}
          </div>

          <div style={panelStyle} data-panel="summary">
            <CategoryTabs
              tabs={tabs}
              active={category}
              onChoose={(id) => {
                setCategory(id)
                setScrollTop(0)
              }}
            />
            <input
              type="search"
              placeholder="Поиск: символ, название или сайт…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setScrollTop(0)
              }}
              style={inputStyle}
            />
            <div
              style={{
                ...rowStyle,
                fontWeight: 600,
                color: 'var(--theme-elevation-500)',
                borderBottom: '1px solid var(--theme-elevation-150)',
              }}
            >
              <span style={{ width: '40px', flexShrink: 0 }}>№</span>
              <span style={{ flex: '2 1 0', minWidth: 0 }}>Символ</span>
              <span style={{ flex: '1 1 0', minWidth: 0 }}>Категория</span>
              <span style={{ width: '130px', flexShrink: 0 }}>Режим</span>
              <span style={{ flex: '2 1 0', minWidth: 0 }}>Какими сайтами включён</span>
            </div>
            <div
              key={`${category}|${query}`}
              style={{ ...listStyle, height: `${Math.min(TABLE_HEIGHT, Math.max(shown.length, 1) * ROW_HEIGHT + 2)}px` }}
              onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            >
              <div style={{ height: `${shown.length * ROW_HEIGHT}px`, position: 'relative' }}>
                {shown.slice(start, end).map((r, k) => (
                  <div
                    key={r.symbol}
                    style={{ ...rowStyle, position: 'absolute', top: `${(start + k) * ROW_HEIGHT}px`, left: 0, right: 0 }}
                  >
                    <span style={{ ...countStyle, width: '40px', flexShrink: 0 }}>{start + k + 1}</span>
                    <span
                      style={{
                        flex: '2 1 0',
                        minWidth: 0,
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Icon symbol={r.symbol} hasIcon={r.hasIcon} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <strong style={{ fontWeight: 600 }}>
                          <Marked text={r.symbol} query={query} />
                        </strong>
                        {r.name && (
                          <span style={{ color: 'var(--theme-elevation-500)' }}>
                            {' — '}
                            <Marked text={r.name} query={query} />
                          </span>
                        )}
                      </span>
                    </span>
                    <span style={{ ...mutedText, flex: '1 1 0', minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {[categoryLabel(r.category), r.segmentLabel].filter(Boolean).join(' · ')}
                    </span>
                    <span style={{ width: '130px', flexShrink: 0 }}>
                      <span style={badgeStyle(modeColor(r.mode))}>{MODE_LABELS[r.mode]}</span>
                    </span>
                    <span
                      style={{
                        flex: '2 1 0',
                        minWidth: 0,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.siteIds.map(slugOf).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <span style={mutedText}>
              {rows.length === 0
                ? 'Ни у одного сайта нет инструментов'
                : shown.length === rows.length
                  ? `Всего ${rows.length}`
                  : `Показано ${shown.length} из ${rows.length}`}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
