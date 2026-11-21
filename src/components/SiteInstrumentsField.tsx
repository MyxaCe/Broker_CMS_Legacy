'use client'

import { useDocumentInfo, useField } from '@payloadcms/ui'
import React, { useEffect, useMemo, useState } from 'react'

import { loadPlatformSummary, MDS_FAILURE_TEXT } from '@/lib/admin-mds'
import { rowsFromSite, type SelectedRow, siteFieldsFromRows, symbolsOfOtherSites } from '@/lib/instrument-catalog'

import { InstrumentPicker } from './InstrumentPicker'

function siblingPath(path: string, name: string): string {
  const dot = path.lastIndexOf('.')
  return dot === -1 ? name : `${path.slice(0, dot + 1)}${name}`
}

export function SiteInstrumentsField({ path }: { path: string }) {
  const instruments = useField<string[]>({ path })
  const closeOnly = useField<string[]>({ path: siblingPath(path, 'closeOnlyInstruments') })
  const { id } = useDocumentInfo()
  const rows = useMemo(() => rowsFromSite(instruments.value, closeOnly.value), [instruments.value, closeOnly.value])
  const [others, setOthers] = useState<Set<string> | null>(null)
  const [othersNote, setOthersNote] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadPlatformSummary().then((result) => {
      if (!alive) return
      if (result.state === 'ok') setOthers(symbolsOfOtherSites(result.summary.instruments, id))
      else setOthersNote(`${MDS_FAILURE_TEXT[result.reason]} Число подписок по всей платформе сейчас не посчитать.`)
    })
    return () => {
      alive = false
    }
  }, [id])

  const write = (next: SelectedRow[]) => {
    const fields = siteFieldsFromRows(next)
    instruments.setValue(fields.instruments)
    closeOnly.setValue(fields.closeOnlyInstruments)
  }

  const errorMessage =
    [instruments.showError ? instruments.errorMessage : null, closeOnly.showError ? closeOnly.errorMessage : null]
      .filter(Boolean)
      .join(' ') || null

  return (
    <InstrumentPicker
      label="Инструменты"
      description={
        <>
          Слева — каталог модуля рыночных данных по категориям, справа — инструменты этого сайта: сайт получает котировки
          и показывает только их. Порядок внутри категории справа — порядок показа по умолчанию, его можно менять
          перетаскиванием. «Только закрытие» — на этом сайте новых сделок нет, цены идут, пока есть открытые позиции.
          Инструменты платформы, на которые подписывается модуль, — это объединение инструментов всех сайтов.
        </>
      }
      rows={rows}
      onChange={write}
      others={others}
      othersNote={othersNote}
      errorMessage={errorMessage}
    />
  )
}
