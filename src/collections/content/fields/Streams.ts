import type { Field, FieldHook } from 'payload'

import { parseVideoUrl, validateVideoUrl } from '../../../lib/video-url'

const hasUrl = (row: Record<string, unknown> | undefined) =>
  typeof row?.videoUrl === 'string' && row.videoUrl.trim() !== ''

const fromUrl =
  (part: 'provider' | 'videoId'): FieldHook =>
  ({ value, siblingData }) =>
    parseVideoUrl(siblingData?.videoUrl)?.[part] ?? value

export const streamsFields: Field[] = [
    {
      name: 'items',
      type: 'array',
      localized: true,
      label: 'Эфиры',
      labels: { singular: 'Эфир', plural: 'Эфиры' },
      admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
      fields: [
        {
          name: 'videoUrl',
          type: 'text',
          label: 'Ссылка на видео',
          validate: validateVideoUrl,
          admin: { description: 'Ссылка YouTube или Vimeo. Платформа и ID видео заполнятся сами при сохранении.' },
        },
        {
          name: 'provider',
          type: 'select',
          required: true,
          options: ['youtube', 'vimeo'],
          defaultValue: 'youtube',
          label: 'Платформа',
          hooks: { beforeValidate: [fromUrl('provider')] },
          admin: { condition: (_, row) => !hasUrl(row) },
        },
        {
          name: 'videoId',
          type: 'text',
          required: true,
          label: 'ID видео',
          hooks: { beforeValidate: [fromUrl('videoId')] },
          admin: { condition: (_, row) => !hasUrl(row) },
        },
        { name: 'title', type: 'text', required: true, label: 'Название' },
        { name: 'poster', type: 'upload', relationTo: 'media', label: 'Постер' },
        { name: 'startsAt', type: 'date', required: true, label: 'Дата и время', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: ['live', 'upcoming', 'past'],
          label: 'Статус',
        },
      ],
    },
  ]
