/**
 * Eksik yer içeriğini tamamlar (görsel + tanıtım özeti).
 *
 * `places` tablosunda `image_url` veya `short_description` boş olan aktif
 * yerleri bulur ve sırasıyla şu kaynaklardan doldurur:
 *   1. Yerel Kültür Portalı detay verisi (turkiye_gezilecek_yerler_detay.json)
 *   2. Türkçe Wikipedia (giriş paragrafı + sayfa görseli)
 *
 * Yalnızca boş alanlar yazılır; dolu alanlara dokunulmaz.
 *
 * Kullanım:
 *   node fill_missing_place_content.mjs              # dry run → fill_missing_place_content.out.json
 *   node fill_missing_place_content.mjs --sql        # Supabase SQL Editor için .sql dosyası üretir
 *   SUPABASE_SERVICE_ROLE_KEY=... node fill_missing_place_content.mjs --apply
 *
 * SUPABASE_URL / SUPABASE_ANON_KEY ../mobile/.env dosyasından okunur.
 * Service-role anahtarı yalnızca çalışma anında verilir; dosyaya yazmayın.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const SQL = args.has('--sql');

async function loadEnv() {
  try {
    const text = await fs.readFile(path.join(here, '../mobile/.env'), 'utf8');
    for (const line of text.split('\n')) {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch { /* .env yoksa ortam değişkenleri kullanılır */ }
}

await loadEnv();
const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const readKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const writeKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !readKey) throw new Error('SUPABASE_URL ve SUPABASE_ANON_KEY tanımlı olmalı.');
if (APPLY && !writeKey) throw new Error('--apply için SUPABASE_SERVICE_ROLE_KEY gerekir.');

const WIKI_HEADERS = { 'User-Agent': 'SmartTravelGuide/1.0 (content maintenance script)' };

async function rest(pathAndQuery, { method = 'GET', body, key = readKey } = {}) {
  const response = await fetch(`${baseUrl}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${pathAndQuery}: ${response.status} ${await response.text()}`);
  return method === 'GET' ? response.json() : null;
}

const norm = (value = '') => value
  .toLocaleLowerCase('tr')
  .replace(/i̇/g, 'i')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ı/g, 'i')
  .replace(/\b(cami(i|si)?|camisi)\b/g, 'cami')
  .replace(/[^a-z0-9]/g, '');

// Kültür Portalı metinlerinin sonunda kalan "<Şehir> Gezilecek Yerler" kırıntısı
const cleanText = (text = '') => text.replace(/\s*\S+\s+Gezilecek Yerler\s*$/u, '').replace(/\s+/g, ' ').trim();

// Ekranda kısa özet: en fazla ~4 cümle / 600 karakter
function summarize(text) {
  const clean = cleanText(text);
  if (clean.length <= 600) return clean;
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  let out = '';
  for (const sentence of sentences) {
    if ((out + sentence).length > 600) break;
    out += sentence;
  }
  return (out || clean.slice(0, 597) + '…').trim();
}

const isUsableImage = (url) => url && !/\.svg($|\?)/i.test(url) && !/(logo|flag|map|harita|locator)/i.test(url);

function buildLocalIndex(detay) {
  const index = new Map();
  for (const [cityName, data] of Object.entries(detay)) {
    for (const place of data.yerler || []) {
      const key = `${norm(cityName)}|${norm(place.Baslik)}`;
      if (!index.has(key)) index.set(key, place);
    }
  }
  return index;
}

// "KOCATEPE CAMİ " → "Kocatepe Cami"
const titleCase = (value) => value
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase('tr')
  .replace(/(^|[\s(-])(\p{L})/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase('tr'));

// Arama sonucunun gerçekten bu yere ait olup olmadığını anlamak için ayırt edici kelimeler
const GENERIC = new Set(['cami', 'camii', 'camisi', 'muzesi', 'muze', 'antik', 'kenti', 'kent', 'koyu', 'sarayi', 'kalesi',
  'turbesi', 'tabiat', 'parki', 'milli', 'golu', 'selalesi', 'selaleleri', 'han', 'medrese', 'medresesi', 've', 'yeri', 'oren',
  'kulliyesi', 'kaplicalari', 'yaylasi', 'vadisi', 'carsi', 'kilisesi', 'harabeleri', 'sehri', 'yeralti', 'bey', 'pasa', 'arkeoloji']);
// Şehir adı da ayırt edici değildir ("Düzce Şelaleleri" → "Niagara Şelaleleri" eşleşmesini önler)
const coreTokens = (value, cityName = '') => value.split(/[\s()-]+/).map(norm)
  .filter(t => t.length > 2 && !GENERIC.has(t) && t !== norm(cityName));

async function wikiFetch(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: WIKI_HEADERS });
    if (response.status === 429 || response.status >= 500) {
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    if (!response.ok) return null;
    return response.json();
  }
  return null;
}

function toResult(page) {
  const image = page.thumbnail?.source || page.original?.source || page.originalimage?.source;
  const extract = page.extract;
  return {
    description: extract && extract.length > 60 ? summarize(extract) : null,
    image: isUsableImage(image) ? image : null,
    sourceUrl: page.fullurl || page.content_urls?.mobile?.page || page.content_urls?.desktop?.page,
    matchedTitle: page.title,
  };
}

async function wikipediaLookup(name, cityName) {
  const title = titleCase(name.replace(/\(.*?\)/g, ''));
  const tokens = coreTokens(title, cityName);

  // 1) Tam başlık (yönlendirmeler dahil)
  const summary = await wikiFetch(`https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`);
  if (summary?.type === 'standard' && summary.extract && tokens.some(t => norm(summary.title).includes(t))) {
    const result = toResult(summary);
    if (result.description) return result;
  }

  // 2) Arama — ilk 5 sonuçtan, ayırt edici kelimelerden biri başlıkta geçen ilk sayfa
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2',
    generator: 'search', gsrsearch: `${title} ${cityName}`, gsrlimit: '5',
    prop: 'extracts|pageimages|info|pageprops', exintro: '1', explaintext: '1', exlimit: 'max',
    piprop: 'original|thumbnail', pithumbsize: '1200', pilimit: 'max', inprop: 'url', ppprop: 'disambiguation',
  });
  const pages = (await wikiFetch(`https://tr.wikipedia.org/w/api.php?${params}`))?.query?.pages || [];
  pages.sort((a, b) => a.index - b.index);
  const page = pages.find(p => (
    !p.pageprops?.disambiguation
    && !/anlam ayrımı/i.test(p.title)
    && tokens.length > 0
    && tokens.some(t => norm(p.title).includes(t))
  ));
  return page ? toResult(page) : null;
}

const sqlString = (value) => (value == null ? 'null' : `'${String(value).replace(/'/g, "''")}'`);

async function main() {
  const detay = JSON.parse(await fs.readFile(path.join(here, 'turkiye_gezilecek_yerler_detay.json'), 'utf8'));
  const localIndex = buildLocalIndex(detay);

  const cities = await rest('cities?select=id,name');
  const cityName = new Map(cities.map(c => [c.id, c.name]));

  const missing = await rest(
    'places?select=id,name,city_id,image_url,short_description,description,gallery,source_url'
    + '&is_active=eq.true&or=(image_url.is.null,short_description.is.null)&order=id',
  );
  console.log(`${missing.length} yerde eksik içerik var.`);

  const results = [];
  for (const place of missing) {
    const city = cityName.get(place.city_id) || '';
    const patch = {};
    let source = null;

    const local = localIndex.get(`${norm(city)}|${norm(place.name)}`);
    if (local) {
      if (!place.short_description && local.aciklama?.length > 80) patch.short_description = summarize(local.aciklama);
      if (!place.image_url && local.ana_fotograf) patch.image_url = local.ana_fotograf;
      if ((!place.gallery || !place.gallery.length) && local.fotograflar?.length) patch.gallery = local.fotograflar;
      if (Object.keys(patch).length) source = 'kulturportali';
    }

    const needsDesc = !place.short_description && !patch.short_description;
    const needsImage = !place.image_url && !patch.image_url;
    if (needsDesc || needsImage) {
      const wiki = await wikipediaLookup(place.name, city).catch(() => null);
      if (wiki) {
        if (needsDesc && wiki.description) patch.short_description = wiki.description;
        if (needsImage && wiki.image) patch.image_url = wiki.image;
        if (!place.source_url && (patch.short_description || patch.image_url) && !source) patch.source_url = wiki.sourceUrl;
        source = source ? `${source}+wikipedia` : 'wikipedia';
        results.push({ id: place.id, city, name: place.name, source, matchedTitle: wiki.matchedTitle, patch });
      } else {
        results.push({ id: place.id, city, name: place.name, source, patch });
      }
      await new Promise(r => setTimeout(r, 300)); // Wikipedia'ya nazik ol
    } else {
      results.push({ id: place.id, city, name: place.name, source, patch });
    }
  }

  const filled = results.filter(r => Object.keys(r.patch).length);
  const stillMissing = results.filter(r => {
    const orig = missing.find(p => p.id === r.id);
    return (!orig.image_url && !r.patch.image_url) || (!orig.short_description && !r.patch.short_description);
  });

  await fs.writeFile(path.join(here, 'fill_missing_place_content.out.json'), JSON.stringify(results, null, 2));
  console.log(`${filled.length} yer için içerik bulundu, ${stillMissing.length} yerde hâlâ eksik alan var.`);
  for (const r of stillMissing) console.log(`  - [${r.id}] ${r.city} / ${r.name}`);

  if (SQL) {
    const lines = ['-- fill_missing_place_content.mjs tarafından üretildi', 'begin;'];
    for (const r of filled) {
      const sets = Object.entries(r.patch).map(([column, value]) => (
        column === 'gallery'
          ? `gallery = ${sqlString(JSON.stringify(value))}::jsonb`
          : `${column} = coalesce(${column}, ${sqlString(value)})`
      ));
      lines.push(`update public.places set ${sets.join(', ')} where id = ${r.id};`);
    }
    lines.push('commit;');
    const file = path.join(here, 'fill_missing_place_content.sql');
    await fs.writeFile(file, lines.join('\n') + '\n');
    console.log(`SQL yazıldı: ${file}`);
  }

  if (APPLY) {
    for (const r of filled) {
      await rest(`places?id=eq.${r.id}`, { method: 'PATCH', body: r.patch, key: writeKey });
    }
    console.log(`${filled.length} yer güncellendi.`);
  }
}

await main();
