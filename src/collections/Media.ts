import path from 'node:path'

import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Альтернативный текст',
    },
  ],
  upload: {
    staticDir: path.resolve(process.cwd(), 'media'),
  },
}
