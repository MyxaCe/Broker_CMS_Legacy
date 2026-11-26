import type { Field } from 'payload'

export const navigationFields: Field[] = [
    {
      name: 'header',
      type: 'array',
      localized: true,
      label: 'Меню шапки',
      labels: { singular: 'Пункт меню', plural: 'Пункты меню' },
      admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
      fields: [
        { name: 'label', type: 'text', required: true, label: 'Текст' },
        { name: 'href', type: 'text', required: true, label: 'Ссылка (путь без локали)' },
      ],
    },
    {
      name: 'footerColumns',
      type: 'array',
      localized: true,
      label: 'Колонки футера',
      labels: { singular: 'Колонка', plural: 'Колонки' },
      admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Заголовок колонки' },
        {
          name: 'links',
          type: 'array',
          label: 'Ссылки',
          labels: { singular: 'Ссылка', plural: 'Ссылки' },
          admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
          fields: [
            { name: 'label', type: 'text', required: true, label: 'Текст' },
            { name: 'href', type: 'text', required: true, label: 'Ссылка (путь без локали)' },
          ],
        },
      ],
    },
    {
      name: 'riskWarning',
      type: 'textarea',
      localized: true,
      required: true,
      label: 'Предупреждение о рисках (футер)',
      // Обязательно для редактора. Исключение — пустой каркас нового сайта (ТД-004): текст
      // о рисках зависит от юрисдикции, выдумывать его нельзя; пока он пуст, витрина его не выводит.
      validate: (value: unknown, { req }: { req?: { context?: Record<string, unknown> } }) => {
        if (req?.context?.siteSkeleton) return true
        return typeof value === 'string' && value.trim().length > 0 ? true : 'Заполните предупреждение о рисках'
      },
    },
  ]
