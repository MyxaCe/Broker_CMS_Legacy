import type { PayloadRequest } from 'payload'

import { RESOURCE_TO_COLLECTION } from '../collections/content/index'
import { RESOURCE_MAPPERS } from './contract/resources'
import { DEFAULT_SITE_LANGUAGE, isLanguage, type Language } from './languages'

/**
 * Каркас разделов нового сайта (ТД-004).
 *
 * У каждого сайта по одному документу в каждой контентной коллекции: витрина и кабинет
 * читают их через /v1/cms/<ресурс>?site=<slug>. Нет документа или он не опубликован —
 * CMS отвечает 404, а витрина считает это отказом CMS и показывает 503. Поэтому каркас:
 * - публикуется сразу (а не черновиком), иначе новый сайт целиком «лежит»;
 * - пустой: пустые списки проходят контракт, а витрина сама скрывает пустые разделы.
 *   Никаких выдуманных реквизитов, текстов юриста, чужого бренда;
 * - создаётся в той же транзакции, что и сайт (`req`): раньше вставка шла отдельным
 *   соединением и падала на внешнем ключе — сайт ещё не был зафиксирован;
 * - идемпотентен: есть документ — не трогаем (правки редактора не перезаписываются).
 *
 * Исключение из «пусто» — главная кабинета: это не тексты, а набор модулей и порядок.
 * Без модулей у клиента нового сайта пустая главная, поэтому кладём стандартный набор.
 */

export const SKELETON_CONTEXT = 'siteSkeleton'

const CABINET_HOME_MODULES = [
  { type: 'profile', enabled: true },
  { type: 'onboarding', enabled: true, steps: { verification: true, deposit: true, firstTrade: true } },
  { type: 'balance', enabled: true, buttons: { deposit: true, withdraw: true, buyFiat: false } },
  {
    type: 'markets',
    enabled: true,
    tabs: { assets: true, popular: true, newListing: false, favorites: false, gainers: true, volume: true },
  },
  { type: 'promotions', enabled: true },
]

/** Данные пустого каркаса по ресурсу. Всё, чего нет в списке, создаётся как `{}`. */
export function skeletonData(resource: string): Record<string, unknown> {
  if (resource === 'cabinet-home') return { modules: CABINET_HOME_MODULES.map((m) => ({ ...m })) }
  return {}
}

/**
 * Документ — нетронутый каркас: его ответ в контракте совпадает с ответом пустого каркаса.
 * Нужен сиду: такой документ можно заполнить фикстурами, а правки редактора — нельзя.
 */
export function isSkeletonContent(resource: string, doc: Record<string, unknown>): boolean {
  const mapper = RESOURCE_MAPPERS[resource]
  if (!mapper) return false
  return JSON.stringify(mapper(doc)) === JSON.stringify(mapper(skeletonData(resource)))
}

/** Что переносит «Скопировать структуру с сайта»: только устройство, без юридических текстов и бренда. */
export const COPYABLE_RESOURCES = ['navigation', 'cabinet-home'] as const

function stripIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripIds)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value)) {
      if (key === 'id') continue
      out[key] = stripIds(inner)
    }
    return out
  }
  return value
}

export function structureOf(resource: string, doc: Record<string, any>): Record<string, unknown> | null {
  if (resource === 'navigation') {
    // Пункты меню и колонки подвала — да; предупреждение о рисках — нет: это юридический
    // текст, у новой страны он свой.
    return stripIds({ header: doc.header ?? [], footerColumns: doc.footerColumns ?? [], riskWarning: '' }) as Record<
      string,
      unknown
    >
  }
  if (resource === 'cabinet-home') {
    // Набор модулей и вкладок; символы «нового листинга» — нет, у сайта свои инструменты.
    const modules = ((doc.modules ?? []) as Record<string, unknown>[]).map((m) => {
      const { newListingSymbols: _symbols, ...rest } = m
      return rest
    })
    return stripIds({ modules }) as Record<string, unknown>
  }
  return null
}

export interface SkeletonOptions {
  req?: PayloadRequest
  /** id сайта-образца для «Скопировать структуру с сайта». */
  copyFrom?: string | number | null
  /** Язык, в котором создаётся каркас (язык сайта по умолчанию). */
  locale?: unknown
}

interface PayloadLike {
  find: (a: Record<string, unknown>) => Promise<{ docs: Record<string, any>[] }>
  create: (a: Record<string, unknown>) => Promise<{ id: string | number }>
}

export async function ensureSiteSkeleton(
  payload: unknown,
  siteId: string | number,
  options: SkeletonOptions = {},
): Promise<Record<string, string | number>> {
  const api = payload as PayloadLike
  const { req } = options
  const locale: Language = isLanguage(options.locale) ? options.locale : DEFAULT_SITE_LANGUAGE
  const common = { ...(req ? { req } : {}), overrideAccess: true, depth: 0 }
  const ids: Record<string, string | number> = {}

  for (const [resource, collection] of Object.entries(RESOURCE_TO_COLLECTION)) {
    const existing = await api.find({ ...common, collection, where: { site: { equals: siteId } }, limit: 1 })
    if (existing.docs[0]) {
      ids[collection] = existing.docs[0].id
      continue
    }

    let data = skeletonData(resource)
    if (options.copyFrom != null && (COPYABLE_RESOURCES as readonly string[]).includes(resource)) {
      const source = await api.find({
        ...common,
        collection,
        where: { site: { equals: options.copyFrom } },
        limit: 1,
        locale,
      })
      const copied = source.docs[0] ? structureOf(resource, source.docs[0]) : null
      if (copied) data = copied
    }

    try {
      const created = await api.create({
        ...common,
        collection,
        locale,
        context: { [SKELETON_CONTEXT]: true },
        data: { ...data, site: siteId, _status: 'published' },
      })
      ids[collection] = created.id
    } catch (error) {
      // Внутри транзакции сайта ошибка вставки обрывает всю транзакцию — глотать её нельзя:
      // получился бы сайт без половины разделов (витрина отдала бы 503). Пусть создание
      // сайта откажет целиком и скажет почему.
      throw new Error(`Каркас сайта: раздел «${resource}» не создан: ${(error as Error).message}`)
    }
  }
  return ids
}
