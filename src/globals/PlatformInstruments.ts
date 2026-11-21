import type { GlobalConfig } from 'payload'

import { PLATFORM_INSTRUMENTS_SLUG } from '../lib/platform-instruments'

export const PlatformInstruments: GlobalConfig = {
  slug: PLATFORM_INSTRUMENTS_SLUG,
  label: 'Инструменты платформы',
  admin: {
    description: 'Только просмотр. Выбор делается в карточках сайтов',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: () => false,
  },
  fields: [
    {
      name: 'summary',
      type: 'ui',
      label: 'Инструменты платформы',
      admin: {
        components: { Field: '/components/PlatformInstrumentsSummary#PlatformInstrumentsSummary' },
      },
    },
    {
      name: 'instruments',
      type: 'json',
      defaultValue: [],
      label: 'Прежний ручной список (не используется)',
      admin: { hidden: true },
    },
    {
      name: 'version',
      type: 'number',
      defaultValue: 0,
      label: 'Версия списка',
      admin: { hidden: true },
    },
    {
      name: 'computedHash',
      type: 'text',
      label: 'Отпечаток вычисленного списка',
      admin: { hidden: true },
    },
  ],
}
