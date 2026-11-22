import { APIError, type CollectionConfig } from 'payload'

import {
  DEFAULT_SITE_LANGUAGE,
  DEFAULT_SITE_LANGUAGES,
  LANGUAGE_NAMES,
  LANGUAGES,
  validateDefaultLanguage,
  validateLanguages,
} from '../lib/languages'
import { defaultSiteSlug, notifySiteFor } from '../lib/notify-site'
import {
  checkPlatformChange,
  refreshPlatformInstruments,
  validateCloseOnlyInstruments,
  validateSiteInstruments,
  withoutSite,
} from '../lib/platform-instruments'

const languageOptions = LANGUAGES.map((code) => ({ value: code, label: `${LANGUAGE_NAMES[code]} (${code})` }))

export const Sites: CollectionConfig = {
  slug: 'sites',
  labels: { singular: 'Сайт', plural: 'Сайты' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['slug', 'name', 'primaryColor'],
  },
  hooks: {
    afterChange: [
      ({ doc }) => {
        const site = doc as { slug?: string; webhookUrl?: string | null; webhookSecret?: string | null }
        const slug = site.slug ?? 'unknown'
        const tags = [`cms:brand:${slug}`]
        if (slug === defaultSiteSlug()) tags.unshift('cms:brand')
        void notifySiteFor(site, tags)
        return doc
      },
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          const { ensureSiteSkeleton } = await import('../lib/site-skeleton')
          await ensureSiteSkeleton(req.payload, (doc as { id: string | number }).id)
          console.info(`[sites] skeleton created for ${(doc as { slug?: string }).slug}`)
        }
        return doc
      },
      async ({ doc, req }) => {
        await refreshPlatformInstruments(req.payload, req)
        return doc
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const verdict = await checkPlatformChange(req, (sites) => withoutSite(sites, id), true)
        if (verdict !== true) throw new APIError(verdict, 400, undefined, true)
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await refreshPlatformInstruments(req.payload, req)
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Slug (идентификатор тенанта)',
      validate: (value: unknown) =>
        typeof value === 'string' && /^[a-z0-9-]{2,32}$/.test(value)
          ? true
          : 'Ожидается slug вида apex-ru: строчные латинские, цифры, дефис (2–32)',
    },
    { name: 'name', type: 'text', required: true, label: 'Название бренда' },
    { name: 'logo', type: 'upload', relationTo: 'media', label: 'Логотип' },
    { name: 'favicon', type: 'upload', relationTo: 'media', label: 'Favicon' },
    {
      name: 'primaryColor',
      type: 'text',
      required: true,
      defaultValue: '#d4a437',
      label: 'Акцентный цвет (hex)',
      validate: (value: unknown) =>
        typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
          ? true
          : 'Ожидается hex-цвет вида #d4a437',
    },
    {
      name: 'socials',
      type: 'array',
      label: 'Социальные сети',
      fields: [
        { name: 'name', type: 'text', required: true, label: 'Название' },
        { name: 'url', type: 'text', required: true, label: 'Ссылка' },
      ],
    },
    {
      name: 'instruments',
      type: 'json',
      defaultValue: [],
      label: 'Инструменты',
      admin: {
        components: { Field: '/components/SiteInstrumentsField#SiteInstrumentsField' },
      },
      validate: (
        value: unknown,
        options: Parameters<typeof validateSiteInstruments>[1],
      ) => validateSiteInstruments(value, options),
    },
    {
      name: 'closeOnlyInstruments',
      type: 'json',
      defaultValue: [],
      label: 'Инструменты сайта в режиме «Только закрытие»',
      admin: { hidden: true },
      validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        validateCloseOnlyInstruments(value, siblingData),
    },
    {
      name: 'languages',
      type: 'select',
      hasMany: true,
      required: true,
      options: languageOptions,
      defaultValue: DEFAULT_SITE_LANGUAGES,
      label: 'Языки сайта',
      admin: {
        description:
          'Языки, на которых открываются витрина и кабинет. Порядок важен: в таком порядке языки показываются в переключателе',
      },
      validate: (value: unknown) => validateLanguages(value),
    },
    {
      name: 'defaultLanguage',
      type: 'select',
      required: true,
      options: languageOptions,
      defaultValue: DEFAULT_SITE_LANGUAGE,
      label: 'Язык по умолчанию',
      admin: {
        description: 'Открывается без префикса в адресе. Должен входить в список языков сайта',
      },
      validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        validateDefaultLanguage(value, siblingData?.languages),
    },
    {
      name: 'heroBackground',
      type: 'select',
      required: true,
      defaultValue: 'quotes',
      options: [
        { value: 'quotes', label: 'Живые котировки' },
        { value: 'off', label: 'Выключен' },
      ],
      label: 'Фон главного экрана',
      admin: { description: 'Что показывать фоном первого экрана витрины: живые котировки или ничего' },
    },
    {
      name: 'demoStartBalanceCents',
      type: 'number',
      required: true,
      defaultValue: 1000000,
      min: 0,
      label: 'Стартовый демо-баланс, центы',
    },
    {
      name: 'webhookUrl',
      type: 'text',
      label: 'Вебхук сайта (/api/revalidate)',
      admin: { description: 'Пусто — используется SITE_WEBHOOK_URL из окружения' },
    },
    {
      name: 'webhookSecret',
      type: 'text',
      label: 'Секрет вебхука',
      admin: { description: 'Пусто — используется SITE_WEBHOOK_SECRET из окружения' },
    },
  ],
}
