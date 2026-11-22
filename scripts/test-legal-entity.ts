import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { mapBrand } from '../src/lib/contract/mappers'
import { validateContract } from '../src/lib/contract/validate'
import { isVerifyUrl, mapLegalEntity, validateVerifyUrl } from '../src/lib/legal-entity'

process.env.CMS_PUBLIC_URL = 'https://cms.example.test'

const readJson = (...parts: string[]) =>
  JSON.parse(readFileSync(path.join(process.cwd(), ...parts), 'utf8'))
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

const SITE = {
  name: 'Apex Capital',
  primaryColor: '#d4a437',
  socials: [],
  languages: ['ru', 'en'],
  defaultLanguage: 'ru',
}

const PDF_MEDIA = {
  url: '/api/media/file/license.pdf',
  filename: 'license.pdf',
  mimeType: 'application/pdf',
  alt: 'Лицензия',
}

const FULL = {
  name: '  Example Ltd  ',
  registrationNumber: 'EX-000000',
  address: '1 Example Street, Example City',
  licenses: [
    {
      number: 'LIC-0001',
      activity: 'Инвестиционная фирма',
      regulator: 'Example Financial Authority',
      regulatorCountry: 'Exampleland',
      verifyUrl: 'https://register.example.test/firms/LIC-0001',
      document: PDF_MEDIA,
    },
    { number: 'LIC-0002', activity: '', regulator: null, verifyUrl: '', document: null },
  ],
}

check('ссылка «Проверить лицензию»: принимаются только полные https-адреса', () => {
  for (const ok of [
    'https://register.example.test/firms/LIC-0001',
    'https://register.example.test/search?q=LIC-0001#top',
  ]) {
    assert.equal(isVerifyUrl(ok), true, ok)
    assert.equal(validateVerifyUrl(ok), true, ok)
  }
  for (const bad of [
    'http://register.example.test/firms/1',
    'javascript:alert(1)',
    'register.example.test/firms/1',
    '//register.example.test/firms/1',
    'https://localhost/firms/1',
    'https://user:pass@register.example.test/',
    ' https://register.example.test/',
    'https://register.example.test./',
    'ftp://register.example.test/',
  ]) {
    assert.equal(isVerifyUrl(bad), false, bad)
    assert.equal(typeof validateVerifyUrl(bad), 'string', bad)
  }
  for (const empty of [undefined, null, '']) assert.equal(validateVerifyUrl(empty), true)
})

check('ничего не заполнено — юрлица нет, в бренде нет ключа legalEntity', () => {
  for (const legalEntity of [
    undefined,
    null,
    {},
    { name: '', registrationNumber: '  ', address: null, licenses: [] },
    { licenses: [{ number: '', activity: '', regulator: '', verifyUrl: 'https://register.example.test/x' }] },
  ]) {
    assert.equal(mapLegalEntity({ legalEntity }), null, JSON.stringify(legalEntity))
    assert.equal('legalEntity' in mapBrand({ ...SITE, legalEntity }), false)
  }
})

check('заполненное юрлицо: обрезка пробелов, пустое -> null, PDF с абсолютным адресом', () => {
  const entity = mapLegalEntity({ legalEntity: FULL })
  assert.deepEqual(entity, {
    name: 'Example Ltd',
    registrationNumber: 'EX-000000',
    address: '1 Example Street, Example City',
    licenses: [
      {
        number: 'LIC-0001',
        activity: 'Инвестиционная фирма',
        regulator: 'Example Financial Authority',
        regulatorCountry: 'Exampleland',
        verifyUrl: 'https://register.example.test/firms/LIC-0001',
        document: {
          url: 'https://cms.example.test/api/media/file/license.pdf',
          filename: 'license.pdf',
          mimeType: 'application/pdf',
        },
      },
      {
        number: 'LIC-0002',
        activity: null,
        regulator: null,
        regulatorCountry: null,
        verifyUrl: null,
        document: null,
      },
    ],
  })
})

check('негодная ссылка и не-PDF не попадают в ответ', () => {
  const entity = mapLegalEntity({
    legalEntity: {
      licenses: [
        {
          number: 'LIC-0003',
          verifyUrl: 'http://register.example.test/firms/LIC-0003',
          document: { ...PDF_MEDIA, mimeType: 'image/png', width: 10, height: 10 },
        },
      ],
    },
  })
  assert.equal(entity?.licenses[0]?.verifyUrl, null)
  assert.equal(entity?.licenses[0]?.document, null)
  assert.equal(entity?.name, null)
})

check('контракт brand: с юрлицом валиден, без юрлица (старая CMS) валиден', () => {
  const full = validateContract('brand', mapBrand({ ...SITE, legalEntity: FULL }))
  assert.equal(full.valid, true, full.errors.join('; '))
  const fixture = validateContract('brand', readJson('contract', 'fixtures', 'cms.brand.ru.json'))
  assert.equal(fixture.valid, true, fixture.errors.join('; '))
})

check('контракт brand: схема отвергает http-ссылку, лишние поля и пустые строки', () => {
  const brand = mapBrand({ ...SITE, legalEntity: FULL }) as Record<string, any>
  const license = brand.legalEntity.licenses[0]
  for (const variant of [
    { ...brand.legalEntity, licenses: [{ ...license, verifyUrl: 'http://register.example.test/x' }] },
    { ...brand.legalEntity, licenses: [{ ...license, extra: 1 }] },
    { ...brand.legalEntity, name: '' },
    { ...brand.legalEntity, licenses: undefined },
  ]) {
    assert.equal(validateContract('brand', { ...brand, legalEntity: variant }).valid, false, JSON.stringify(variant))
  }
})

if (failures) {
  console.info(`\n${failures} FAILURES`)
  process.exit(1)
}
console.info('\nALL OK')
process.exit(0)
