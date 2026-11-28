import type { Field } from 'payload'

export const legalFields: Field[] = [
    {
      name: 'items',
      type: 'array',
      localized: true,
      label: 'Документы',
      labels: { singular: 'Документ', plural: 'Документы' },
      admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
      fields: [
        { name: 'slug', type: 'text', required: true, label: 'Slug (privacy, terms…)' },
        { name: 'title', type: 'text', required: true, label: 'Название' },
        { name: 'updatedAt', type: 'text', required: true, label: 'Обновлено (YYYY-MM-DD)' },
        {
          name: 'intro',
          type: 'textarea',
          label: 'Вступление',
          admin: { description: 'Необязательно: короткий абзац под заголовком, он же описание страницы для поисковиков' },
        },
        {
          name: 'sections',
          type: 'array',
          label: 'Разделы',
          labels: { singular: 'Раздел', plural: 'Разделы' },
          admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
          fields: [
            {
              name: 'heading',
              type: 'text',
              label: 'Заголовок',
              admin: { description: 'Можно оставить пустым, если документ — сплошной текст без разделов' },
            },
            {
              name: 'paragraphsMarkdown',
              type: 'array',
              label: 'Абзацы (Markdown)',
              labels: { singular: 'Абзац', plural: 'Абзацы' },
              admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
              fields: [{ name: 'text', type: 'textarea', required: true, label: 'Абзац' }],
            },
          ],
        },
      ],
    },
  ]
