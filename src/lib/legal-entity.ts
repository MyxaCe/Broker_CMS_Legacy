import type { Field } from 'payload'

type Doc = Record<string, any>

export interface LegalDocument {
  url: string
  filename: string
  mimeType: string
}

export interface LegalLicense {
  number: string | null
  activity: string | null
  regulator: string | null
  regulatorCountry: string | null
  verifyUrl: string | null
  document: LegalDocument | null
}

export interface LegalEntity {
  name: string | null
  registrationNumber: string | null
  address: string | null
  licenses: LegalLicense[]
}

const PDF = 'application/pdf'

export const LICENSE_KEY = /^[a-z][a-z0-9_]{0,19}$/

export function validateLicenseKey(value: unknown): true | string {
  if (value === undefined || value === null || value === '') return true
  return typeof value === 'string' && LICENSE_KEY.test(value)
    ? true
    : 'Код: строчная латиница, цифры и «_», начинается с буквы (например cysec)'
}

export function isVerifyUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() !== value || value === '') return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return (
    url.protocol === 'https:' &&
    url.hostname.includes('.') &&
    !url.hostname.endsWith('.') &&
    url.username === '' &&
    url.password === ''
  )
}

export function validateVerifyUrl(value: unknown): true | string {
  if (value === undefined || value === null || value === '') return true
  return isVerifyUrl(value)
    ? true
    : 'Нужна полная ссылка https://… на запись в публичном реестре регулятора'
}

const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function mapDocument(media: unknown): LegalDocument | null {
  if (!media || typeof media !== 'object') return null
  const doc = media as Doc
  if (!doc.url || doc.mimeType !== PDF) return null
  const origin = (process.env.CMS_PUBLIC_URL ?? 'http://localhost:3001').replace(/\/$/, '')
  const url = String(doc.url).startsWith('http') ? String(doc.url) : `${origin}${doc.url}`
  return { url, filename: String(doc.filename ?? ''), mimeType: PDF }
}

export function mapLegalEntity(site: Doc): LegalEntity | null {
  const group = (site?.legalEntity ?? {}) as Doc
  const licenses = (Array.isArray(group.licenses) ? group.licenses : [])
    .map((item: Doc): LegalLicense => ({
      number: text(item?.number),
      activity: text(item?.activity),
      regulator: text(item?.regulator),
      regulatorCountry: text(item?.regulatorCountry),
      verifyUrl: isVerifyUrl(item?.verifyUrl) ? item.verifyUrl : null,
      document: mapDocument(item?.document),
    }))
    .filter((l: LegalLicense) => l.number || l.activity || l.regulator)
  const entity: LegalEntity = {
    name: text(group.name),
    registrationNumber: text(group.registrationNumber),
    address: text(group.address),
    licenses,
  }
  if (!entity.name && !entity.registrationNumber && !entity.address && licenses.length === 0) {
    return null
  }
  return entity
}

export const legalEntityField: Field = {
  name: 'legalEntity',
  type: 'group',
  label: 'Юрлицо и лицензия',
  admin: {
    description:
      'Выводится в подвале витрины и кабинета и на странице «Регулирование». Пустые поля не показываются',
  },
  fields: [
    { name: 'name', type: 'text', label: 'Название юрлица' },
    { name: 'registrationNumber', type: 'text', label: 'Регистрационный номер компании' },
    { name: 'address', type: 'textarea', localized: true, label: 'Юридический адрес' },
    {
      name: 'licenses',
      type: 'array',
      label: 'Лицензии',
      labels: { singular: 'Лицензия', plural: 'Лицензии' },
      fields: [
        {
          name: 'key',
          type: 'text',
          label: 'Код для текстов',
          admin: {
            description:
              'Латиницей, например cysec. Тогда в любом тексте сайта и в документах {{license.cysec.number}} — номер, ' +
              '{{license.cysec.regulator}} — регулятор, {{license.cysec.country}} — страна, {{license.cysec.activity}} — вид ' +
              'деятельности. Номер правится только здесь — меняется везде',
          },
          validate: (value: unknown) => validateLicenseKey(value),
        },
        { name: 'number', type: 'text', label: 'Номер лицензии' },
        { name: 'activity', type: 'text', localized: true, label: 'Тип лицензии / вид деятельности' },
        { name: 'regulator', type: 'text', localized: true, label: 'Регулятор' },
        { name: 'regulatorCountry', type: 'text', localized: true, label: 'Страна регулятора' },
        {
          name: 'verifyUrl',
          type: 'text',
          label: 'Ссылка «Проверить лицензию»',
          admin: { description: 'Адрес записи в публичном реестре регулятора, только https://' },
          validate: (value: unknown) => validateVerifyUrl(value),
        },
        {
          name: 'document',
          type: 'upload',
          relationTo: 'media',
          label: 'Файл лицензии (PDF)',
          filterOptions: { mimeType: { equals: PDF } },
        },
      ],
    },
  ],
}
