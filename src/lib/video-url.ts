export type VideoProvider = 'youtube' | 'vimeo'

export interface ParsedVideo {
  provider: VideoProvider
  videoId: string
}

export const VIDEO_URL_ERROR =
  'Нужна ссылка на видео YouTube или Vimeo, например https://www.youtube.com/watch?v=… или https://vimeo.com/123456789'
export const JOIN_URL_ERROR = 'Нужна ссылка, начинающаяся с https://'

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const VIMEO_ID = /^\d{5,12}$/
const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'])
const VIMEO_HOSTS = new Set(['vimeo.com', 'player.vimeo.com'])

function toUrl(raw: string): URL | null {
  const text = raw.trim()
  if (!text || /\s/.test(text)) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

export function parseVideoUrl(raw: unknown): ParsedVideo | null {
  if (typeof raw !== 'string') return null
  const url = toUrl(raw)
  if (!url) return null
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const parts = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be') {
    const id = parts[0] ?? ''
    return YOUTUBE_ID.test(id) ? { provider: 'youtube', videoId: id } : null
  }
  if (YOUTUBE_HOSTS.has(host)) {
    let id = ''
    if (parts[0] === 'watch' && parts.length === 1) id = url.searchParams.get('v') ?? ''
    else if (['live', 'shorts', 'embed', 'v'].includes(parts[0] ?? '') && parts.length === 2) id = parts[1]!
    return YOUTUBE_ID.test(id) ? { provider: 'youtube', videoId: id } : null
  }
  if (VIMEO_HOSTS.has(host)) {
    let id = ''
    if (host === 'player.vimeo.com') {
      if (parts[0] === 'video' && parts.length === 2) id = parts[1]!
    } else if (VIMEO_ID.test(parts[0] ?? '') && parts.length <= 2) {
      id = parts[0]!
    } else if (['channels', 'groups', 'showcase', 'video'].includes(parts[0] ?? '')) {
      id = parts[parts.length - 1] ?? ''
    }
    return VIMEO_ID.test(id) ? { provider: 'vimeo', videoId: id } : null
  }
  return null
}

export function isHttpsUrl(raw: unknown): boolean {
  if (typeof raw !== 'string' || !raw.trim() || /\s/.test(raw.trim())) return false
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'https:' && Boolean(url.hostname) && url.hostname.includes('.')
  } catch {
    return false
  }
}

const blank = (value: unknown) => value === undefined || value === null || (typeof value === 'string' && !value.trim())

export function validateVideoUrl(value: unknown): true | string {
  return blank(value) || parseVideoUrl(value) ? true : VIDEO_URL_ERROR
}

export function validateJoinUrl(value: unknown): true | string {
  return blank(value) || isHttpsUrl(value) ? true : JOIN_URL_ERROR
}

export function videoFromUrl(value: unknown): (ParsedVideo & { url: string }) | null {
  const parsed = parseVideoUrl(value)
  return parsed ? { ...parsed, url: toUrl(String(value))!.href } : null
}
