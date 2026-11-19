import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { mapAccounts, mapBrand, mapInstruments, mapPromotions } from '../src/lib/contract/mappers'
import { validateContract } from '../src/lib/contract/validate'
import { collectUnknownLiveParams, isLiveParam, scanLiveParams } from '../src/lib/live-params'

const root = process.cwd()
const readJson = (...parts: string[]) => JSON.parse(readFileSync(path.join(root, ...parts), 'utf8'))
let failures = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    console.info(`OK    ${name}`)
  } catch (error) {
    failures++
    console.info(`FAIL  ${name}\n      ${error instanceof Error ? error.message : String(error)}`)
  }
}

check('живые параметры: список проекта и шаблон account.<key>', () => {
  for (const name of [
    'deposit.min',
    'withdraw.min',
    'withdraw.unverifiedPercent',
    'deposit.methods',
    'demo.startBalance',
    'leverage.max',
    'support.hours',
    'account.standard.name',
    'account.enc_prime.leverage',
    'account.Pro2.commission',
    'account.pro.markup',
    'account.standard.leverage.crypto',
  ]) {
    assert.ok(isLiveParam(name), name)
  }
  for (const name of [
    'deposit.mni',
    'deposit',
    'account.standard',
    'account.std-1.name',
    'account..name',
    'account.pro.spread',
    'account.pro.leverage.',
    ' deposit.min',
    'account.pro.leverage.crypto.x',
  ]) {
    assert.ok(!isLiveParam(name), name)
  }
})

check('живые параметры: разбор текста', () => {
  const scan = scanLiveParams('От {{deposit.min}} до {{deposit.min}}, плечо {{account.pro.leverage}}, {{deposit.mni}} и {{ }}')
  assert.deepEqual(scan.known, ['{{deposit.min}}', '{{account.pro.leverage}}'])
  assert.deepEqual(scan.unknown, ['{{deposit.mni}}', '{{ }}'])
  assert.deepEqual(scanLiveParams('без параметров'), { known: [], unknown: [] })
  assert.deepEqual(scanLiveParams(42), { known: [], unknown: [] })
  assert.deepEqual(
    collectUnknownLiveParams({ items: [{ a: '{{x.y}}' }, { b: ['{{withdraw.min}}', '{{x.y}}', '{{z}}'] }] }),
    ['{{x.y}}', '{{z}}'],
  )
})

check('живые параметры: в фикстурах, FAQ и переводах нет неизвестных', () => {
  const sources: Record<string, unknown> = {
    'scripts/i18n/faq-live.json': readJson('scripts', 'i18n', 'faq-live.json'),
    'scripts/i18n/content.de-fr-es.json': readJson('scripts', 'i18n', 'content.de-fr-es.json'),
  }
  for (const file of readdirSync(path.join(root, 'contract', 'fixtures'))) {
    sources[`contract/fixtures/${file}`] = readJson('contract', 'fixtures', file)
  }
  for (const [file, data] of Object.entries(sources)) {
    assert.deepEqual(collectUnknownLiveParams(data), [], file)
  }
})

const accountsRu = readJson('contract', 'fixtures', 'cms.accounts.ru.json')

check('accounts: portfolioKey отдаётся, устаревшие поля необязательны', () => {
  const dto = mapAccounts({
    items: [
      { planId: 'standard', portfolioKey: 'standard', name: 'Standard', description: 'Текст', featured: false, features: [] },
      { planId: 'pro', portfolioKey: '', name: 'Pro', description: 'Текст', minDeposit: '', pricing: { spreadPips: null } },
    ],
  })
  assert.deepEqual(dto.items[0], {
    id: 'standard',
    portfolioKey: 'standard',
    name: 'Standard',
    description: 'Текст',
    featured: false,
    features: [],
  })
  assert.equal('portfolioKey' in dto.items[1]!, false)
  assert.equal('minDeposit' in dto.items[1]!, false)
  assert.equal('pricing' in dto.items[1]!, false)
  assert.ok(validateContract('accounts', dto).valid)
})

check('accounts: старый ответ без portfolioKey валиден, кривой ключ — нет', () => {
  const legacy = { items: accountsRu.items.map(({ portfolioKey: _p, ...rest }: Record<string, unknown>) => rest) }
  assert.ok(validateContract('accounts', legacy).valid)
  const bad = { items: [{ ...accountsRu.items[0], portfolioKey: 'enc prime' }] }
  assert.equal(validateContract('accounts', bad).valid, false)
})

check('promotions: promoId движка отдаётся, если заполнен', () => {
  const base = { promoId: 'promo-1', badge: 'b', title: 't', description: 'd', terms: 'x', ctaLabel: 'c', ctaHref: '/r', featured: true }
  const dto = mapPromotions({ items: [{ ...base, enginePromoId: 'welcome-30' }, { ...base, enginePromoId: '' }] })
  assert.equal(dto.items[0]!.id, 'promo-1')
  assert.equal(dto.items[0]!.promoId, 'welcome-30')
  assert.equal('promoId' in dto.items[1]!, false)
  assert.ok(validateContract('promotions', dto).valid)
  assert.ok(validateContract('promotions', readJson('contract', 'fixtures', 'cms.promotions.ru.json')).valid)
})

check('instruments: leverageMax необязателен', () => {
  const dto = mapInstruments({ items: [{ symbol: 'EURUSD', name: 'EUR/USD', category: 'forex', digits: 5, spreadFrom: '0.1', swapFree: true }] })
  assert.equal('leverageMax' in dto.items[0]!, false)
  assert.ok(validateContract('instruments', dto).valid)
  assert.ok(validateContract('instruments', readJson('contract', 'fixtures', 'cms.instruments.ru.json')).valid)
})

check('brand и sites: heroBackground quotes | off, по умолчанию quotes', () => {
  const site = { name: 'Apex', primaryColor: '#d4a437', socials: [] }
  assert.equal(mapBrand(site).heroBackground, 'quotes')
  assert.equal(mapBrand({ ...site, heroBackground: 'off' }).heroBackground, 'off')
  assert.equal(mapBrand({ ...site, heroBackground: 'video' }).heroBackground, 'quotes')
  assert.ok(validateContract('brand', mapBrand({ ...site, heroBackground: 'off' })).valid)
  const { heroBackground: _h, languages: _l, defaultLanguage: _d, ...legacyBrand } = readJson('contract', 'fixtures', 'cms.brand.ru.json')
  assert.ok(validateContract('brand', legacyBrand).valid)
  assert.equal(validateContract('brand', { ...legacyBrand, heroBackground: 'video' }).valid, false)
  const { heroBackground: _s, ...legacySites } = readJson('contract', 'fixtures', 'cms.sites.json')
  assert.ok(validateContract('sites', legacySites).valid)
  assert.equal(validateContract('sites', { ...legacySites, heroBackground: 'video' }).valid, false)
})

console.info(failures ? `\n${failures} FAILURES` : '\nALL OK')
process.exit(failures ? 1 : 0)
