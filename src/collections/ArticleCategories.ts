import type { CollectionConfig } from 'payload'

import { fillSiteFromActive, siteListFilter } from '../lib/active-site'
import { slugHook } from '../lib/article-hooks'
import { notifyContentChange } from '../lib/notify-site'

export const ArticleCategories: CollectionConfig = {
  slug: 'article-categories',
  labels: { singular: 'Категория статей', plural: 'Категории статей' },
  admin: {
    useAsTitle: 'title',
    group: 'Контент',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    baseListFilter: siteListFilter,
  },
  hooks: {
    beforeValidate: [fillSiteFromActive, slugHook('article-categories')],
    afterChange: [notifyContentChange('articles')],
  },
  fields: [
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: true,
      index: true,
      label: 'Сайт',
      admin: { condition: () => false },
    },
    { name: 'title', type: 'text', required: true, localized: true, label: 'Название' },
    {
      name: 'slug',
      type: 'text',
      index: true,
      label: 'Slug',
      admin: { position: 'sidebar', description: 'Заполняется из названия; можно поправить.' },
    },
  ],
}
