const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  і: 'i', ї: 'yi', є: 'ye', ґ: 'g',
}

const LATIN_SPECIAL: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', å: 'a', ł: 'l', đ: 'd', ð: 'd', þ: 'th',
}

export const SLUG_MAX_LENGTH = 80
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function transliterate(text: string): string {
  let out = ''
  for (const char of text.toLowerCase()) {
    out += CYRILLIC[char] ?? LATIN_SPECIAL[char] ?? char
  }
  return out.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function slugify(text: unknown): string {
  if (typeof text !== 'string') return ''
  const slug = transliterate(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug.length <= SLUG_MAX_LENGTH) return slug
  const cut = slug.slice(0, SLUG_MAX_LENGTH)
  const lastDash = cut.lastIndexOf('-')
  return (lastDash > SLUG_MAX_LENGTH / 2 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '')
}

export async function uniqueSlug(base: string, isTaken: (candidate: string) => Promise<boolean>): Promise<string> {
  const root = base || 'article'
  if (!(await isTaken(root))) return root
  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`
    const candidate = `${root.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/g, '')}${suffix}`
    if (!(await isTaken(candidate))) return candidate
  }
  throw new Error(`не удалось подобрать свободный slug для «${root}»`)
}
