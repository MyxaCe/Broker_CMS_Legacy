import type { Field } from 'payload'

/** Поля раздела «Accounts» (per-site коллекция, бывший глобал). */
export const accountsFields: Field[] = [
    {
      name: 'items',
      type: 'array',
      localized: true,
      label: 'Тарифные планы',
      labels: { singular: 'Тарифный план', plural: 'Тарифные планы' },
      admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
      fields: [
        // 'id' зарезервирован Payload для строк массива — контрактный id хранится как planId
        { name: 'planId', type: 'text', required: true, label: 'ID плана (standard, pro…)' },
        {
          name: 'portfolioKey',
          type: 'text',
          label: 'Портфель платформы (ключ)',
          admin: {
            description:
              'Ключ портфеля плеча в админке платформы: standard, pro, enc_prime. Название, плечо, комиссию и наценку тарифа сайт берёт из этого портфеля; здесь — только описание и преимущества. Заполняется в каждом языке одинаково',
          },
          validate: (value: unknown) =>
            value === undefined || value === null || value === '' || (typeof value === 'string' && /^[A-Za-z0-9_]+$/.test(value))
              ? true
              : 'Ключ портфеля: латиница, цифры, подчёркивание (standard, pro, enc_prime)',
        },
        { name: 'name', type: 'text', required: true, label: 'Название' },
        { name: 'description', type: 'text', required: true, label: 'Описание' },
        {
          name: 'minDeposit',
          type: 'text',
          label: 'Мин. депозит (устарело)',
          admin: { description: 'Устарело — берётся из настроек платформы, сайт это поле не выводит. В текстах — параметр {{deposit.min}}' },
        },
        { name: 'featured', type: 'checkbox', defaultValue: false, label: 'Выделенный план' },
        {
          name: 'features',
          type: 'array',
          label: 'Характеристики',
          labels: { singular: 'Характеристика', plural: 'Характеристики' },
          admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
          fields: [
            { name: 'label', type: 'text', required: true, label: 'Параметр' },
            { name: 'value', type: 'text', required: true, label: 'Значение' },
          ],
        },
        {
          name: 'pricing',
          type: 'group',
          label: 'Тариф (устарело)',
          admin: {
            description:
              'Устарело — плечо, спред и комиссия берутся из настроек платформы (портфель), сайт эти поля не выводит. В текстах — параметры {{account.<key>.leverage}}, {{account.<key>.commission}}, {{account.<key>.markup}}',
          },
          fields: [
            { name: 'spreadPips', type: 'number', min: 0, label: 'Спред, пунктов (устарело)' },
            { name: 'commissionPerLotRT', type: 'number', min: 0, label: 'Комиссия $/лот, round-trip (устарело)' },
          ],
        },
      ],
    },
  ]
