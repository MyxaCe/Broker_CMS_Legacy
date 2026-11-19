import type { Field } from 'payload'

/** Поля раздела «Promotions» (per-site коллекция, бывший глобал). */
export const promotionsFields: Field[] = [
    {
      name: 'items',
      type: 'array',
      localized: true,
      label: 'Акции',
      labels: { singular: 'Акция', plural: 'Акции' },
      admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
      fields: [
        { name: 'promoId', type: 'text', required: true, label: 'ID акции в CMS (promo-1…)' },
        {
          name: 'enginePromoId',
          type: 'text',
          label: 'ID акции в движке платформы',
          admin: {
            description:
              'Идентификатор акции в движке акций платформы (раздел «Акции» админки). Сайт показывает эти тексты и картинки только к активной акции движка; условия и цифры — из движка. Заполняется в каждом языке одинаково',
          },
        },
        { name: 'badge', type: 'text', required: true, label: 'Бейдж' },
        { name: 'title', type: 'text', required: true, label: 'Заголовок' },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          label: 'Описание',
          admin: { description: 'Размер бонуса и другие цифры — не числом, а параметром {{…}} или из движка акций' },
        },
        {
          name: 'terms',
          type: 'textarea',
          required: true,
          label: 'Условия',
          admin: { description: 'Цифры условий — параметром {{…}} или из движка акций' },
        },
        { name: 'ctaLabel', type: 'text', required: true, label: 'Кнопка: текст' },
        { name: 'ctaHref', type: 'text', required: true, label: 'Кнопка: ссылка' },
        { name: 'featured', type: 'checkbox', defaultValue: false, label: 'Главная акция' },
        {
          name: 'activeFrom',
          type: 'date',
          label: 'Активна с (устарело)',
          admin: { description: 'Устарело — сроки и активность акции берутся из движка акций платформы' },
        },
        {
          name: 'activeTo',
          type: 'date',
          label: 'Активна до (устарело)',
          admin: { description: 'Устарело — сроки и активность акции берутся из движка акций платформы' },
        },
      ],
    },
  ]
