'use client'

import { useField } from '@payloadcms/ui'
import React, { useEffect, useMemo, useState } from 'react'

import { loadMdsInstruments, MDS_FAILURE_TEXT, type MdsFailureReason } from '@/lib/admin-mds'

interface MdsInstrument {
  symbol: string
  name: string
  group?: string
  category?: string
  icon?: string | null
  provider?: string
}

type Mode = 'trade' | 'closeOnly'

interface Row {
  symbol: string
  mode: Mode
}

const MAX_RENDER = 300

const MODE_LABELS: Record<Mode, string> = {
  trade: 'Торговля',
  closeOnly: 'Только закрытие',
}

const panelStyle: React.CSSProperties = {
  flex: '1 1 340px',
  minWidth: 0,
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '8px',
  padding: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: '4px',
  border: '1px solid var(--theme-elevation-150)',
  background: 'var(--theme-input-bg, var(--theme-elevation-0))',
  color: 'var(--theme-elevation-800)',
  fontSize: '13px',
}

const listStyle: React.CSSProperties = {
  height: '420px',
  overflowY: 'auto',
  border: '1px solid var(--theme-elevation-100)',
  borderRadius: '6px',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '4px 8px',
  fontSize: '13px',
  borderBottom: '1px solid var(--theme-elevation-50)',
}

const buttonStyle: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-200)',
  borderRadius: '4px',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: '12px',
  padding: '2px 8px',
  flexShrink: 0,
}

const mutedText: React.CSSProperties = { fontSize: '12px', color: 'var(--theme-elevation-400)' }

function groupOf(i: MdsInstrument): string {
  return i.group ?? i.category ?? 'Прочее'
}

function Icon({ symbol, hasIcon }: { symbol: string; hasIcon: boolean }) {
  if (!hasIcon) return <span style={{ width: '18px', flexShrink: 0 }} aria-hidden />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/admin-mds/icons/${symbol}.svg`}
      alt=""
      width={18}
      height={18}
      style={{ borderRadius: '50%', flexShrink: 0 }}
      onError={(e) => {
        ;(e.target as HTMLImageElement).style.visibility = 'hidden'
      }}
    />
  )
}

function readRows(value: unknown): Row[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((r): r is { symbol: string; mode?: unknown } => Boolean(r) && typeof r.symbol === 'string')
    .map((r) => ({ symbol: r.symbol, mode: r.mode === 'closeOnly' ? 'closeOnly' : 'trade' }))
}

function matches(i: MdsInstrument, query: string, group: string): boolean {
  if (group && groupOf(i) !== group) return false
  if (!query) return true
  return i.symbol.toLowerCase().includes(query) || i.name.toLowerCase().includes(query)
}

export function PlatformInstrumentsField({ path }: { path: string }) {
  const { value, setValue, showError, errorMessage } = useField<Row[]>({ path })
  const rows = useMemo(() => readRows(value), [value])
  const selected = useMemo(() => new Set(rows.map((r) => r.symbol)), [rows])

  const [catalog, setCatalog] = useState<MdsInstrument[] | null>(null)
  const [failure, setFailure] = useState<MdsFailureReason | null>(null)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [chosenQuery, setChosenQuery] = useState('')
  const [chosenGroup, setChosenGroup] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    loadMdsInstruments<MdsInstrument>('/admin-mds/instruments?all=1').then((result) => {
      if (!alive) return
      if (result.state === 'ok') setCatalog(result.items)
      else setFailure(result.reason)
    })
    return () => {
      alive = false
    }
  }, [])

  const bySymbol = useMemo(() => new Map((catalog ?? []).map((i) => [i.symbol, i])), [catalog])
  const describe = (symbol: string): MdsInstrument =>
    bySymbol.get(symbol) ?? { symbol, name: catalog ? 'нет в каталоге MDS' : '', group: 'Нет в MDS', icon: null }

  const groups = useMemo(() => [...new Set((catalog ?? []).map(groupOf))].sort(), [catalog])
  const chosenGroups = [...new Set(rows.map((r) => groupOf(describe(r.symbol))))].sort()

  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (catalog ?? []).filter((i) => !selected.has(i.symbol) && matches(i, q, group))
  }, [catalog, selected, query, group])

  const chosenFilter = chosenQuery.trim().toLowerCase()
  const filtering = Boolean(chosenFilter || chosenGroup)
  const visibleRows = rows
    .map((row, index) => ({ row, index, info: describe(row.symbol) }))
    .filter(({ info }) => matches(info, chosenFilter, chosenGroup))

  const write = (next: Row[]) => setValue(next)
  const add = (symbols: string[]) =>
    write([...rows, ...symbols.filter((s) => !selected.has(s)).map((symbol) => ({ symbol, mode: 'trade' as Mode }))])
  const remove = (symbol: string) => write(rows.filter((r) => r.symbol !== symbol))
  const setMode = (symbol: string, mode: Mode) => write(rows.map((r) => (r.symbol === symbol ? { ...r, mode } : r)))
  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return
    const next = [...rows]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item!)
    write(next)
  }

  const closeOnlyCount = rows.filter((r) => r.mode === 'closeOnly').length

  return (
    <div style={{ marginBottom: 'var(--base, 20px)' }}>
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Инструменты платформы</label>
      <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--theme-elevation-500)' }}>
        Слева — каталог модуля рыночных данных, справа — то, что использует платформа. Порядок справа — порядок показа
        по умолчанию, его можно менять перетаскиванием. «Только закрытие» — новых сделок нет, цены идут, пока есть
        открытые позиции. Убрать инструмент можно, только если он не включён ни одному сайту.
      </p>

      {showError && errorMessage && (
        <p
          role="alert"
          style={{
            fontSize: '13px',
            color: 'var(--theme-error-500, #d93025)',
            border: '1px solid var(--theme-error-500, #d93025)',
            borderRadius: '6px',
            padding: '8px 10px',
          }}
        >
          {errorMessage}
        </p>
      )}

      {failure && (
        <p style={{ fontSize: '12px', color: 'var(--theme-error-500, #d93025)' }}>
          {MDS_FAILURE_TEXT[failure]} Сохранённый список не изменится; порядок и режимы править можно.
        </p>
      )}
      {!catalog && !failure && <p style={mutedText}>Загрузка каталога…</p>}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <strong>Каталог MDS</strong>
            <span style={{ color: 'var(--theme-elevation-400)' }}>{catalog ? available.length : '—'}</span>
            {available.length > 0 && (
              <button
                type="button"
                style={{ ...buttonStyle, marginLeft: 'auto' }}
                onClick={() => add(available.map((i) => i.symbol))}
              >
                Добавить все найденные ({available.length})
              </button>
            )}
          </div>
          <input
            type="search"
            placeholder="Поиск: символ или название…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={inputStyle}
          />
          <select value={group} onChange={(e) => setGroup(e.target.value)} style={inputStyle}>
            <option value="">Все категории</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <div style={listStyle}>
            {available.slice(0, MAX_RENDER).map((i) => (
              <div key={i.symbol} style={rowStyle}>
                <Icon symbol={i.symbol} hasIcon={Boolean(i.icon)} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {i.symbol}
                  <span style={{ color: 'var(--theme-elevation-400)' }}> — {i.name}</span>
                </span>
                <button
                  type="button"
                  style={{ ...buttonStyle, marginLeft: 'auto' }}
                  aria-label={`Добавить ${i.symbol}`}
                  onClick={() => add([i.symbol])}
                >
                  +
                </button>
              </div>
            ))}
            {available.length > MAX_RENDER && (
              <p style={{ ...mutedText, padding: '8px' }}>
                Показаны первые {MAX_RENDER} из {available.length} — уточните поиск или категорию
              </p>
            )}
            {catalog && available.length === 0 && (
              <p style={{ ...mutedText, padding: '8px' }}>
                {catalog.length === 0 ? 'Каталог MDS пуст' : 'Ничего не найдено или всё уже добавлено'}
              </p>
            )}
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <strong>Используются платформой</strong>
            <span style={{ color: 'var(--theme-elevation-400)' }}>
              {rows.length}
              {closeOnlyCount > 0 ? `, только закрытие: ${closeOnlyCount}` : ''}
            </span>
          </div>
          <input
            type="search"
            placeholder="Поиск по выбранным…"
            value={chosenQuery}
            onChange={(e) => setChosenQuery(e.target.value)}
            style={inputStyle}
          />
          <select value={chosenGroup} onChange={(e) => setChosenGroup(e.target.value)} style={inputStyle}>
            <option value="">Все категории</option>
            {chosenGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          {filtering && <p style={{ ...mutedText, margin: 0 }}>Перетаскивание доступно без поиска и фильтра</p>}
          <div style={listStyle}>
            {visibleRows.map(({ row, index, info }) => (
              <div
                key={row.symbol}
                draggable={!filtering}
                onDragStart={(e) => {
                  setDragIndex(index)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  if (dragIndex === null) return
                  e.preventDefault()
                  setOverIndex(index)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragIndex !== null) move(dragIndex, index)
                  setDragIndex(null)
                  setOverIndex(null)
                }}
                onDragEnd={() => {
                  setDragIndex(null)
                  setOverIndex(null)
                }}
                style={{
                  ...rowStyle,
                  cursor: filtering ? 'default' : 'grab',
                  opacity: dragIndex === index ? 0.4 : 1,
                  borderTop: overIndex === index && dragIndex !== index ? '2px solid var(--theme-success-500)' : undefined,
                }}
              >
                <span style={{ color: 'var(--theme-elevation-400)', width: '28px', flexShrink: 0 }}>
                  {filtering ? '' : '⠿'} {index + 1}
                </span>
                <Icon symbol={row.symbol} hasIcon={Boolean(info.icon)} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.symbol}
                  {info.name && <span style={{ color: 'var(--theme-elevation-400)' }}> — {info.name}</span>}
                </span>
                <select
                  value={row.mode}
                  onChange={(e) => setMode(row.symbol, e.target.value as Mode)}
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    marginLeft: 'auto',
                    padding: '2px 4px',
                    fontSize: '12px',
                    color: row.mode === 'closeOnly' ? 'var(--theme-warning-700, #b06000)' : inputStyle.color,
                  }}
                  aria-label={`Режим ${row.symbol}`}
                >
                  {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
                    <option key={m} value={m}>
                      {MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  style={buttonStyle}
                  title="Выше"
                  aria-label={`Выше ${row.symbol}`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  style={buttonStyle}
                  title="Ниже"
                  aria-label={`Ниже ${row.symbol}`}
                  disabled={index === rows.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  style={buttonStyle}
                  title="Убрать из платформы"
                  aria-label={`Убрать ${row.symbol}`}
                  onClick={() => remove(row.symbol)}
                >
                  ✕
                </button>
              </div>
            ))}
            {rows.length === 0 && (
              <p style={{ ...mutedText, padding: '8px' }}>Список пуст — платформа не использует ни одного инструмента</p>
            )}
            {rows.length > 0 && visibleRows.length === 0 && <p style={{ ...mutedText, padding: '8px' }}>Ничего не найдено</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
