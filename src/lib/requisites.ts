import type { Field } from 'payload'

/**
 * Реквизиты сайта в текстах: {{brand}}, {{company.name}}, {{company.<ключ>}}.
 *
 * Юридические документы пишутся один раз как шаблон, а название бренда, юрлицо,
 * адрес, юрисдикция, телефон и т. п. берутся из карточки сайта. Подставляет их
 * CMS при отдаче контента (а не сайт), поэтому витрина и кабинет получают
 * готовый текст. Остальные {{…}} (цифры платформы) не трогаем — их подставляет сайт.
 */

type Doc = Record<string, any>

export interface RequisiteParam {
  name: string
  title: string
}

/** Встроенные метки: откуда берётся значение — подпись в карточке сайта. */
export const REQUISITE_PARAMS: readonly RequisiteParam[] = [
  { name: 'brand', title: 'Название бренда (карточка сайта)' },
  { name: 'company.name', title: 'Название юрлица (Юрлицо и лицензия)' },
  { name: 'company.regNumber', title: 'Регистрационный номер (Юрлицо и лицензия)' },
  { name: 'company.address', title: 'Юридический адрес (Юрлицо и лицензия)' },
  { name: 'company.jurisdiction', title: 'Страна юрисдикции, кого/чего: «законодательством …», «суды …» (Реквизиты для документов)' },
  { name: 'company.jurisdictionIn', title: 'Страна юрисдикции с предлогом, где: «органы …» (Реквизиты для документов)' },
  { name: 'company.phone', title: 'Телефон (Реквизиты для документов)' },
  { name: 'company.email', title: 'Почта (Реквизиты для документов)' },
  { name: 'company.website', title: 'Адрес сайта (Реквизиты для документов)' },
  { name: 'company.<ключ>', title: 'Своя метка (Реквизиты для документов → Свои метки)' },
  { name: 'license.<код>.number', title: 'Номер лицензии (Юрлицо и лицензия → Лицензии, поле «Код для текстов»)' },
  { name: 'license.<код>.regulator', title: 'Регулятор этой лицензии' },
  { name: 'license.<код>.country', title: 'Страна регулятора' },
  { name: 'license.<код>.activity', title: 'Вид деятельности по лицензии' },
]

const BUILTIN = new Set(REQUISITE_PARAMS.filter((p) => !p.name.includes('<')).map((p) => p.name))
const EXTRA_KEY = /^[A-Za-z][A-Za-z0-9_]{0,39}$/
const LICENSE_PARAM = /^license\.[a-z][a-z0-9_]{0,19}\.(number|regulator|country|activity)$/
const PLACEHOLDER = /\{\{\s*(brand|company\.[A-Za-z0-9_]+|license\.[a-z][a-z0-9_]*\.(?:number|regulator|country|activity))\s*\}\}/g

export function isRequisiteParam(name: string): boolean {
  return (
    BUILTIN.has(name) ||
    (name.startsWith('company.') && EXTRA_KEY.test(name.slice('company.'.length))) ||
    LICENSE_PARAM.test(name)
  )
}

const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Значения меток для сайта в текущем языке; null — поле не заполнено. */
export function requisiteValues(site: Doc): Map<string, string | null> {
  const entity = (site?.legalEntity ?? {}) as Doc
  const req = (site?.requisites ?? {}) as Doc
  const values = new Map<string, string | null>([
    ['brand', text(site?.name)],
    ['company.name', text(entity.name)],
    ['company.regNumber', text(entity.registrationNumber)],
    ['company.address', text(entity.address)],
    ['company.jurisdiction', text(req.jurisdiction)],
    ['company.jurisdictionIn', text(req.jurisdictionIn)],
    ['company.phone', text(req.phone)],
    ['company.email', text(req.email)],
    ['company.website', text(req.website)],
  ])
  for (const item of Array.isArray(req.extra) ? req.extra : []) {
    const key = text(item?.key)
    if (!key || !EXTRA_KEY.test(key)) continue
    const name = `company.${key}`
    if (BUILTIN.has(name)) continue
    values.set(name, text(item?.value))
  }
  // Лицензии: номер и регулятор берутся из того же блока, что подвал и страница «Регулирование».
  for (const item of Array.isArray(entity.licenses) ? entity.licenses : []) {
    const key = text(item?.key)
    if (!key || !/^[a-z][a-z0-9_]{0,19}$/.test(key)) continue
    values.set(`license.${key}.number`, text(item?.number))
    values.set(`license.${key}.regulator`, text(item?.regulator))
    values.set(`license.${key}.country`, text(item?.regulatorCountry))
    values.set(`license.${key}.activity`, text(item?.activity))
  }
  return values
}

/** Метки реквизитов, встречающиеся в значении (строке, массиве, объекте). */
export function collectRequisites(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof value === 'string') {
    if (value.includes('{{')) for (const m of value.matchAll(PLACEHOLDER)) out.add(m[1]!)
  } else if (Array.isArray(value)) {
    for (const item of value) collectRequisites(item, out)
  } else if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const item of Object.values(value)) collectRequisites(item, out)
  }
  return out
}

/** Метки, для которых у сайта нет значения (не заполнено или неизвестный ключ). */
export function missingRequisites(value: unknown, values: Map<string, string | null>): string[] {
  return [...collectRequisites(value)].filter((name) => !values.get(name)).sort()
}

/**
 * Подставляет реквизиты во все строки. Незаполненная метка заменяется на «—»
 * (как неизвестный живой параметр на сайте); документы, где это недопустимо,
 * отсеиваются заранее через missingRequisites.
 */
export function substituteRequisites<T>(value: T, values: Map<string, string | null>): T {
  if (typeof value === 'string') {
    if (!value.includes('{{')) return value
    return value.replace(PLACEHOLDER, (_, name: string) => values.get(name) ?? '—') as T
  }
  if (Array.isArray(value)) return value.map((item) => substituteRequisites(item, values)) as T
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = substituteRequisites(v, values)
    return out as T
  }
  return value
}

/**
 * Юридические документы: документ с незаполненной меткой не отдаётся вовсе —
 * лучше «документ обновляется», чем договор с «—» вместо названия компании.
 */
export function withRequisitesLegal(
  dto: { items: Doc[] },
  site: Doc,
  log: (message: string) => void = console.warn,
): { items: Doc[] } {
  const values = requisiteValues(site)
  const items: Doc[] = []
  for (const item of dto.items) {
    const missing = missingRequisites(item, values)
    if (missing.length) {
      log(`[requisites] ${String(site?.slug)}: документ «${String(item.slug)}» скрыт — не заполнено: ${missing.join(', ')}`)
      continue
    }
    items.push(substituteRequisites(item, values))
  }
  return { ...dto, items }
}

export function validateExtraKey(value: unknown): true | string {
  if (typeof value !== 'string' || !EXTRA_KEY.test(value)) {
    return 'Ключ: латиница, цифры и «_», начинается с буквы (например regulator). В тексте пишется {{company.ключ}}'
  }
  if (BUILTIN.has(`company.${value}`)) return 'Такая метка уже есть среди встроенных полей'
  return true
}

export const requisitesField: Field = {
  name: 'requisites',
  type: 'group',
  label: 'Реквизиты для документов',
  admin: {
    description:
      'Подставляются в тексты вместо меток: {{brand}} — название бренда, {{company.name}}, {{company.regNumber}}, ' +
      '{{company.address}} — из блока «Юрлицо и лицензия», остальные — отсюда. Юридический документ с незаполненной ' +
      'меткой на сайте не показывается, пока поле не заполнят. Лицензии: {{license.<код>.number}} — из блока «Юрлицо и ' +
      'лицензия». Телефон и почту можно ставить метками и в «Контакты» — тогда они правятся только здесь.',
  },
  fields: [
    {
      name: 'jurisdiction',
      type: 'text',
      localized: true,
      label: 'Страна юрисдикции (кого/чего) — {{company.jurisdiction}}',
      admin: { description: 'В тексте: «законодательством …», «суды …». Например: Республики Кипр' },
    },
    {
      name: 'jurisdictionIn',
      type: 'text',
      localized: true,
      label: 'Страна юрисдикции с предлогом (где) — {{company.jurisdictionIn}}',
      admin: { description: 'В тексте: «органы …». Например: в Республике Кипр' },
    },
    { name: 'phone', type: 'text', label: 'Телефон — {{company.phone}}' },
    { name: 'email', type: 'text', label: 'Почта — {{company.email}}' },
    { name: 'website', type: 'text', label: 'Адрес сайта — {{company.website}}', admin: { description: 'Например: example.com' } },
    {
      name: 'extra',
      type: 'array',
      label: 'Свои метки',
      labels: { singular: 'Метка', plural: 'Метки' },
      admin: { description: 'Для того, чего нет выше: ключ regulator → в тексте {{company.regulator}}' },
      fields: [
        { name: 'key', type: 'text', required: true, label: 'Ключ', validate: (value: unknown) => validateExtraKey(value) },
        { name: 'value', type: 'text', localized: true, label: 'Значение' },
      ],
    },
  ],
}
