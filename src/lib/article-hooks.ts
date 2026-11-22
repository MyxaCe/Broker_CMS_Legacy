import type { CollectionAfterChangeHook, CollectionBeforeValidateHook, Payload, PayloadRequest } from 'payload'
import { ValidationError } from 'payload'

import { lexicalToMarkdown, markdownToLexical } from './article-editor'
import { slugify, uniqueSlug } from './article-slug'
import { hasLexicalContent, lexicalToPlainText, readingMinutesFor } from './article-text'
import { notifyContentChange } from './notify-site'

type Doc = Record<string, any>

export const SLUG_TAKEN_ERROR = 'Такой адрес (slug) на этом сайте уже занят'

export interface ArticleContext {
  trustReadingMinutes?: boolean
  allowDuplicateSlug?: boolean
}

const idOf = (value: unknown): string | number | null => {
  if (value && typeof value === 'object') return ((value as Doc).id ?? null) as string | number | null
  return (value ?? null) as string | number | null
}

export async function isSlugTaken(
  payload: Payload,
  collection: 'articles' | 'article-categories',
  site: unknown,
  slug: string,
  selfId: unknown,
  req?: PayloadRequest,
): Promise<boolean> {
  const siteId = idOf(site)
  const self = idOf(selfId)
  const and: Doc[] = [{ slug: { equals: slug } }]
  if (siteId !== null) and.push({ site: { equals: siteId } })
  if (self !== null) and.push({ id: { not_equals: self } })
  const found = await payload.count({ collection, where: { and }, req, overrideAccess: true } as never)
  return found.totalDocs > 0
}

async function wasPublished(payload: Payload, id: unknown, req: PayloadRequest): Promise<boolean> {
  const self = idOf(id)
  if (self === null) return false
  const versions = await payload.countVersions({
    collection: 'articles',
    where: { and: [{ parent: { equals: self } }, { 'version._status': { equals: 'published' } }] },
    req,
  } as never)
  return versions.totalDocs > 0
}

function isAutoSlug(slug: unknown, title: unknown): boolean {
  const base = slugify(title)
  return typeof slug === 'string' && Boolean(base) && (slug === base || new RegExp(`^${base}-\\d+$`).test(slug))
}

export function slugHook(collection: 'articles' | 'article-categories'): CollectionBeforeValidateHook {
  return async ({ data, originalDoc, req, operation, context }) => {
    if (!data) return data
    const ctx = context as ArticleContext
    const title = data.title ?? originalDoc?.title
    const site = data.site ?? originalDoc?.site
    const previous = originalDoc?.slug as string | undefined
    const typed = typeof data.slug === 'string' ? data.slug : undefined

    let target: string | undefined
    let manual = false
    if (typed !== undefined && typed.trim() && typed !== previous) {
      target = slugify(typed)
      manual = Boolean(target)
    }
    if (!target && (operation === 'create' || !previous || (typed !== undefined && !typed.trim()))) {
      target = slugify(title)
    }
    if (
      !target &&
      collection === 'articles' &&
      previous &&
      (typed === undefined || typed === previous) &&
      data.title !== undefined &&
      data._status !== 'published' &&
      isAutoSlug(previous, originalDoc?.title) &&
      !isAutoSlug(previous, data.title) &&
      !(await wasPublished(req.payload, originalDoc?.id, req))
    ) {
      target = slugify(data.title)
    }
    if (!target) return data

    const taken = (candidate: string) => isSlugTaken(req.payload, collection, site, candidate, originalDoc?.id, req)
    if (manual && !ctx.allowDuplicateSlug && (await taken(target))) {
      throw new ValidationError({ collection, errors: [{ message: SLUG_TAKEN_ERROR, path: 'slug' }] })
    }
    data.slug = manual || ctx.allowDuplicateSlug ? target : await uniqueSlug(target, taken)
    return data
  }
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export const syncArticleBody: CollectionBeforeValidateHook = ({ data, originalDoc, req, context }) => {
  if (!data) return data
  const payload = req.payload
  const markdownChanged = typeof data.bodyMarkdown === 'string' && data.bodyMarkdown !== (originalDoc?.bodyMarkdown ?? '')
  const bodyChanged = data.body !== undefined && !sameJson(data.body, originalDoc?.body)

  if (bodyChanged && !markdownChanged) {
    data.bodyMarkdown = hasLexicalContent(data.body) ? lexicalToMarkdown(payload, data.body) : ''
  } else if (markdownChanged && !bodyChanged) {
    data.body = data.bodyMarkdown.trim() ? markdownToLexical(payload, data.bodyMarkdown) : null
  }

  const body = data.body !== undefined ? data.body : originalDoc?.body
  const markdown = data.bodyMarkdown !== undefined ? data.bodyMarkdown : originalDoc?.bodyMarkdown
  const text = hasLexicalContent(body) ? lexicalToPlainText(body) : String(markdown ?? '')
  const explicit = Number(data.readingMinutes)
  if (!((context as ArticleContext).trustReadingMinutes && Number.isInteger(explicit) && explicit > 0)) {
    data.readingMinutes = readingMinutesFor(text)
  }
  return data
}

const notifyArticles = notifyContentChange('articles')
const notifyAcademy = notifyContentChange('academy')

export const notifyArticleChange: CollectionAfterChangeHook = async (args) => {
  await notifyArticles(args as never)
  if (args.doc?.section === 'education' || args.previousDoc?.section === 'education') await notifyAcademy(args as never)
  return args.doc
}
