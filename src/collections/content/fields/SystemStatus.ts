import type { Field } from 'payload'

export const STATUS_CHECK_OPTIONS = [
  { label: 'Сайт', value: 'site' },
  { label: 'Личный кабинет', value: 'cabinet' },
  { label: 'Терминал (торговля)', value: 'terminal' },
  { label: 'Котировки (сервис и свежесть)', value: 'quotes' },
  { label: 'CMS', value: 'cms' },
  { label: 'Хранилища (базы, шина, кэш)', value: 'storage' },
]

export const INCIDENT_STATE_OPTIONS = [
  { label: 'Расследуем', value: 'investigating' },
  { label: 'Исправляем', value: 'fixing' },
  { label: 'Решено', value: 'resolved' },
]

const isMaintenance = (_: unknown, sibling: { manualStatus?: string }) => sibling?.manualStatus === 'maintenance'

export const systemStatusFields: Field[] = [
    {
      name: 'services',
      type: 'array',
      localized: true,
      label: 'Сервисы',
      labels: { singular: 'Сервис', plural: 'Сервисы' },
      admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
      fields: [
        { name: 'serviceId', type: 'text', required: true, label: 'ID (svc-1, quotes-ws…)' },
        { name: 'name', type: 'text', required: true, label: 'Название' },
        { name: 'description', type: 'text', required: true, label: 'Описание' },
        {
          name: 'check',
          type: 'select',
          options: STATUS_CHECK_OPTIONS,
          label: 'Проверка',
          admin: { description: 'Статус и uptime берутся из мониторинга по этой проверке. Порядок строк = порядок на странице.' },
        },
        {
          name: 'manualStatus',
          type: 'select',
          required: true,
          defaultValue: 'auto',
          options: [
            { label: 'Авто (по мониторингу)', value: 'auto' },
            { label: 'Плановые работы', value: 'maintenance' },
          ],
          label: 'Ручной статус',
        },
        {
          name: 'maintenanceNote',
          type: 'text',
          label: 'Текст о работах',
          admin: { condition: isMaintenance },
        },
        {
          type: 'row',
          admin: { condition: isMaintenance },
          fields: [
            {
              name: 'maintenanceFrom',
              type: 'date',
              label: 'Начало (UTC)',
              admin: { date: { pickerAppearance: 'dayAndTime' } },
            },
            {
              name: 'maintenanceTo',
              type: 'date',
              label: 'Окончание (UTC)',
              admin: { date: { pickerAppearance: 'dayAndTime' } },
            },
          ],
        },
        {
          name: 'status',
          type: 'select',
          options: ['operational', 'degraded', 'outage', 'maintenance'],
          admin: { hidden: true },
        },
        { name: 'uptime90d', type: 'text', admin: { hidden: true } },
      ],
    },
    {
      name: 'incidents',
      type: 'array',
      localized: true,
      label: 'Инциденты',
      labels: { singular: 'Инцидент', plural: 'Инциденты' },
      admin: { components: { RowLabel: '/components/RowLabel#ArrayRowLabel' } },
      fields: [
        {
          name: 'occurredOn',
          type: 'date',
          required: true,
          label: 'Дата',
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
        },
        { name: 'title', type: 'text', required: true, label: 'Заголовок' },
        {
          name: 'state',
          type: 'select',
          required: true,
          options: INCIDENT_STATE_OPTIONS,
          label: 'Статус',
        },
        { name: 'text', type: 'textarea', required: true, label: 'Описание' },
        { name: 'date', type: 'text', admin: { hidden: true } },
        { name: 'status', type: 'text', admin: { hidden: true } },
      ],
    },
  ]
