import type { Access, GlobalConfig } from 'payload'

import {
  notifyPlatformInstruments,
  PLATFORM_INSTRUMENTS_SLUG,
  validatePlatformInstrumentsChange,
} from '../lib/platform-instruments'

const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

export const PlatformInstruments: GlobalConfig = {
  slug: PLATFORM_INSTRUMENTS_SLUG,
  label: 'Инструменты платформы',
  admin: {
    description:
      'Инструменты, которые использует вся платформа: на этот список подписываются модуль рыночных данных и терминал. Сайтам можно включать только инструменты отсюда',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: isAdmin,
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const previous = (originalDoc as { version?: unknown } | undefined)?.version
        return { ...data, version: (typeof previous === 'number' ? previous : 0) + 1 }
      },
    ],
    afterChange: [
      ({ doc }) => {
        void notifyPlatformInstruments().catch((error) =>
          console.warn('[platform-instruments] webhook failed:', error),
        )
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'instruments',
      type: 'json',
      defaultValue: [],
      label: 'Инструменты платформы',
      admin: {
        components: { Field: '/components/PlatformInstrumentsField#PlatformInstrumentsField' },
      },
      validate: (value: unknown, { req }: { req: Parameters<typeof validatePlatformInstrumentsChange>[1] }) =>
        validatePlatformInstrumentsChange(value, req),
    },
    {
      name: 'version',
      type: 'number',
      defaultValue: 0,
      label: 'Версия списка',
      admin: {
        readOnly: true,
        description: 'Растёт при каждом сохранении. По ней модуль рыночных данных и терминал понимают, что список изменился',
      },
    },
  ],
}
