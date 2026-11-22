import {
  BlockquoteFeature,
  BlocksFeature,
  BoldFeature,
  convertLexicalToMarkdown,
  convertMarkdownToLexical,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  StrikethroughFeature,
  UnderlineFeature,
  UnorderedListFeature,
  UploadFeature,
} from '@payloadcms/richtext-lexical'
import type { Block, Payload } from 'payload'

import { validateVideoUrl } from './video-url'

export const VIDEO_BLOCK_SLUG = 'video'

export const VideoBlock: Block = {
  slug: VIDEO_BLOCK_SLUG,
  labels: { singular: 'Видео', plural: 'Видео' },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      label: 'Ссылка YouTube или Vimeo',
      validate: (value: unknown) =>
        typeof value === 'string' && value.trim() ? validateVideoUrl(value) : 'Вставьте ссылку на видео',
    },
    { name: 'caption', type: 'text', label: 'Подпись (необязательно)' },
  ],
}

export const articleEditor = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
    BoldFeature(),
    ItalicFeature(),
    UnderlineFeature(),
    StrikethroughFeature(),
    UnorderedListFeature(),
    OrderedListFeature(),
    BlockquoteFeature(),
    LinkFeature({ enabledCollections: [] }),
    UploadFeature({ enabledCollections: ['media'] }),
    HorizontalRuleFeature(),
    BlocksFeature({ blocks: [VideoBlock] }),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
  ],
})

type EditorConfig = Parameters<typeof convertMarkdownToLexical>[0]['editorConfig']

export function articleEditorConfig(payload: Payload): EditorConfig {
  const fields = (payload.collections as Record<string, { config: { flattenedFields: Record<string, any>[] } } | undefined>)
    .articles?.config.flattenedFields
  const body = fields?.find((f) => f.name === 'body')
  const config = body?.editor?.editorConfig as EditorConfig | undefined
  if (!config) throw new Error('у коллекции articles нет поля body с редактором Lexical')
  return config
}

export function markdownToLexical(payload: Payload, markdown: string): Record<string, unknown> {
  return convertMarkdownToLexical({ editorConfig: articleEditorConfig(payload), markdown }) as unknown as Record<string, unknown>
}

export function lexicalToMarkdown(payload: Payload, data: unknown): string {
  return convertLexicalToMarkdown({ editorConfig: articleEditorConfig(payload), data: data as never })
}
