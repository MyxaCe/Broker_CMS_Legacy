/**
 * Контрактный тест: ответы живой CMS сравниваются с эталонными фикстурами
 * platform-contracts (contract/fixtures) по всем 14 ресурсам × ru/en,
 * плюс деталка статьи, auth и 404. Datetime-поля сравниваются по моменту
 * времени (CMS отдаёт канонический ISO с миллисекундами).
 *
 * Запуск: node scripts/contract-check.mjs   (нужны env CMS_URL?, CMS_API_KEY?)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert';
import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';

const CMS = (process.env.CMS_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const KEY = process.env.CMS_API_KEY ?? 'dev-cms-api-key';
const FIXTURES = join(process.cwd(), 'contract', 'fixtures');

const RESOURCES = [
  'brand', 'navigation', 'faq', 'instruments', 'accounts', 'promotions',
  'partners', 'academy', 'streams', 'articles', 'contacts', 'careers',
  'legal', 'system-status', 'cabinet-home',
];

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
function normalize(value) {
  if (typeof value === 'string' && ISO_RE.test(value)) return new Date(value).toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]));
  return value;
}

let failures = 0;
const fail = (msg) => { failures++; console.log(`FAIL  ${msg}`); };

for (const resource of RESOURCES) {
  for (const locale of ['ru', 'en']) {
    const res = await fetch(`${CMS}/v1/cms/${resource}?locale=${locale}`, {
      headers: { 'X-API-Key': KEY },
    });
    if (!res.ok) { fail(`${resource} ${locale}: HTTP ${res.status}`); continue; }
    const body = await res.json();
    const fixture = JSON.parse(readFileSync(join(FIXTURES, `cms.${resource}.${locale}.json`), 'utf8'));
    // Медиа бренда специфичны для окружения (их загружает редактор, seed не сидирует):
    // проверяем форму объекта, затем исключаем из побайтового сравнения
    if (resource === 'brand') {
      for (const key of ['logo', 'favicon']) {
        const m = body[key];
        const shapeOk =
          m === null ||
          (m && typeof m.url === 'string' && Number.isInteger(m.width) &&
            Number.isInteger(m.height) && typeof m.alt === 'string' && typeof m.mimeType === 'string');
        if (!shapeOk) fail(`${resource} ${locale}: некорректная форма ${key}: ${JSON.stringify(m)}`);
        fixture[key] = m;
      }
    }
    try {
      assert.deepStrictEqual(normalize(body), normalize(fixture));
      console.log(`OK    ${resource} ${locale}`);
    } catch {
      const got = JSON.stringify(normalize(body));
      const exp = JSON.stringify(normalize(fixture));
      let i = 0;
      while (i < Math.min(got.length, exp.length) && got[i] === exp[i]) i++;
      fail(`${resource} ${locale}: расхождение @${i}\n  got:      …${got.slice(Math.max(0, i - 40), i + 160)}\n  expected: …${exp.slice(Math.max(0, i - 40), i + 160)}`);
    }
  }
}

const detail = await fetch(`${CMS}/v1/cms/articles/gold-tests-record-highs?locale=en`, { headers: { 'X-API-Key': KEY } });
const detailBody = detail.ok ? await detail.json() : null;
if (detailBody?.slug === 'gold-tests-record-highs') console.log('OK    article detail');
else fail(`article detail: HTTP ${detail.status}`);

const missing = await fetch(`${CMS}/v1/cms/articles/no-such-slug?locale=ru`, { headers: { 'X-API-Key': KEY } });
missing.status === 404 ? console.log('OK    article 404') : fail(`article 404 -> ${missing.status}`);

const noKey = await fetch(`${CMS}/v1/cms/brand?locale=ru`);
noKey.status === 401 ? console.log('OK    auth 401') : fail(`auth -> ${noKey.status}`);

const unknown = await fetch(`${CMS}/v1/cms/nope?locale=ru`, { headers: { 'X-API-Key': KEY } });
unknown.status === 404 ? console.log('OK    unknown 404') : fail(`unknown -> ${unknown.status}`);

const get = (path, headers = { 'X-API-Key': KEY }) => fetch(`${CMS}${path}`, { headers });
const readJson = (...parts) => JSON.parse(readFileSync(join(process.cwd(), ...parts), 'utf8'));
const same = (name, got, expected) => {
  try {
    assert.deepStrictEqual(normalize(got), normalize(expected));
    console.log(`OK    ${name}`);
  } catch {
    const g = JSON.stringify(normalize(got));
    const e = JSON.stringify(normalize(expected));
    let i = 0;
    while (i < Math.min(g.length, e.length) && g[i] === e[i]) i++;
    fail(`${name}: расхождение @${i}\n  got:      …${g.slice(Math.max(0, i - 40), i + 160)}\n  expected: …${e.slice(Math.max(0, i - 40), i + 160)}`);
  }
};

const sitesRes = await get('/v1/cms/sites/apex-ru');
if (sitesRes.ok) same('sites/apex-ru', await sitesRes.json(), readJson('contract', 'fixtures', 'cms.sites.json'));
else fail(`sites/apex-ru: HTTP ${sitesRes.status}`);

const publicBrand = await get('/v1/cms/brand?site=apex-ru', {});
const publicBody = publicBrand.ok ? await publicBrand.json() : null;
if (publicBrand.status === 200 && publicBrand.headers.get('access-control-allow-origin') === '*' &&
    JSON.stringify(publicBody?.languages) === '["ru","en"]' && publicBody?.defaultLanguage === 'ru' &&
    publicBody?.heroBackground === 'quotes') {
  console.log('OK    public brand: languages, defaultLanguage, heroBackground');
} else fail(`public brand: HTTP ${publicBrand.status} ${JSON.stringify(publicBody)}`);

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const { languages: _l, defaultLanguage: _d, heroBackground: _h, ...legacyBrand } = readJson('contract', 'fixtures', 'cms.brand.ru.json');
for (const [resource, legacy] of [
  ['brand', legacyBrand],
  ['sites', { slug: 'apex-ru', name: 'Apex Capital', demoStartBalanceCents: 1000000, instruments: [] }],
]) {
  const validate = ajv.compile(readJson('contract', 'json-schema', `cms.${resource}.schema.json`));
  if (validate(legacy)) console.log(`OK    ${resource}: ответ без languages/defaultLanguage/heroBackground валиден (старая CMS)`);
  else fail(`${resource}: схема требует новые поля ${JSON.stringify(validate.errors)}`);
  if (validate({ ...legacy, languages: [], defaultLanguage: 'it' })) fail(`${resource}: схема пропускает пустые languages и неизвестный код`);
  else console.log(`OK    ${resource}: схема отвергает пустые languages и неизвестный код`);
  if (validate({ ...legacy, heroBackground: 'video' })) fail(`${resource}: схема пропускает неизвестный heroBackground`);
  else console.log(`OK    ${resource}: схема отвергает неизвестный heroBackground`);
}

for (const [resource, strip] of [
  ['accounts', (item) => { const { portfolioKey: _p, ...rest } = item; return rest; }],
  ['accounts', (item) => { const { minDeposit: _m, pricing: _p, ...rest } = item; return rest; }],
  ['instruments', (item) => { const { leverageMax: _l, ...rest } = item; return rest; }],
]) {
  const validate = ajv.compile(readJson('contract', 'json-schema', `cms.${resource}.schema.json`));
  const body = readJson('contract', 'fixtures', `cms.${resource}.ru.json`);
  const variant = { ...body, items: body.items.map(strip) };
  if (validate(variant)) console.log(`OK    ${resource}: ответ без ${Object.keys(body.items[0]).filter((k) => !(k in variant.items[0])).join(', ')} валиден`);
  else fail(`${resource}: схема требует ${JSON.stringify(validate.errors)}`);
}

const translations = readJson('scripts', 'i18n', 'content.de-fr-es.json').locales;
const faqLive = readJson('scripts', 'i18n', 'faq-live.json').locales;
for (const locale of ['de', 'fr', 'es']) {
  const expected = { ...translations[locale], faq: faqLive[locale] };
  for (const [resource, dto] of Object.entries(expected)) {
    const res = await get(`/v1/cms/${resource}?locale=${locale}`);
    if (!res.ok) { fail(`${resource} ${locale}: HTTP ${res.status}`); continue; }
    same(`${resource} ${locale}`, await res.json(), dto);
  }
  const home = await get(`/v1/cms/cabinet-home?locale=${locale}`);
  same(`cabinet-home ${locale}`, home.ok ? await home.json() : null, readJson('contract', 'fixtures', 'cms.cabinet-home.ru.json'));
}

const unknownLocale = await get('/v1/cms/navigation?locale=it');
same('неизвестная локаль -> ru', unknownLocale.ok ? await unknownLocale.json() : null, readJson('contract', 'fixtures', 'cms.navigation.ru.json'));

console.log(failures ? `\n${failures} FAILURES` : '\nALL OK');
process.exit(failures ? 1 : 0);
