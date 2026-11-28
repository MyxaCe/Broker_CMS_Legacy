import type { CollectionBeforeChangeHook, CollectionConfig, Field } from 'payload'

import { fillSiteFromActive, siteListFilter } from '../../lib/active-site'
import { liveParamsSummaryField, warnUnknownLiveParams, withLiveParams } from '../../lib/live-params-fields'
import { notifyContentChange } from '../../lib/notify-site'
import { sitePreviewUrl } from '../../lib/preview-url'

export interface SiteContentDef {
  collectionSlug: string
  resource: string
  label: string
  fields: Field[]
  previewPath?: string
  beforeChange?: CollectionBeforeChangeHook[]
}

export function makeSiteContentCollection(def: SiteContentDef): CollectionConfig {
  return {
    slug: def.collectionSlug,
    labels: { singular: def.label, plural: def.label },
    admin: {
      useAsTitle: 'site',
      group: 'Контент',
      defaultColumns: ['site', 'updatedAt', '_status'],
      baseListFilter: siteListFilter,
      ...(def.previewPath ? { preview: sitePreviewUrl(def.previewPath) } : {}),
    },
    versions: { drafts: true },
    hooks: {
      afterChange: [notifyContentChange(def.resource), warnUnknownLiveParams],
      beforeValidate: [fillSiteFromActive],
      ...(def.beforeChange ? { beforeChange: def.beforeChange } : {}),
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
        admin: {
          condition: () => false,
        },
      },
      liveParamsSummaryField,
      ...withLiveParams(def.fields),
    ],
  }
}
