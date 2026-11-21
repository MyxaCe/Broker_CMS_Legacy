'use client'

import React from 'react'

import { highlight, type InstrumentMode } from '@/lib/instrument-catalog'

export const ROW_HEIGHT = 32
export const LIST_HEIGHT = 440

export const MODE_LABELS: Record<InstrumentMode, string> = {
  trade: 'Торговля',
  closeOnly: 'Только закрытие',
}

export const INSTRUMENT_FORMS: [string, string, string] = ['инструмент', 'инструмента', 'инструментов']

export const panelStyle: React.CSSProperties = {
  minWidth: 0,
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '8px',
  padding: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: '4px',
  border: '1px solid var(--theme-elevation-150)',
  background: 'var(--theme-input-bg, var(--theme-elevation-0))',
  color: 'var(--theme-elevation-800)',
  fontSize: '13px',
}

export const listStyle: React.CSSProperties = {
  height: `${LIST_HEIGHT}px`,
  overflowY: 'auto',
  border: '1px solid var(--theme-elevation-100)',
  borderRadius: '6px',
  position: 'relative',
}

export const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '0 8px',
  height: `${ROW_HEIGHT}px`,
  boxSizing: 'border-box',
  fontSize: '13px',
  borderBottom: '1px solid var(--theme-elevation-50)',
}

export const buttonStyle: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-200)',
  borderRadius: '4px',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: '12px',
  padding: '2px 8px',
  flexShrink: 0,
}

export const primaryButton: React.CSSProperties = {
  ...buttonStyle,
  background: 'var(--theme-elevation-800)',
  color: 'var(--theme-elevation-0)',
  borderColor: 'var(--theme-elevation-800)',
}

export const disabledButton: React.CSSProperties = { opacity: 0.4, cursor: 'not-allowed' }

export const mutedText: React.CSSProperties = { fontSize: '12px', color: 'var(--theme-elevation-400)' }

export const countStyle: React.CSSProperties = { color: 'var(--theme-elevation-400)', fontVariantNumeric: 'tabular-nums' }

export const noteStyle: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-100)',
  background: 'var(--theme-elevation-50)',
  borderRadius: '6px',
  padding: '8px 10px',
  fontSize: '12px',
  color: 'var(--theme-elevation-600)',
}

const markStyle: React.CSSProperties = {
  background: 'rgba(255, 196, 0, 0.4)',
  color: 'inherit',
  borderRadius: '2px',
  padding: 0,
}

export function modeColor(mode: InstrumentMode): string {
  return mode === 'closeOnly' ? 'var(--theme-warning-700, #b06000)' : 'var(--theme-success-600, #2e7d32)'
}

export function badgeStyle(color: string): React.CSSProperties {
  return {
    fontSize: '11px',
    padding: '1px 6px',
    borderRadius: '999px',
    border: '1px solid var(--theme-elevation-200)',
    color,
    whiteSpace: 'nowrap',
  }
}

export function chipStyle(active: boolean): React.CSSProperties {
  return {
    border: `1px solid ${active ? 'var(--theme-elevation-800)' : 'var(--theme-elevation-150)'}`,
    background: active ? 'var(--theme-elevation-800)' : 'transparent',
    color: active ? 'var(--theme-elevation-0)' : 'var(--theme-elevation-800)',
    borderRadius: '999px',
    padding: '3px 10px',
    fontSize: '12px',
    lineHeight: '18px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
}

export function tabStyle(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    border: 'none',
    borderBottom: `2px solid ${active ? 'var(--theme-elevation-800)' : 'transparent'}`,
    background: 'transparent',
    color: active ? 'var(--theme-elevation-800)' : 'var(--theme-elevation-500)',
    fontWeight: active ? 600 : 400,
    padding: '6px 7px',
    fontSize: '13px',
    flexShrink: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    whiteSpace: 'nowrap',
  }
}

export function Icon({ symbol, hasIcon }: { symbol: string; hasIcon: boolean }) {
  if (!hasIcon) return <span style={{ width: '18px', flexShrink: 0 }} aria-hidden />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/admin-mds/icons/${symbol}.svg`}
      alt=""
      width={18}
      height={18}
      loading="lazy"
      style={{ borderRadius: '50%', flexShrink: 0 }}
      onError={(e) => {
        ;(e.target as HTMLImageElement).style.visibility = 'hidden'
      }}
    />
  )
}

export function Marked({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, query).map((part, i) =>
        part.match ? (
          <mark key={i} style={markStyle}>
            {part.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{part.text}</React.Fragment>
        ),
      )}
    </>
  )
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </p>
  )
}

export function CategoryTabs({
  tabs,
  active,
  onChoose,
}: {
  tabs: { id: string; label: string; count: number; disabled: boolean }[]
  active: string
  onChoose: (id: string) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Категории"
      style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '1px solid var(--theme-elevation-150)' }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          disabled={t.disabled}
          title={t.disabled ? 'Инструментов этой категории нет' : undefined}
          style={tabStyle(active === t.id, t.disabled)}
          onClick={() => onChoose(t.id)}
        >
          {t.label} <span style={countStyle}>{t.count}</span>
        </button>
      ))}
    </div>
  )
}
