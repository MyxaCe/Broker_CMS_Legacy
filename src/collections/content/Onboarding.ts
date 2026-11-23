import type { CollectionConfig } from 'payload'

import { fillSiteFromActive, siteListFilter } from '../../lib/active-site'
import { notifyContentChange } from '../../lib/notify-site'
import {
  anchorFitsPart,
  isOnboardingPart,
  ONBOARDING_ANCHORS,
  ONBOARDING_PART_LABELS,
  ONBOARDING_PARTS,
} from '../../lib/onboarding-anchors'

type Row = { part?: unknown; steps?: { anchor?: unknown }[] | null }

function partLabel(part: unknown): string {
  return isOnboardingPart(part) ? ONBOARDING_PART_LABELS[part] : String(part ?? '')
}

/** Одна часть — один раз; каждый шаг указывает на элемент своей части. */
export function validateOnboardingParts(value: unknown): true | string {
  const rows = (Array.isArray(value) ? value : []) as Row[]
  const seen = new Set<string>()
  for (const row of rows) {
    const part = String(row.part ?? '')
    if (seen.has(part)) return `Часть «${partLabel(row.part)}» указана дважды`
    seen.add(part)
    for (const step of row.steps ?? []) {
      if (!anchorFitsPart(step.anchor, row.part)) {
        return `Шаг указывает на «${String(step.anchor ?? '')}» — этот элемент не из части «${partLabel(row.part)}»`
      }
    }
  }
  return true
}

/**
 * Экскурсия по платформе: регистрация → кабинет → терминал (docs/site/интерактивное-обучение.md).
 * Тексты на каждом языке и для каждого сайта; кнопка «?» в кабинете и терминале.
 */
export const Onboarding: CollectionConfig = {
  slug: 'site-onboarding',
  labels: { singular: 'Экскурсия по платформе', plural: 'Экскурсия по платформе' },
  admin: {
    useAsTitle: 'site',
    group: 'Кабинет',
    defaultColumns: ['site', 'updatedAt', '_status'],
    baseListFilter: siteListFilter,
    description:
      'Подсказки по шагам: экран затемняется, подсвечивается один элемент, рядом карточка с текстом. ' +
      'Новичку каждая часть показывается сама один раз, остальным — по кнопке «?».',
  },
  versions: { drafts: true },
  hooks: {
    afterChange: [notifyContentChange('onboarding')],
    beforeValidate: [fillSiteFromActive],
  },
  fields: [
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: true,
      unique: true,
      index: true,
      label: 'Сайт',
      admin: { condition: () => false },
    },
    {
      name: 'labels',
      type: 'group',
      label: 'Кнопки',
      fields: [
        { name: 'back', type: 'text', localized: true, label: '«Назад»' },
        { name: 'next', type: 'text', localized: true, label: '«Далее»' },
        { name: 'skip', type: 'text', localized: true, label: '«Пропустить»' },
        { name: 'done', type: 'text', localized: true, label: '«Готово»' },
        { name: 'help', type: 'text', localized: true, label: 'Подпись кнопки «?»' },
        {
          name: 'stepOf',
          type: 'text',
          localized: true,
          label: 'Счётчик шагов',
          admin: { description: '{current} и {total} подставляются: «Шаг {current} из {total}»' },
        },
      ],
    },
    {
      name: 'parts',
      type: 'array',
      localized: true,
      label: 'Части экскурсии',
      labels: { singular: 'Часть', plural: 'Части' },
      validate: (value: unknown) => validateOnboardingParts(value),
      fields: [
        {
          name: 'part',
          type: 'select',
          required: true,
          label: 'Часть',
          options: ONBOARDING_PARTS.map((value) => ({ value, label: ONBOARDING_PART_LABELS[value] })),
        },
        { name: 'enabled', type: 'checkbox', defaultValue: true, label: 'Показывать' },
        {
          name: 'version',
          type: 'number',
          required: true,
          defaultValue: 1,
          min: 1,
          label: 'Версия',
          admin: {
            description:
              'Увеличьте после заметных изменений — часть снова покажется сама новичкам, которые уже видели прежнюю версию',
          },
        },
        {
          name: 'steps',
          type: 'array',
          label: 'Шаги (по порядку)',
          fields: [
            {
              name: 'anchor',
              type: 'select',
              required: true,
              label: 'Элемент',
              options: ONBOARDING_ANCHORS,
              admin: { description: 'Если элемента нет на экране (например, нет открытых позиций), шаг пропускается' },
            },
            { name: 'title', type: 'text', label: 'Заголовок' },
            { name: 'body', type: 'textarea', label: 'Текст (коротко, без HTML)' },
          ],
        },
      ],
    },
  ],
}
