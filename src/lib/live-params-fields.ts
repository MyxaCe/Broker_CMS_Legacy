import type { CollectionAfterChangeHook, Field } from 'payload'

import { collectUnknownLiveParams } from './live-params'

const HINT = '/components/LiveParams#LiveParamsHint'

export const liveParamsSummaryField: Field = {
  name: 'liveParamsSummary',
  type: 'ui',
  admin: { components: { Field: '/components/LiveParams#LiveParamsSummary' } },
}

export function withLiveParams(fields: Field[]): Field[] {
  return fields.map((field) => {
    if ((field.type === 'text' || field.type === 'textarea') && !field.admin?.components?.Field && !('hasMany' in field && field.hasMany)) {
      const afterInput = [...(field.admin?.components?.afterInput ?? []), HINT]
      return { ...field, admin: { ...field.admin, components: { ...field.admin?.components, afterInput } } } as Field
    }
    if (field.type === 'array' || field.type === 'group' || field.type === 'row' || field.type === 'collapsible') {
      return { ...field, fields: withLiveParams(field.fields) } as Field
    }
    if (field.type === 'tabs') {
      return { ...field, tabs: field.tabs.map((tab) => ({ ...tab, fields: withLiveParams(tab.fields) })) } as Field
    }
    return field
  })
}

export const warnUnknownLiveParams: CollectionAfterChangeHook = ({ doc, collection, req }) => {
  const unknown = collectUnknownLiveParams(doc)
  if (unknown.length) {
    console.warn(`[live-params] ${collection.slug} #${String(doc?.id)} (${String(req.locale ?? '')}): неизвестные параметры ${unknown.join(', ')}`)
  }
  return doc
}
