import type { CollectionConfig, Validate } from 'payload'

import { activeSiteId, fillSiteFromActive, siteListFilter } from '../lib/active-site'
import { articleEditor } from '../lib/article-editor'
import { notifyArticleChange, slugHook, syncArticleBody } from '../lib/article-hooks'
import { hasLexicalContent } from '../lib/article-text'
import { liveParamsSummaryField, warnUnknownLiveParams, withLiveParams } from '../lib/live-params-fields'
import { articlePreviewPath, sitePreviewUrlFor } from '../lib/preview-url'
import { validateVideoUrl } from '../lib/video-url'

export const ARTICLE_SECTIONS = ['news', 'education'] as const
export type ArticleSection = (typeof ARTICLE_SECTIONS)[number]

const isNews = (_: unknown, sibling: Record<string, unknown>) => sibling?.section !== 'education'
const isEducation = (_: unknown, sibling: Record<string, unknown>) => sibling?.section === 'education'

const requiredFor =
  (section: ArticleSection, message: string): Validate =>
  (value, { siblingData }) => {
    const current = (siblingData as Record<string, unknown>)?.section ?? 'news'
    if (current !== section) return true
    return value !== undefined && value !== null && String(value).trim() !== '' ? true : message
  }

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Статья', plural: 'Статьи' },
  admin: {
    useAsTitle: 'title',
    group: 'Контент',
    defaultColumns: ['title', 'section', 'articleCategory', 'publishedAt', '_status'],
    baseListFilter: siteListFilter,
    preview: sitePreviewUrlFor(articlePreviewPath),
  },
  versions: { drafts: { autosave: { interval: 1000 } } },
  hooks: {
    afterChange: [notifyArticleChange, warnUnknownLiveParams],
    beforeValidate: [fillSiteFromActive, slugHook('articles'), syncArticleBody],
  },
  fields: withLiveParams([
    liveParamsSummaryField,
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: true,
      index: true,
      label: 'Сайт',
      admin: {
        condition: () => false,
      },
    },
    {
      name: 'section',
      type: 'select',
      required: true,
      defaultValue: 'news',
      index: true,
      label: 'Раздел',
      options: [
        { label: 'Новости и аналитика', value: 'news' },
        { label: 'Обучение', value: 'education' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'slug',
      type: 'text',
      index: true,
      label: 'Адрес (slug)',
      admin: {
        position: 'sidebar',
        description: 'Заполняется из заголовка. Можно поправить; после публикации лучше не менять.',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      label: 'Дата публикации',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Дата в будущем — статья появится на сайте в это время.',
      },
    },
    {
      name: 'readingMinutes',
      type: 'number',
      min: 1,
      localized: true,
      label: 'Минут чтения',
      admin: { position: 'sidebar', readOnly: true, description: 'Считается из текста при сохранении.' },
    },
    { name: 'title', type: 'text', required: true, localized: true, label: 'Заголовок' },
    { name: 'excerpt', type: 'textarea', required: true, localized: true, label: 'Анонс' },
    { name: 'cover', type: 'upload', relationTo: 'media', label: 'Обложка' },
    {
      name: 'articleCategory',
      type: 'relationship',
      relationTo: 'article-categories',
      label: 'Категория',
      validate: requiredFor('news', 'Выберите категорию'),
      filterOptions: async ({ siblingData, data, req }) => {
        const site = (siblingData as Record<string, any>)?.site ?? (data as Record<string, any>)?.site
        const id = (site && typeof site === 'object' ? site.id : site) ?? (await activeSiteId(req))
        return id ? { site: { equals: id } } : true
      },
      admin: { condition: isNews },
    },
    {
      name: 'source',
      type: 'text',
      localized: true,
      label: 'Источник',
      validate: requiredFor('news', 'Укажите источник'),
      admin: { condition: isNews },
    },
    {
      name: 'level',
      type: 'select',
      label: 'Уровень',
      defaultValue: 'beginner',
      options: [
        { label: 'Начальный', value: 'beginner' },
        { label: 'Средний', value: 'intermediate' },
        { label: 'Профессиональный', value: 'advanced' },
      ],
      validate: requiredFor('education', 'Выберите уровень'),
      admin: { condition: isEducation },
    },
    {
      name: 'videoUrl',
      type: 'text',
      localized: true,
      label: 'Видео к статье',
      validate: validateVideoUrl,
      admin: {
        condition: isEducation,
        description: 'Необязательно. Ссылка YouTube или Vimeo — плеер появится вверху статьи.',
      },
    },
    {
      name: 'body',
      type: 'richText',
      localized: true,
      label: 'Текст',
      editor: articleEditor,
      validate: (value: unknown) => (hasLexicalContent(value) ? true : 'Напишите текст статьи'),
    },
    {
      name: 'bodyMarkdown',
      type: 'textarea',
      localized: true,
      label: 'Текст (Markdown, для совместимости)',
      admin: { condition: () => false },
    },
    {
      name: 'category',
      type: 'text',
      label: 'Категория (старое текстовое поле)',
      admin: { condition: () => false },
    },
  ]),
}
