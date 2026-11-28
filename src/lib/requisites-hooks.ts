import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { missingRequisites, requisiteValues } from './requisites'

// = SKELETON_CONTEXT из site-skeleton (не импортируем: site-skeleton сам импортирует коллекции — цикл).
const SKELETON_CONTEXT = 'siteSkeleton'

/**
 * Юридические документы нельзя опубликовать, пока у сайта не заполнены реквизиты,
 * на которые ссылается текст ({{company.name}} и т. п.) — в этом языке.
 * Черновик сохраняется без проверки. Каркас нового сайта и сид не проверяются:
 * их публикует система, а не редактор.
 */
export const requireRequisitesOnPublish: CollectionBeforeChangeHook = async ({ data, originalDoc, req, context }) => {
  if (!data || data._status !== 'published' || !req.user || context?.[SKELETON_CONTEXT]) return data
  const locale = req.locale
  if (!locale || locale === 'all') return data
  const ref = (data.site ?? originalDoc?.site) as string | number | { id?: string | number } | undefined
  const siteId = typeof ref === 'object' ? ref?.id : ref
  if (siteId === undefined || siteId === null || siteId === '') return data
  const site = await req.payload.findByID({ collection: 'sites', id: siteId, locale, depth: 0, req })
  const missing = missingRequisites(data.items, requisiteValues(site as Record<string, any>))
  if (missing.length) {
    throw new APIError(
      `Не заполнены реквизиты сайта (язык ${locale}): ${missing.map((m) => `{{${m}}}`).join(', ')}. ` +
        'Заполните их в «Сайты → Реквизиты для документов» / «Юрлицо и лицензия» и опубликуйте снова. Черновик можно сохранить.',
      400,
      null,
      true,
    )
  }
  return data
}
