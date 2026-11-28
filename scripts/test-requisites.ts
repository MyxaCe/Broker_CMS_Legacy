import assert from 'node:assert/strict'

import { mapLegal } from '../src/lib/contract/mappers'
import { validateContract } from '../src/lib/contract/validate'
import { validateLicenseKey } from '../src/lib/legal-entity'
import { scanLiveParams } from '../src/lib/live-params'
import {
  collectRequisites,
  isRequisiteParam,
  missingRequisites,
  requisiteValues,
  substituteRequisites,
  validateExtraKey,
  withRequisitesLegal,
} from '../src/lib/requisites'

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
  slug: 'acme',
  name: 'Acme',
  legalEntity: {
    name: 'Acme Ltd.',
    registrationNumber: 'HE 123',
    address: 'Nicosia, Cyprus',
    licenses: [
      { key: 'cysec', number: '000/00', regulator: 'CySEC', regulatorCountry: 'Кипр', activity: 'CIF' },
      { key: 'fca', number: '  ', regulator: 'FCA' },
      { key: 'Bad Key', number: '1' },
      { number: '2', regulator: 'без кода' },
    ],
  },
  requisites: {
    jurisdiction: 'Республики Кипр',
    jurisdictionIn: 'в Республике Кипр',
    phone: '+000 00 000 000',
    email: 'support@acme.example',
    website: 'acme.example',
    extra: [
      { key: 'regulator', value: 'CySEC' },
      { key: 'name', value: 'не должно перекрыть встроенное' },
      { key: 'bad key', value: 'x' },
      { key: 'empty', value: '  ' },
    ],
  },
}

const legalDoc = (paragraph: string, slug = 'terms') => ({
  items: [
    {
      slug,
      title: 'Соглашение {{brand}}',
      updatedAt: '2026-11-28',
      intro: 'Компания {{company.name}} ({{ company.regNumber }})',
      sections: [{ heading: 'Право', paragraphsMarkdown: [{ text: paragraph }] }],
    },
  ],
})

check('значения: встроенные поля и свои метки, встроенное не перекрывается, пустое = null', () => {
  const v = requisiteValues(SITE)
  assert.equal(v.get('brand'), 'Acme')
  assert.equal(v.get('company.name'), 'Acme Ltd.')
  assert.equal(v.get('company.jurisdictionIn'), 'в Республике Кипр')
  assert.equal(v.get('company.regulator'), 'CySEC')
  assert.equal(v.get('company.empty'), null)
  assert.equal(v.has('company.bad key'), false)
})

check('подстановка во все строки, пробелы внутри скобок допустимы, живые параметры платформы не трогаются', () => {
  const v = requisiteValues(SITE)
  const out = substituteRequisites(
    { a: ['Суды {{company.jurisdiction}}, {{ brand }}'], b: 'Мин. депозит {{deposit.min}}', n: 5 },
    v,
  )
  assert.deepEqual(out, { a: ['Суды Республики Кипр, Acme'], b: 'Мин. депозит {{deposit.min}}', n: 5 })
})

check('незаполненная или неизвестная метка — в списке недостающих', () => {
  const v = requisiteValues({ ...SITE, requisites: {} })
  assert.deepEqual(missingRequisites(['{{company.phone}} {{company.name}} {{company.nope}}'], v), ['company.nope', 'company.phone'])
  assert.deepEqual([...collectRequisites({ x: '{{brand}} {{deposit.min}}' })], ['brand'])
})

check('legal: документ с пустым реквизитом скрыт, заполненный отдаётся подставленным и проходит контракт', () => {
  const ok = mapLegal(legalDoc('законодательством {{company.jurisdiction}}'))
  const hidden = mapLegal(legalDoc('Тел. {{company.fax}}', 'privacy'))
  const logs: string[] = []
  const dto = withRequisitesLegal({ items: [...ok.items, ...hidden.items] }, SITE, (m) => logs.push(m))
  assert.equal(dto.items.length, 1)
  assert.equal(dto.items[0]!.title, 'Соглашение Acme')
  assert.equal(dto.items[0]!.intro, 'Компания Acme Ltd. (HE 123)')
  assert.deepEqual(dto.items[0]!.sections[0].paragraphsMarkdown, ['законодательством Республики Кипр'])
  assert.match(logs[0] ?? '', /privacy.*company\.fax/)
  assert.ok(validateContract('legal', dto).valid)
})

check('подсказка CMS: реквизиты — известные метки, опечатка — неизвестная', () => {
  assert.ok(isRequisiteParam('company.website'))
  assert.ok(isRequisiteParam('company.regulator'))
  assert.ok(!isRequisiteParam('company.'))
  assert.deepEqual(scanLiveParams('{{brand}} {{company.name}} {{compnay.name}}'), {
    known: ['{{brand}}', '{{company.name}}'],
    unknown: ['{{compnay.name}}'],
  })
})

check('лицензии: метки из блока «Юрлицо и лицензия» по коду, пустой номер = не заполнено', () => {
  const v = requisiteValues(SITE)
  assert.equal(v.get('license.cysec.number'), '000/00')
  assert.equal(v.get('license.cysec.regulator'), 'CySEC')
  assert.equal(v.get('license.cysec.country'), 'Кипр')
  assert.equal(v.get('license.fca.number'), null)
  assert.equal(substituteRequisites('Лицензия {{license.cysec.regulator}} № {{license.cysec.number}}', v), 'Лицензия CySEC № 000/00')
  assert.deepEqual(missingRequisites('№ {{license.fca.number}}, {{license.sec.number}}', v), ['license.fca.number', 'license.sec.number'])
  assert.ok(isRequisiteParam('license.cysec.number'))
  assert.ok(!isRequisiteParam('license.cysec.phone'))
  assert.equal(scanLiveParams('{{license.fca.number}}').known.length, 1)
})

check('код лицензии: строчная латиница или пусто', () => {
  assert.equal(validateLicenseKey('cysec'), true)
  assert.equal(validateLicenseKey(''), true)
  assert.notEqual(validateLicenseKey('CySEC'), true)
  assert.notEqual(validateLicenseKey('1fca'), true)
})

check('ключ своей метки: латиница, не совпадает со встроенной', () => {
  assert.equal(validateExtraKey('regulator'), true)
  assert.notEqual(validateExtraKey('name'), true)
  assert.notEqual(validateExtraKey('1abc'), true)
  assert.notEqual(validateExtraKey('рег'), true)
})

console.info(failures ? `\n${failures} FAIL` : '\nALL OK')
process.exit(failures ? 1 : 0)
