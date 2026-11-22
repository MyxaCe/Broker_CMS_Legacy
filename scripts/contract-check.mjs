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

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const sitesRes = await get('/v1/cms/sites/apex-ru');
const sitesBody = sitesRes.ok ? await sitesRes.json() : null;
if (sitesBody) same('sites/apex-ru', sitesBody, readJson('contract', 'fixtures', 'cms.sites.json'));
else fail(`sites/apex-ru: HTTP ${sitesRes.status}`);
if (sitesBody && Array.isArray(sitesBody.closeOnlyInstruments) && sitesBody.closeOnlyInstruments.every((s) => sitesBody.instruments.includes(s))) {
  console.log('OK    sites/apex-ru: closeOnlyInstruments ⊆ instruments');
} else fail(`sites/apex-ru: closeOnlyInstruments ${JSON.stringify(sitesBody?.closeOnlyInstruments)}`);

const platformRes = await get('/v1/cms/platform/instruments');
if (platformRes.ok) {
  const platformBody = await platformRes.json();
  const platformFixture = readJson('contract', 'fixtures', 'cms.platform-instruments.json');
  const validatePlatform = ajv.compile(readJson('contract', 'json-schema', 'cms.platform-instruments.schema.json'));
  if (!validatePlatform(platformBody)) fail(`platform/instruments: схема ${JSON.stringify(validatePlatform.errors)}`);
  else console.log('OK    platform/instruments: ответ валиден по схеме');
  if (platformRes.headers.get('x-content-version') === String(platformBody.version)) console.log('OK    platform/instruments: X-Content-Version = version');
  else fail(`platform/instruments: X-Content-Version ${platformRes.headers.get('x-content-version')} != ${platformBody.version}`);
  if (typeof platformBody.updatedAt === 'string' && ISO_RE.test(platformBody.updatedAt)) platformFixture.updatedAt = platformBody.updatedAt;
  same('platform/instruments', platformBody, platformFixture);
  if (sitesBody && JSON.stringify(platformBody.instruments.map((i) => i.symbol)) === JSON.stringify(sitesBody.instruments)) {
    console.log('OK    platform/instruments = объединение инструментов сайтов (один сайт apex-ru)');
  } else fail('platform/instruments: не совпадает с инструментами сайта apex-ru');
  const platformAgain = await (await get('/v1/cms/platform/instruments')).json();
  platformAgain.version === platformBody.version && platformAgain.updatedAt === platformBody.updatedAt
    ? console.log('OK    platform/instruments: повторный запрос без изменений — version и updatedAt прежние')
    : fail(`platform/instruments: version ${platformBody.version} → ${platformAgain.version} без изменений`);
} else fail(`platform/instruments: HTTP ${platformRes.status}`);
const platformNoKey = await get('/v1/cms/platform/instruments', {});
platformNoKey.status === 401 ? console.log('OK    platform/instruments без ключа 401') : fail(`platform/instruments без ключа -> ${platformNoKey.status}`);
const platformUnknown = await get('/v1/cms/platform/other');
platformUnknown.status === 404 ? console.log('OK    platform/other 404') : fail(`platform/other -> ${platformUnknown.status}`);
for (const [name, body, valid] of [
  ['пустой список', { version: 0, updatedAt: '2026-11-21T10:00:00Z', instruments: [] }, true],
  ['closeOnly', { version: 12, updatedAt: '2026-11-21T10:00:00Z', instruments: [{ symbol: 'LTCUSD', mode: 'closeOnly' }] }, true],
  ['неизвестный режим', { version: 1, updatedAt: '2026-11-21T10:00:00Z', instruments: [{ symbol: 'LTCUSD', mode: 'halt' }] }, false],
  ['без version', { updatedAt: '2026-11-21T10:00:00Z', instruments: [] }, false],
  ['лишнее поле', { version: 1, updatedAt: '2026-11-21T10:00:00Z', instruments: [{ symbol: 'LTCUSD', mode: 'trade', digits: 2 }] }, false],
]) {
  const validatePlatform = ajv.compile(readJson('contract', 'json-schema', 'cms.platform-instruments.schema.json'));
  validatePlatform(body) === valid
    ? console.log(`OK    platform/instruments схема: ${name} — ${valid ? 'принят' : 'отвергнут'}`)
    : fail(`platform/instruments схема: ${name} — ожидалось ${valid ? 'принять' : 'отвергнуть'}`);
}

const publicBrand = await get('/v1/cms/brand?site=apex-ru', {});
const publicBody = publicBrand.ok ? await publicBrand.json() : null;
if (publicBrand.status === 200 && publicBrand.headers.get('access-control-allow-origin') === '*' &&
    JSON.stringify(publicBody?.languages) === '["ru","en"]' && publicBody?.defaultLanguage === 'ru' &&
    publicBody?.heroBackground === 'quotes') {
  console.log('OK    public brand: languages, defaultLanguage, heroBackground');
} else fail(`public brand: HTTP ${publicBrand.status} ${JSON.stringify(publicBody)}`);

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
{
  const validateSites = ajv.compile(readJson('contract', 'json-schema', 'cms.sites.schema.json'));
  const base = { slug: 'apex-ru', name: 'Apex Capital', demoStartBalanceCents: 1000000, instruments: ['BTCUSD', 'LTCUSD'] };
  validateSites({ ...base, closeOnlyInstruments: ['LTCUSD'] })
    ? console.log('OK    sites: closeOnlyInstruments принят')
    : fail(`sites: closeOnlyInstruments отвергнут ${JSON.stringify(validateSites.errors)}`);
  validateSites({ ...base, closeOnlyInstruments: 'LTCUSD' }) || validateSites({ ...base, closeOnlyInstruments: ['LTCUSD', 'LTCUSD'] })
    ? fail('sites: схема пропускает closeOnlyInstruments не списком или с повтором')
    : console.log('OK    sites: схема отвергает closeOnlyInstruments не списком и с повтором');
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
