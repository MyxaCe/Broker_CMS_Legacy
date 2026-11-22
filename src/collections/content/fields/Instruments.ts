import type { Field } from 'payload'

export const instrumentsFields: Field[] = [
    {
      name: 'items',
      type: 'array',
      localized: true,
      label: 'Инструменты',
      labels: { singular: 'Инструмент', plural: 'Инструменты' },
      admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
      fields: [
        {
          name: 'symbol',
          type: 'text',
          required: true,
          label: 'Символ (EURUSD…)',
          admin: {
            components: { Field: '/components/MdsSymbolField#MdsSymbolField' },
          },
        },
        { name: 'name', type: 'text', required: true, label: 'Название' },
        {
          name: 'category',
          type: 'select',
          required: true,
          label: 'Категория',
          options: ['forex', 'metals', 'crypto', 'indices', 'stocks', 'energy'],
        },
        { name: 'digits', type: 'number', required: true, min: 0, max: 8, label: 'Знаков после запятой' },
        {
          name: 'leverageMax',
          type: 'text',
          label: 'Макс. плечо (устарело)',
          admin: { description: 'Устарело — плечо из портфелей платформы с учётом класса инструмента, сайт это поле не выводит' },
        },
        { name: 'spreadFrom', type: 'text', required: true, label: 'Спред от' },
        { name: 'swapFree', type: 'checkbox', defaultValue: true, label: 'Своп-фри' },
        {
          name: 'icon',
          type: 'upload',
          relationTo: 'media',
          label: 'Иконка (необязательно — сайт сам берёт иконку монеты из MDS)',
        },
      ],
    },
  ]
