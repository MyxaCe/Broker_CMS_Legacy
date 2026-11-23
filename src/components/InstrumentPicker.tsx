'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

import { loadMdsInstruments, MDS_FAILURE_TEXT, type MdsFailureReason } from '@/lib/admin-mds'
import {
  addableSymbols,
  addSymbols,
  ALL,
  ALPHABET,
  buildCatalog,
  bulkAddMessage,
  type CatalogEntry,
  type CatalogItem,
  categoryLabel,
  categoryTabs,
  filterCatalog,
  groupSelected,
  type InstrumentMode,
  isSortedBySymbol,
  LARGE_CATEGORY,
  letterIndex,
  moveRow,
  needsBulkConfirm,
  neighbourInGroup,
  NO_SOURCE_HINT,
  NO_SOURCE_LABEL,
  normalizeQuery,
  OTHER_CATEGORY,
  platformSubscriptions,
  plural,
  segmentChips,
  type SelectedRow,
  unpricedSymbols,
  visibleWindow,
} from '@/lib/instrument-catalog'

import {
  badgeStyle,
  buttonStyle,
  CategoryTabs,
  chipStyle,
  countStyle,
  disabledButton,
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
  primaryButton,
  ROW_HEIGHT,
  rowStyle,
} from './instrument-ui'

const GROUP_PORTION = 200
const COLLAPSE_ABOVE = 100

export interface InstrumentPickerProps {
  label: string
  description: React.ReactNode
  rows: SelectedRow[]
  onChange: (rows: SelectedRow[]) => void
  others: ReadonlySet<string> | null
  othersNote?: string | null
  errorMessage?: string | null
}

function CatalogList({
  items,
  query,
  modes,
  others,
  onAdd,
  scrollRef,
  resetKey,
  showCategory,
}: {
  items: CatalogEntry[]
  query: string
  modes: ReadonlyMap<string, InstrumentMode>
  others: ReadonlySet<string> | null
  onAdd: (symbol: string) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
  resetKey: string
  showCategory: boolean
}) {
  const [scrollTop, setScrollTop] = useState(0)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setScrollTop(0)
  }, [resetKey, scrollRef])
  const { start, end } = visibleWindow(scrollTop, LIST_HEIGHT, ROW_HEIGHT, items.length)
  return (
    <div ref={scrollRef} style={listStyle} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ height: `${items.length * ROW_HEIGHT}px`, position: 'relative' }}>
        {items.slice(start, end).map((i, k) => {
          const mode = modes.get(i.symbol)
          const elsewhere = !mode && Boolean(others?.has(i.symbol))
          return (
            <div
              key={i.symbol}
              style={{ ...rowStyle, position: 'absolute', top: `${(start + k) * ROW_HEIGHT}px`, left: 0, right: 0 }}
            >
              <Icon symbol={i.symbol} hasIcon={i.hasIcon} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                <strong style={{ fontWeight: 600 }}>
                  <Marked text={i.symbol} query={query} />
                </strong>
                {i.name && (
                  <span style={{ color: 'var(--theme-elevation-500)' }}>
                    {' — '}
                    <Marked text={i.name} query={query} />
                  </span>
                )}
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {(showCategory || i.segmentLabel) && (
                  <span style={mutedText}>
                    {[showCategory ? categoryLabel(i.category) : null, i.segmentLabel].filter(Boolean).join(' · ')}
                  </span>
                )}
                {mode && <span style={badgeStyle(modeColor(mode))}>на сайте · {MODE_LABELS[mode]}</span>}
                {!mode && !i.hasSource && (
                  <span style={badgeStyle('var(--theme-error-500)')} title={NO_SOURCE_HINT}>
                    {NO_SOURCE_LABEL}
                  </span>
                )}
                {elsewhere && (
                  <span
                    style={badgeStyle('var(--theme-elevation-500)')}
                    title="Уже есть у других сайтов: новой подписки у модуля не будет"
                  >
                    в платформе
                  </span>
                )}
                <button
                  type="button"
                  style={{ ...buttonStyle, ...(mode || !i.hasSource ? disabledButton : {}) }}
                  disabled={Boolean(mode) || !i.hasSource}
                  aria-label={`Добавить ${i.symbol}`}
                  title={mode ? 'Уже на сайте' : i.hasSource ? 'Добавить сайту' : NO_SOURCE_HINT}
                  onClick={() => onAdd(i.symbol)}
                >
                  Добавить
                </button>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function InstrumentPicker({ label, description, rows, onChange, others, othersNote, errorMessage }: InstrumentPickerProps) {
  const modes = useMemo(() => new Map(rows.map((r) => [r.symbol, r.mode])), [rows])
  const selected = useMemo(() => new Set(modes.keys()), [modes])

  const [raw, setRaw] = useState<CatalogItem[] | null>(null)
  const [failure, setFailure] = useState<MdsFailureReason | null>(null)
  const [category, setCategory] = useState(ALL)
  const [segment, setSegment] = useState(ALL)
  const [query, setQuery] = useState('')
  const [hideAdded, setHideAdded] = useState(false)
  const [pending, setPending] = useState<string[] | null>(null)
  const [chosenQuery, setChosenQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [portions, setPortions] = useState<Record<string, number>>({})
  const [drag, setDrag] = useState<{ index: number; category: string } | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let alive = true
    loadMdsInstruments<CatalogItem>('/admin-mds/instruments?all=1').then((result) => {
      if (!alive) return
      if (result.state === 'ok') setRaw(result.items)
      else setFailure(result.reason)
    })
    return () => {
      alive = false
    }
  }, [])

  const catalog = useMemo(() => buildCatalog(raw ?? []), [raw])
  const bySymbol = useMemo(() => new Map(catalog.map((e) => [e.symbol, e])), [catalog])
  const tabs = useMemo(() => categoryTabs(catalog), [catalog])
  const chips = useMemo(() => segmentChips(catalog, category), [catalog, category])
  const shown = useMemo(
    () => filterCatalog(catalog, { category, segment, query, hideAdded, added: selected }),
    [catalog, category, segment, query, hideAdded, selected],
  )
  const addable = useMemo(() => addableSymbols(shown, selected), [shown, selected])
  const activeTab = tabs.find((t) => t.id === category)
  const letters = useMemo(
    () =>
      category !== ALL && (activeTab?.count ?? 0) > LARGE_CATEGORY && isSortedBySymbol(shown) ? letterIndex(shown) : null,
    [category, activeTab, shown],
  )

  const subscriptions = others ? platformSubscriptions(others, selected) : null

  const describe = (symbol: string): CatalogEntry =>
    bySymbol.get(symbol) ?? {
      symbol,
      name: raw ? 'нет в каталоге MDS' : '',
      category: OTHER_CATEGORY,
      segment: null,
      segmentLabel: null,
      hasIcon: false,
      hasSource: false,
      haystack: symbol.toLowerCase(),
    }

  const chosenFilter = normalizeQuery(chosenQuery)
  const filtering = Boolean(chosenFilter)
  const groups = groupSelected(rows, describe).map((g) => ({
    ...g,
    visible: filtering ? g.items.filter(({ info }) => info.haystack.includes(chosenFilter)) : g.items,
  }))

  const add = (symbols: string[]) => onChange(addSymbols(rows, symbols))
  const remove = (symbol: string) => onChange(rows.filter((r) => r.symbol !== symbol))
  const unpriced = unpricedSymbols(rows, bySymbol, raw !== null)
  const unpricedSet = new Set(unpriced)
  const removeUnpriced = () => onChange(rows.filter((r) => !unpricedSet.has(r.symbol)))
  const setMode = (symbol: string, mode: InstrumentMode) =>
    onChange(rows.map((r) => (r.symbol === symbol ? { ...r, mode } : r)))
  const move = (from: number, to: number) => {
    const next = moveRow(rows, from, to)
    if (next !== rows) onChange(next)
  }

  const requestBulk = () => {
    if (addable.length === 0) return
    if (needsBulkConfirm(addable.length)) setPending(addable)
    else add(addable)
  }

  const chooseCategory = (id: string) => {
    setCategory(id)
    setSegment(ALL)
    setPending(null)
  }

  const jumpTo = (letter: string) => {
    const index = letters?.get(letter)
    if (index === undefined || !listRef.current) return
    listRef.current.scrollTop = index * ROW_HEIGHT
  }

  const closeOnlyCount = rows.filter((r) => r.mode === 'closeOnly').length
  const resetKey = `${category}|${segment}|${normalizeQuery(query)}|${hideAdded}`

  return (
    <div style={{ marginBottom: 'var(--base, 20px)' }}>
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>{label}</label>
      <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--theme-elevation-500)' }}>{description}</p>

      <div style={{ ...noteStyle, marginBottom: '10px' }} data-total="platform">
        <div style={{ fontSize: '13px', color: 'var(--theme-elevation-800)', marginBottom: '2px' }}>
          Подписок у модуля всего: <strong>{subscriptions ?? '—'}</strong> (с учётом всех сайтов)
        </div>
        {othersNote ??
          'Каждый инструмент, включённый хотя бы одному сайту, в том числе «Только закрытие», — подписка модуля рыночных данных у поставщика. От их числа зависят нагрузка на модуль и тариф поставщика.'}
      </div>

      {errorMessage && <ErrorBox>{errorMessage}</ErrorBox>}

      {failure && (
        <p style={{ fontSize: '12px', color: 'var(--theme-error-500, #d93025)' }}>
          {MDS_FAILURE_TEXT[failure]} Сохранённый выбор не изменится; порядок и режимы править можно.
        </p>
      )}
      {!raw && !failure && <p style={mutedText}>Загрузка каталога…</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ ...panelStyle, flex: '6 1 520px' }} data-panel="catalog">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <strong>Каталог MDS</strong>
            <span style={countStyle}>{raw ? `показано ${shown.length} из ${catalog.length}` : '—'}</span>
          </div>

          <CategoryTabs tabs={tabs} active={category} onChoose={chooseCategory} />

          {chips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }} aria-label="Сегменты">
              {chips.map((c) => (
                <button
                  key={c.id || 'none'}
                  type="button"
                  aria-pressed={segment === c.id}
                  style={chipStyle(segment === c.id)}
                  onClick={() => {
                    setSegment(c.id)
                    setPending(null)
                  }}
                >
                  {c.label} <span style={{ opacity: 0.7 }}>{c.count}</span>
                </button>
              ))}
            </div>
          )}

          <input
            type="search"
            placeholder={
              category === ALL
                ? 'Поиск по всем категориям: символ или название…'
                : `Поиск в категории «${activeTab?.label ?? ''}»: символ или название…`
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPending(null)
            }}
            style={inputStyle}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hideAdded}
                onChange={(e) => {
                  setHideAdded(e.target.checked)
                  setPending(null)
                }}
              />
              Скрыть уже добавленные
            </label>
            <button
              type="button"
              style={{ ...buttonStyle, marginLeft: 'auto', ...(addable.length === 0 ? disabledButton : {}) }}
              disabled={addable.length === 0}
              title="Добавляются только показанные инструменты, которых ещё нет на сайте"
              onClick={requestBulk}
            >
              Добавить все показанные ({addable.length})
            </button>
          </div>

          {pending && (
            <div
              role="alertdialog"
              aria-label="Подтверждение массового добавления"
              style={{
                border: '1px solid var(--theme-warning-500, #e0a800)',
                background: 'var(--theme-elevation-50)',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <strong>
                Добавить сайту {pending.length} {plural(pending.length, INSTRUMENT_FORMS)}?
              </strong>
              {others ? (
                <span>
                  {bulkAddMessage(
                    pending.length,
                    platformSubscriptions(others, selected),
                    platformSubscriptions(others, selected, pending),
                  )}
                </span>
              ) : (
                <span>
                  Сколько станет подписок у модуля по всей платформе, сейчас посчитать нельзя: не удалось прочитать
                  инструменты других сайтов. Каждый новый для платформы инструмент — подписка у поставщика данных, это
                  может повысить тариф поставщика.
                </span>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  style={primaryButton}
                  onClick={() => {
                    add(pending)
                    setPending(null)
                  }}
                >
                  Добавить {pending.length}
                </button>
                <button type="button" style={buttonStyle} onClick={() => setPending(null)}>
                  Отмена
                </button>
              </div>
            </div>
          )}

          {letters && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }} aria-label="Переход по первой букве">
              {ALPHABET.map((l) => {
                const has = letters.has(l)
                return (
                  <button
                    key={l}
                    type="button"
                    disabled={!has}
                    onClick={() => jumpTo(l)}
                    style={{
                      ...buttonStyle,
                      padding: '1px 0',
                      width: '20px',
                      textAlign: 'center',
                      fontSize: '11px',
                      ...(has ? {} : disabledButton),
                    }}
                  >
                    {l}
                  </button>
                )
              })}
            </div>
          )}

          <CatalogList
            items={shown}
            query={query}
            modes={modes}
            others={others}
            onAdd={(s) => add([s])}
            scrollRef={listRef}
            resetKey={resetKey}
            showCategory={category === ALL}
          />
          {raw && shown.length === 0 && (
            <p style={{ ...mutedText, margin: 0 }}>
              {catalog.length === 0
                ? 'Каталог MDS пуст'
                : hideAdded
                  ? 'Ничего не найдено или всё показанное уже добавлено'
                  : 'Ничего не найдено'}
            </p>
          )}
        </div>

        <div style={{ ...panelStyle, flex: '5 1 440px' }} data-panel="chosen">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '13px', flexWrap: 'wrap' }}>
            <strong>На этом сайте</strong>
            <span style={countStyle}>
              {rows.length}
              {closeOnlyCount > 0 ? `, только закрытие: ${closeOnlyCount}` : ''}
            </span>
          </div>
          {unpriced.length > 0 && (
            <div
              role="alert"
              data-unpriced
              style={{
                border: '1px solid var(--theme-error-500)',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ flex: '1 1 240px' }}>
                Без источника цен: <strong>{unpriced.join(', ')}</strong>. Пока они в списке, терминал отклоняет весь
                список сайта и торговля закрыта по всем инструментам
              </span>
              <button type="button" style={buttonStyle} onClick={removeUnpriced}>
                Убрать {unpriced.length === 1 ? unpriced[0] : `все ${unpriced.length}`}
              </button>
            </div>
          )}
          <input
            type="search"
            placeholder="Поиск по выбранным…"
            value={chosenQuery}
            onChange={(e) => setChosenQuery(e.target.value)}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={mutedText}>
              {filtering ? 'Перетаскивание доступно без поиска' : 'Порядок меняется внутри категории'}
            </span>
            {groups.length > 1 && (
              <>
                <button
                  type="button"
                  style={{ ...buttonStyle, marginLeft: 'auto' }}
                  onClick={() => setCollapsed(Object.fromEntries(groups.map((g) => [g.category, false])))}
                >
                  Развернуть все
                </button>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => setCollapsed(Object.fromEntries(groups.map((g) => [g.category, true])))}
                >
                  Свернуть все
                </button>
              </>
            )}
          </div>
          <div style={{ ...listStyle, height: `${LIST_HEIGHT + 120}px` }}>
            {groups.map((g) => {
              if (filtering && g.visible.length === 0) return null
              const isCollapsed = filtering ? false : (collapsed[g.category] ?? g.items.length > COLLAPSE_ABOVE)
              const limit = portions[g.category] ?? GROUP_PORTION
              const positions = new Map(g.items.map((it, p) => [it.index, p]))
              return (
                <div key={g.category} data-group={g.category}>
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => setCollapsed({ ...collapsed, [g.category]: !isCollapsed })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '6px 8px',
                      border: 'none',
                      borderBottom: '1px solid var(--theme-elevation-150)',
                      background: 'var(--theme-elevation-50)',
                      color: 'inherit',
                      fontSize: '13px',
                      cursor: 'pointer',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ width: '12px' }}>{isCollapsed ? '▸' : '▾'}</span>
                    <strong>{g.label}</strong>
                    <span style={countStyle}>
                      {filtering ? `${g.visible.length} из ${g.items.length}` : g.items.length}
                      {g.closeOnly > 0 ? `, только закрытие: ${g.closeOnly}` : ''}
                    </span>
                  </button>
                  {!isCollapsed &&
                    g.visible.slice(0, limit).map(({ row, index, info }) => {
                      const position = positions.get(index) ?? 0
                      const prev = neighbourInGroup(g.items, position, -1)
                      const next = neighbourInGroup(g.items, position, 1)
                      const canDrag = !filtering
                      return (
                        <div
                          key={row.symbol}
                          draggable={canDrag}
                          onDragStart={(e) => {
                            setDrag({ index, category: g.category })
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragOver={(e) => {
                            if (!drag || drag.category !== g.category) return
                            e.preventDefault()
                            setOverIndex(index)
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (drag && drag.category === g.category) move(drag.index, index)
                            setDrag(null)
                            setOverIndex(null)
                          }}
                          onDragEnd={() => {
                            setDrag(null)
                            setOverIndex(null)
                          }}
                          style={{
                            ...rowStyle,
                            cursor: canDrag ? 'grab' : 'default',
                            opacity: drag?.index === index ? 0.4 : 1,
                            borderTop:
                              overIndex === index && drag?.index !== index
                                ? '2px solid var(--theme-success-500)'
                                : undefined,
                          }}
                        >
                          <span style={{ color: 'var(--theme-elevation-400)', width: '38px', flexShrink: 0 }}>
                            {canDrag ? '⠿' : ''} {position + 1}
                          </span>
                          <Icon symbol={row.symbol} hasIcon={info.hasIcon} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                            <Marked text={row.symbol} query={chosenQuery} />
                            {unpricedSet.has(row.symbol) && (
                              <span style={{ ...badgeStyle('var(--theme-error-500)'), marginLeft: '6px' }} title={NO_SOURCE_HINT}>
                                {NO_SOURCE_LABEL}
                              </span>
                            )}
                            {info.name && (
                              <span style={{ color: 'var(--theme-elevation-400)' }}>
                                {' — '}
                                <Marked text={info.name} query={chosenQuery} />
                              </span>
                            )}
                          </span>
                          <select
                            value={row.mode}
                            onChange={(e) => setMode(row.symbol, e.target.value as InstrumentMode)}
                            style={{
                              ...inputStyle,
                              width: 'auto',
                              marginLeft: 'auto',
                              padding: '2px 4px',
                              fontSize: '12px',
                              color: row.mode === 'closeOnly' ? modeColor('closeOnly') : inputStyle.color,
                            }}
                            aria-label={`Режим ${row.symbol}`}
                          >
                            {(Object.keys(MODE_LABELS) as InstrumentMode[]).map((m) => (
                              <option key={m} value={m}>
                                {MODE_LABELS[m]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            style={{ ...buttonStyle, ...(prev === null ? disabledButton : {}) }}
                            title="Выше"
                            aria-label={`Выше ${row.symbol}`}
                            disabled={prev === null}
                            onClick={() => prev !== null && move(index, prev)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            style={{ ...buttonStyle, ...(next === null ? disabledButton : {}) }}
                            title="Ниже"
                            aria-label={`Ниже ${row.symbol}`}
                            disabled={next === null}
                            onClick={() => next !== null && move(index, next)}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            style={buttonStyle}
                            title="Убрать с сайта"
                            aria-label={`Убрать ${row.symbol}`}
                            onClick={() => remove(row.symbol)}
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  {!isCollapsed && g.visible.length > limit && (
                    <button
                      type="button"
                      style={{ ...buttonStyle, margin: '6px 8px' }}
                      onClick={() => setPortions({ ...portions, [g.category]: limit + GROUP_PORTION })}
                    >
                      Показать ещё {Math.min(GROUP_PORTION, g.visible.length - limit)} (осталось{' '}
                      {g.visible.length - limit})
                    </button>
                  )}
                </div>
              )
            })}
            {rows.length === 0 && (
              <p style={{ ...mutedText, padding: '8px' }}>
                У сайта нет инструментов — добавьте их слева. Если инструментов не останется ни у одного сайта,
                сохранить нельзя
              </p>
            )}
            {rows.length > 0 && filtering && groups.every((g) => g.visible.length === 0) && (
              <p style={{ ...mutedText, padding: '8px' }}>Ничего не найдено</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
