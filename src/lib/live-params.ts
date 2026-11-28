import { isRequisiteParam } from './requisites'

export const LIVE_PARAMS: readonly { name: string; title: string }[] = [
  { name: 'deposit.min', title: 'Минимальное пополнение' },
  { name: 'withdraw.min', title: 'Минимальный вывод' },
  { name: 'withdraw.unverifiedPercent', title: 'Доля вывода без верификации' },
  { name: 'deposit.methods', title: 'Способы пополнения' },
  { name: 'demo.startBalance', title: 'Стартовый демо-баланс' },
  { name: 'leverage.max', title: 'Максимальное плечо по публичным портфелям' },
  { name: 'account.<key>.name', title: 'Название портфеля' },
  { name: 'account.<key>.leverage', title: 'Плечо портфеля' },
  { name: 'account.<key>.leverage.<класс>', title: 'Плечо портфеля по классу инструмента' },
  { name: 'account.<key>.commission', title: 'Комиссия портфеля' },
  { name: 'account.<key>.markup', title: 'Наценка портфеля' },
  { name: 'support.hours', title: 'Часы работы поддержки' },
]

const FIXED = new Set(LIVE_PARAMS.filter((p) => !p.name.includes('<')).map((p) => p.name))

const ACCOUNT_PARAM = /^account\.[A-Za-z0-9_]+\.(name|leverage|commission|markup)$/
const ACCOUNT_CLASS_PARAM = /^account\.[A-Za-z0-9_]+\.leverage\.[A-Za-z0-9_]+$/

const PLACEHOLDER = /\{\{([^{}]*)\}\}/g

export function isLiveParam(name: string): boolean {
  return FIXED.has(name) || ACCOUNT_PARAM.test(name) || ACCOUNT_CLASS_PARAM.test(name)
}

/** Известная метка: живой параметр платформы (подставит сайт) или реквизит сайта (подставит CMS). */
export function isKnownParam(name: string): boolean {
  return isLiveParam(name) || isRequisiteParam(name)
}

export interface LiveParamsScan {
  known: string[]
  unknown: string[]
}

export function scanLiveParams(text: unknown): LiveParamsScan {
  const known: string[] = []
  const unknown: string[] = []
  if (typeof text !== 'string' || !text.includes('{{')) return { known, unknown }
  for (const match of text.matchAll(PLACEHOLDER)) {
    const name = match[1] ?? ''
    const target = isKnownParam(name) ? known : unknown
    const token = `{{${name}}}`
    if (!target.includes(token)) target.push(token)
  }
  return { known, unknown }
}

export function collectUnknownLiveParams(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    for (const token of scanLiveParams(value).unknown) if (!out.includes(token)) out.push(token)
  } else if (Array.isArray(value)) {
    for (const item of value) collectUnknownLiveParams(item, out)
  } else if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const item of Object.values(value)) collectUnknownLiveParams(item, out)
  }
  return out
}
