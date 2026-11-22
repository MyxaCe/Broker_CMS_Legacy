export const WORDS_PER_MINUTE = 200

type LexicalNode = { type?: string; text?: unknown; children?: unknown; fields?: Record<string, unknown> }

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'quote', 'listitem', 'list', 'block'])

export function lexicalToPlainText(value: unknown): string {
  const root = (value as { root?: LexicalNode } | null | undefined)?.root
  if (!root) return ''
  const parts: string[] = []
  const walk = (node: LexicalNode) => {
    if (typeof node.text === 'string') parts.push(node.text)
    if (node.type === 'linebreak') parts.push('\n')
    if (node.type === 'block' && typeof node.fields?.caption === 'string') parts.push(node.fields.caption)
    if (Array.isArray(node.children)) for (const child of node.children) walk(child as LexicalNode)
    if (node.type && BLOCK_TYPES.has(node.type)) parts.push('\n')
  }
  walk(root)
  return parts.join('').replace(/\n{2,}/g, '\n').trim()
}

export function hasLexicalContent(value: unknown): boolean {
  const children = (value as { root?: { children?: unknown[] } } | null | undefined)?.root?.children
  if (!Array.isArray(children) || children.length === 0) return false
  if (lexicalToPlainText(value)) return true
  return JSON.stringify(children).includes('"type":"upload"') || JSON.stringify(children).includes('"type":"block"')
}

export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.length ?? 0
}

export function readingMinutesFor(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / WORDS_PER_MINUTE))
}
