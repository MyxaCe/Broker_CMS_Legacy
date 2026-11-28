'use client'

import { toast, useAllFormFields, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useEffect, useMemo, useRef } from 'react'

import { collectUnknownLiveParams, LIVE_PARAMS, scanLiveParams } from '../lib/live-params'
import { isRequisiteParam, REQUISITE_PARAMS } from '../lib/requisites'

const chip = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '1px 8px',
  marginRight: 6,
  marginTop: 4,
  borderRadius: 10,
  fontSize: 12,
  fontFamily: 'monospace',
  border: `1px solid var(--theme-${color}-500)`,
  background: `var(--theme-${color}-100)`,
  color: `var(--theme-${color}-800)`,
})

export function LiveParamsHint({ path }: { path?: string }) {
  const value = useFormFields(([fields]) => (path ? fields[path]?.value : undefined))
  const { known, unknown } = useMemo(() => scanLiveParams(value), [value])
  if (!known.length && !unknown.length) return null
  return (
    <div style={{ marginTop: 4 }}>
      {known.map((token) =>
        isRequisiteParam(token.slice(2, -2).trim()) ? (
          <span key={token} style={chip('success')} title="Реквизит: значение из карточки сайта (Сайты → Реквизиты для документов)">
            {token} · реквизит сайта
          </span>
        ) : (
          <span key={token} style={chip('success')} title="Живой параметр: сайт подставит значение из настроек платформы">
            {token} · живой параметр
          </span>
        ),
      )}
      {unknown.map((token) => (
        <span key={token} style={chip('error')} title="Такого параметра нет: на сайте будет «—»">
          {token} · неизвестный параметр
        </span>
      ))}
    </div>
  )
}

export function LiveParamsSummary() {
  const [fields] = useAllFormFields()
  const { savedDocumentData } = useDocumentInfo()
  const unknown = useMemo(
    () => collectUnknownLiveParams(Object.values(fields).map((f) => f?.value)),
    [fields],
  )
  const savedAt = useRef<unknown>(savedDocumentData?.updatedAt)
  const lastToast = useRef({ key: '', at: 0 })
  useEffect(() => {
    const updatedAt = savedDocumentData?.updatedAt
    if (!updatedAt || updatedAt === savedAt.current) return
    savedAt.current = updatedAt
    const saved = collectUnknownLiveParams(savedDocumentData ?? {})
    const key = saved.join(',')
    const now = Date.now()
    if (saved.length && (key !== lastToast.current.key || now - lastToast.current.at > 60000)) {
      lastToast.current = { key, at: now }
      toast.warning(`Сохранено, но в тексте неизвестные параметры: ${saved.join(', ')}. На сайте вместо них будет «—».`, {
        duration: 15000,
      })
    }
  }, [savedDocumentData])

  return (
    <details style={{ marginBottom: 16, fontSize: 13 }} open={unknown.length > 0}>
      <summary style={{ cursor: 'pointer', color: unknown.length ? 'var(--theme-error-600)' : undefined }}>
        {unknown.length
          ? `Неизвестные параметры: ${unknown.join(', ')}`
          : 'Параметры {{…}}: цифры платформы и реквизиты сайта'}
      </summary>
      <p style={{ margin: '8px 0' }}>
        Сайт подставляет значения из настроек платформы при показе страницы. Параметры не переводятся: в каждом языке
        пишутся одинаково. Неизвестный параметр (опечатка) сохранить можно, но на сайте вместо него будет «—».
      </p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {LIVE_PARAMS.map((p) => (
          <li key={p.name}>
            <code>{`{{${p.name}}}`}</code> — {p.title}
          </li>
        ))}
      </ul>
      <p style={{ margin: '8px 0 4px' }}>
        Реквизиты сайта — название бренда, юрлицо, адрес, юрисдикция. Значения берутся из карточки сайта (Сайты → Юрлицо и
        лицензия, Реквизиты для документов), так что один и тот же текст подходит для любого сайта:
      </p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {REQUISITE_PARAMS.map((p) => (
          <li key={p.name}>
            <code>{`{{${p.name}}}`}</code> — {p.title}
          </li>
        ))}
      </ul>
      <p style={{ margin: '8px 0 0' }}>
        {'<key>'} — ключ портфеля платформы: латиница, цифры, подчёркивание (standard, pro, enc_prime). {'<класс>'} —
        класс инструмента (crypto, fx…).
      </p>
    </details>
  )
}
