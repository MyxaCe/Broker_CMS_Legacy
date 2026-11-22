import 'dotenv/config'

import assert from 'node:assert/strict'

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import { GET } from '../src/app/v1/cms/[...path]/route'
import { mapAcademy, mapStreams } from '../src/lib/contract/mappers'
import { validateContract } from '../src/lib/contract/validate'
import { JOIN_URL_ERROR, isHttpsUrl, parseVideoUrl, validateJoinUrl, validateVideoUrl } from '../src/lib/video-url'

type Doc = Record<string, any>

const API_KEY = 'video-test-key'
process.env.CMS_API_KEY = API_KEY
let failures = 0

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.info(`OK    ${name}`)
  } catch (error) {
    failures++
    console.info(`FAIL  ${name}\n      ${error instanceof Error ? error.message : String(error)}`)
  }
}

const YT = 'dQw4w9WgXcQ'

await check('ссылки YouTube: все виды дают youtube + ID', () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${YT}`,
    `https://youtube.com/watch?v=${YT}&t=42s&list=PL123`,
    `https://www.youtube.com/watch?feature=share&v=${YT}`,
    `https://m.youtube.com/watch?v=${YT}`,
    `http://www.youtube.com/watch?v=${YT}`,
    `www.youtube.com/watch?v=${YT}`,
    `youtube.com/watch?v=${YT}`,
    `https://youtu.be/${YT}`,
    `https://youtu.be/${YT}?si=abcDEF123&t=10`,
    `https://www.youtube.com/live/${YT}`,
    `https://www.youtube.com/live/${YT}?si=xyz`,
    `https://www.youtube.com/shorts/${YT}`,
    `https://youtube.com/shorts/${YT}?feature=share`,
    `https://www.youtube.com/embed/${YT}`,
    `https://www.youtube.com/embed/${YT}?start=30&autoplay=1`,
    `https://www.youtube-nocookie.com/embed/${YT}`,
    `  https://www.youtube.com/watch?v=${YT}  `,
    `https://WWW.YOUTUBE.COM/watch?v=${YT}`,
    `https://www.youtube.com/watch?v=${YT}#t=1m`,
  ]) {
    assert.deepEqual(parseVideoUrl(url), { provider: 'youtube', videoId: YT }, url)
  }
  assert.deepEqual(parseVideoUrl('https://youtu.be/a-b_c123456'), { provider: 'youtube', videoId: 'a-b_c123456' })
})

await check('ссылки Vimeo: vimeo.com/<id> и player.vimeo.com/video/<id>', () => {
  for (const url of [
    'https://vimeo.com/76979871',
    'https://www.vimeo.com/76979871',
    'vimeo.com/76979871',
    'https://vimeo.com/76979871?share=copy',
    'https://vimeo.com/76979871/a1b2c3d4e5',
    'https://player.vimeo.com/video/76979871',
    'https://player.vimeo.com/video/76979871?h=abc&autoplay=1',
    'https://vimeo.com/channels/staffpicks/76979871',
    'https://vimeo.com/groups/name/videos/76979871',
    'https://vimeo.com/showcase/123456/video/76979871',
  ]) {
    assert.deepEqual(parseVideoUrl(url), { provider: 'vimeo', videoId: '76979871' }, url)
  }
})

await check('неподходящие ссылки: отказ', () => {
  for (const url of [
    '',
    '   ',
    'просто текст',
    YT,
    'https://www.youtube.com/',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/watch?v=short',
    `https://www.youtube.com/watch?v=${YT}x`,
    'https://www.youtube.com/channel/UC1234567890',
    'https://www.youtube.com/@somechannel',
    'https://www.youtube.com/playlist?list=PL1234567890',
    'https://youtu.be/',
    `https://youtube.com.evil.example/watch?v=${YT}`,
    `https://evil.example/watch?v=${YT}`,
    `https://notyoutube.com/watch?v=${YT}`,
    'https://vimeo.com/',
    'https://vimeo.com/user12345',
    'https://vimeo.com/abc',
    'https://player.vimeo.com/76979871',
    'https://player.vimeo.com/video/abc',
    'https://zoom.us/j/123456789',
    `javascript:alert(1)//youtube.com/watch?v=${YT}`,
    `ftp://youtube.com/watch?v=${YT}`,
    `https://www.youtube.com/watch?v=${YT} extra`,
  ]) {
    assert.equal(parseVideoUrl(url), null, url)
  }
  assert.equal(parseVideoUrl(42), null)
  assert.equal(parseVideoUrl(null), null)
})

await check('проверки полей: пусто можно, плохая ссылка — понятная ошибка по-русски', () => {
  assert.equal(validateVideoUrl(''), true)
  assert.equal(validateVideoUrl(null), true)
  assert.equal(validateVideoUrl(undefined), true)
  assert.equal(validateVideoUrl(`https://youtu.be/${YT}`), true)
  const error = validateVideoUrl('https://example.com/video')
  assert.equal(typeof error, 'string')
  assert.match(String(error), /YouTube или Vimeo/)
  assert.equal(validateJoinUrl(''), true)
  assert.equal(validateJoinUrl('https://zoom.us/j/123456789?pwd=abc'), true)
  assert.equal(validateJoinUrl('http://zoom.us/j/1'), JOIN_URL_ERROR)
  assert.equal(validateJoinUrl('zoom.us/j/1'), JOIN_URL_ERROR)
  assert.equal(validateJoinUrl('javascript:alert(1)'), JOIN_URL_ERROR)
  assert.equal(isHttpsUrl('https://localhost'), false)
})

await check('контракт: без новых полей ответ прежний, с ними — валиден, ссылка без схемы дополняется https://', () => {
  const plain = mapStreams({ items: [{ provider: 'vimeo', videoId: '1', title: 't', startsAt: '2026-01-01T00:00:00Z', status: 'past' }] })
  assert.deepEqual(Object.keys(plain.items[0]).sort(), ['poster', 'provider', 'startsAt', 'status', 'title', 'videoId'])
  assert.ok(validateContract('streams', plain).valid)
  const withUrl = mapStreams({
    items: [{ videoUrl: `https://youtu.be/${YT}`, provider: 'youtube', videoId: YT, title: 't', startsAt: '2026-01-01T00:00:00Z', status: 'live' }],
  })
  assert.equal(withUrl.items[0].videoUrl, `https://youtu.be/${YT}`)
  assert.ok(validateContract('streams', withUrl).valid)

  const article = { slug: 's', title: 't', excerpt: 'e', level: 'beginner', readingMinutes: 3, bodyMarkdown: 'b' }
  const webinar = { webinarId: 'web-1', title: 't', speaker: 'S P', speakerRole: 'r', startsAt: '2026-01-01T00:00:00Z', durationMinutes: 60, level: 'l', description: 'd' }
  const old = mapAcademy({ articles: [article], webinars: [webinar], glossary: [] })
  assert.equal('video' in old.articles[0], false)
  assert.equal('recording' in old.webinars[0], false)
  assert.equal('joinUrl' in old.webinars[0], false)
  assert.ok(validateContract('academy', old).valid)
  const full = mapAcademy({
    articles: [{ ...article, videoUrl: 'https://vimeo.com/76979871' }],
    webinars: [{ ...webinar, recordingUrl: `https://www.youtube.com/live/${YT}?si=x`, joinUrl: 'https://zoom.us/j/1' }],
    glossary: [],
  })
  assert.deepEqual(full.articles[0].video, { provider: 'vimeo', videoId: '76979871', url: 'https://vimeo.com/76979871' })
  assert.deepEqual(full.webinars[0].recording, { provider: 'youtube', videoId: YT, url: `https://www.youtube.com/live/${YT}?si=x` })
  assert.equal(full.webinars[0].joinUrl, 'https://zoom.us/j/1')
  const check = validateContract('academy', full)
  assert.ok(check.valid, JSON.stringify(check))
  const bare = mapAcademy({ articles: [{ ...article, videoUrl: ` youtu.be/${YT} ` }], webinars: [], glossary: [] })
  assert.equal(bare.articles[0].video?.url, `https://youtu.be/${YT}`)
  assert.ok(validateContract('academy', bare).valid)
  const bareStream = mapStreams({ items: [{ videoUrl: 'vimeo.com/76979871', provider: 'vimeo', videoId: '76979871', title: 't', startsAt: '2026-01-01T00:00:00Z', status: 'live' }] })
  assert.equal(bareStream.items[0].videoUrl, 'https://vimeo.com/76979871')
  assert.ok(validateContract('streams', bareStream).valid)
  const broken = mapAcademy({ articles: [{ ...article, videoUrl: 'nope' }], webinars: [{ ...webinar, recordingUrl: 'nope', joinUrl: 'http://x.y' }], glossary: [] })
  assert.deepEqual(broken, old)
})

const payload = await getPayload({ config })
const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: any[] }> } }).drizzle
const empty = await db.execute(sql`SELECT to_regclass('public.sites') AS t`)
assert.equal(empty.rows[0]?.t ?? null, null, 'нужна пустая база: тест создаёт схему миграциями сам')
await payload.db.migrate()

const site = (await payload.create({
  collection: 'sites',
  data: { slug: 'video-test', name: 'Video', primaryColor: '#d4a437', demoStartBalanceCents: 0 } as never,
})) as Doc

async function upsert(collection: 'site-streams' | 'site-academy', data: Doc, locale: 'ru' | 'en' = 'ru') {
  const found = await payload.find({ collection, where: { site: { equals: site.id } }, depth: 0, draft: true })
  const base = { ...data, site: site.id, _status: 'published' }
  return (found.docs[0]
    ? payload.update({ collection, id: found.docs[0].id, data: base as never, locale })
    : payload.create({ collection, data: base as never, locale })) as Promise<Doc>
}

async function fetchResource(resource: string, locale = 'ru') {
  const res = await GET(new Request(`http://cms.test/v1/cms/${resource}?site=video-test&locale=${locale}`, { headers: { 'X-API-Key': API_KEY } }), {
    params: Promise.resolve({ path: [resource] }),
  })
  return { status: res.status, body: (await res.json()) as Doc }
}

async function expectInvalid(action: () => Promise<unknown>, fragment: string) {
  try {
    await action()
  } catch (error) {
    const details = (error as { data?: { errors?: { message?: string }[] } }).data?.errors ?? []
    const text = [(error as Error).message, ...details.map((d) => d.message ?? '')].join(' | ')
    assert.ok(text.includes(fragment), `в ошибке нет «${fragment}»: ${text}`)
    return
  }
  assert.fail('ожидался отказ')
}

await check('эфир: ссылка → платформа и ID на сохранении, прежние записи без ссылки работают, у каждого языка своя ссылка', async () => {
  await upsert('site-streams', {
    items: [
      { videoUrl: `https://www.youtube.com/live/${YT}?si=abc`, title: 'Эфир по ссылке', startsAt: '2026-12-01T18:00:00Z', status: 'upcoming' },
      { videoUrl: 'https://player.vimeo.com/video/76979871', provider: 'youtube', videoId: 'stale', title: 'Vimeo', startsAt: '2026-10-01T18:00:00Z', status: 'past' },
      { provider: 'youtube', videoId: 'legacy-id', title: 'Старая запись', startsAt: '2026-09-01T18:00:00Z', status: 'past' },
    ],
  })
  const { status, body } = await fetchResource('streams')
  assert.equal(status, 200, JSON.stringify(body))
  assert.deepEqual(
    body.items.map((i: Doc) => [i.provider, i.videoId, i.videoUrl ?? null]),
    [
      ['youtube', YT, `https://www.youtube.com/live/${YT}?si=abc`],
      ['vimeo', '76979871', 'https://player.vimeo.com/video/76979871'],
      ['youtube', 'legacy-id', null],
    ],
  )
  assert.ok(validateContract('streams', body).valid)
  await upsert('site-streams', { items: [{ videoUrl: 'https://vimeo.com/11111111', title: 'EN', startsAt: '2026-12-01T18:00:00Z', status: 'live' }] }, 'en')
  const en = await fetchResource('streams', 'en')
  assert.deepEqual(en.body.items.map((i: Doc) => [i.provider, i.videoId, i.videoUrl]), [['vimeo', '11111111', 'https://vimeo.com/11111111']])
  const ru = await fetchResource('streams', 'ru')
  assert.deepEqual(ru.body.items.map((i: Doc) => i.videoId), [YT, '76979871', 'legacy-id'])
})

await check('эфир: неподходящая ссылка — отказ с понятной ошибкой', async () => {
  await expectInvalid(
    () => upsert('site-streams', { items: [{ videoUrl: 'https://example.com/v/1', title: 'x', startsAt: '2026-12-01T18:00:00Z', status: 'live' }] }),
    'YouTube или Vimeo',
  )
})

await check('обучение: запись и ссылка участия у вебинара, видео у статьи', async () => {
  for (const [minute, article] of [
    [2, { slug: 'with-video', title: 'С видео', videoUrl: `https://youtu.be/${YT}` }],
    [1, { slug: 'plain', title: 'Без видео' }],
  ] as const) {
    await payload.create({
      collection: 'articles',
      locale: 'ru',
      data: { ...article, site: site.id, section: 'education', level: 'beginner', excerpt: 'e', bodyMarkdown: 'b', publishedAt: `2026-01-01T00:0${minute}:00Z`, _status: 'published' } as never,
    })
  }
  await upsert('site-academy', {
    webinars: [
      { webinarId: 'web-1', title: 'Прошедший', speaker: 'A B', speakerRole: 'r', startsAt: '2026-01-01T10:00:00Z', durationMinutes: 60, level: 'l', description: 'd', recordingUrl: 'https://vimeo.com/76979871' },
      { webinarId: 'web-2', title: 'Будущий', speaker: 'A B', speakerRole: 'r', startsAt: '2027-01-01T10:00:00Z', durationMinutes: 60, level: 'l', description: 'd', joinUrl: 'https://zoom.us/j/123' },
    ],
    glossary: [],
  })
  const { status, body } = await fetchResource('academy')
  assert.equal(status, 200, JSON.stringify(body))
  assert.ok(validateContract('academy', body).valid)
  assert.deepEqual(body.articles[0].video, { provider: 'youtube', videoId: YT, url: `https://youtu.be/${YT}` })
  assert.equal('video' in body.articles[1], false)
  assert.deepEqual(body.webinars[0].recording, { provider: 'vimeo', videoId: '76979871', url: 'https://vimeo.com/76979871' })
  assert.equal('joinUrl' in body.webinars[0], false)
  assert.equal(body.webinars[1].joinUrl, 'https://zoom.us/j/123')
  assert.equal('recording' in body.webinars[1], false)
})

await check('обучение: плохие ссылки отклоняются', async () => {
  const base = { webinarId: 'web-1', title: 't', speaker: 'A B', speakerRole: 'r', startsAt: '2026-01-01T10:00:00Z', durationMinutes: 60, level: 'l', description: 'd' }
  await expectInvalid(() => upsert('site-academy', { articles: [], glossary: [], webinars: [{ ...base, recordingUrl: 'https://zoom.us/rec/1' }] }), 'YouTube или Vimeo')
  await expectInvalid(() => upsert('site-academy', { articles: [], glossary: [], webinars: [{ ...base, joinUrl: 'http://zoom.us/j/1' }] }), 'https://')
})

console.info(failures ? `\n${failures} FAIL` : '\nALL OK')
process.exit(failures ? 1 : 0)
