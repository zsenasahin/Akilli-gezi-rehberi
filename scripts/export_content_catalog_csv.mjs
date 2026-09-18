import fs from 'node:fs/promises';
import path from 'node:path';
import placesByCity from '../mobile/src/data/turkiye_gezilecek_yerler_detay.json' with { type: 'json' };
import specialtiesByCity from '../scripts/turkiye_mutfak_detay.json' with { type: 'json' };
import cityGeo from '../mobile/src/data/tr_cities_geo.json' with { type: 'json' };
import placeCoordinates from '../mobile/src/data/place_coordinates.json' with { type: 'json' };

const outputDir = '/Users/zeynep/Documents/SmartTravelGuide/outputs/content-csv';
const culturePortalBaseUrl = 'https://www.kulturportali.gov.tr';
const generatedAt = new Date().toISOString();

function slugify(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function absoluteUrl(value) {
  if (!value) return '';
  return value.startsWith('http') ? value : `${culturePortalBaseUrl}${value}`;
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

async function writeCsv(fileName, headers, rows) {
  const csv = [headers, ...rows]
    .map(row => row.map(csvCell).join(','))
    .join('\n');
  await fs.writeFile(path.join(outputDir, fileName), `\uFEFF${csv}\n`, 'utf8');
}

function flattenCoordinates(value, result = []) {
  if (!Array.isArray(value)) return result;
  if (typeof value[0] === 'number' && typeof value[1] === 'number') {
    result.push(value);
    return result;
  }
  value.forEach(item => flattenCoordinates(item, result));
  return result;
}

function cityCentersFromGeoJson() {
  return new Map(cityGeo.features.map(feature => {
    const points = flattenCoordinates(feature.geometry.coordinates);
    const lats = points.map(([, lat]) => lat);
    const lngs = points.map(([lng]) => lng);
    return [feature.properties.name, {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    }];
  }));
}

await fs.mkdir(outputDir, { recursive: true });
const cityCenters = cityCentersFromGeoJson();
const cityNames = [...new Set([...Object.keys(placesByCity), ...Object.keys(specialtiesByCity)])]
  .sort((first, second) => first.localeCompare(second, 'tr-TR'));

const cities = cityNames.map(cityName => {
  const center = cityCenters.get(cityName) || {};
  return [slugify(cityName), cityName, center.lat || '', center.lng || '', 'Kültür Portalı / mevcut uygulama veri seti', culturePortalBaseUrl, generatedAt, 'source_imported'];
});

const places = [];
for (const cityName of cityNames) {
  for (const place of placesByCity[cityName]?.yerler || []) {
    const sourcePath = place.Url || '';
    const coordinates = placeCoordinates[sourcePath] || {};
    const placeSlug = sourcePath.split('/').filter(Boolean).at(-1) || slugify(place.Baslik);
    places.push([
      `${slugify(cityName)}-${placeSlug}`,
      slugify(cityName),
      cityName,
      place.Baslik || '',
      '', // category: editoryal olarak doğrulanacak
      coordinates.lat || '',
      coordinates.lng || '',
      place.KayitSayisi || '',
      '', // visit_duration_minutes: editoryal olarak doğrulanacak
      place.aciklama || '',
      absoluteUrl(place.ana_fotograf || place.Resim),
      place.fotograflar || [],
      absoluteUrl(sourcePath),
      generatedAt,
      'source_imported',
    ]);
  }
}

const specialties = [];
for (const cityName of cityNames) {
  for (const specialty of specialtiesByCity[cityName]?.yemekler || []) {
    const sourcePath = specialty.Url || '';
    const itemSlug = sourcePath.split('/').filter(Boolean).at(-1) || slugify(specialty.Baslik);
    specialties.push([
      `${slugify(cityName)}-${itemSlug}`,
      slugify(cityName),
      cityName,
      specialty.Baslik || '',
      '', // kind: main_dish / dessert / drink editoryal olarak sınıflandırılacak
      specialty.KayitSayisi || '',
      specialty.description || '',
      absoluteUrl(specialty.ana_fotograf || specialty.Resim),
      specialty.fotograflar || [],
      absoluteUrl(sourcePath),
      generatedAt,
      'source_imported',
    ]);
  }
}

const researchQueue = cityNames.map((cityName, index) => [
  slugify(cityName),
  cityName,
  index < 10 ? 'high' : 'normal',
  'venues_and_route_templates',
  'Her şehir için 3-4 rota şablonu, rota durakları, restoran/kafe ve işletme-lezzet doğrulaması gerekiyor.',
  'pending',
]);

await writeCsv('cities.csv',
  ['city_key', 'name', 'center_lat', 'center_lng', 'source_name', 'source_url', 'imported_at', 'content_status'], cities);
await writeCsv('places.csv',
  ['place_key', 'city_key', 'city_name', 'name', 'category', 'lat', 'lng', 'source_popularity_score', 'visit_duration_minutes', 'description', 'primary_image_url', 'gallery_json', 'source_url', 'imported_at', 'content_status'], places);
await writeCsv('specialties.csv',
  ['specialty_key', 'city_key', 'city_name', 'name', 'kind', 'source_popularity_score', 'description', 'primary_image_url', 'gallery_json', 'source_url', 'imported_at', 'content_status'], specialties);
await writeCsv('research_queue.csv',
  ['city_key', 'city_name', 'priority', 'research_scope', 'required_output', 'status'], researchQueue);
await writeCsv('README.csv',
  ['file_name', 'records', 'purpose'], [
    ['cities.csv', cities.length, 'Şehir anahtarları ve merkez koordinatları'],
    ['places.csv', places.length, 'Kültür Portalı kaynaklı gezilecek yerler'],
    ['specialties.csv', specialties.length, 'Kültür Portalı kaynaklı yöresel lezzetler'],
    ['research_queue.csv', researchQueue.length, 'İşletme ve editoryal rota araştırma kuyruğu'],
  ]);

console.log(JSON.stringify({ cities: cities.length, places: places.length, specialties: specialties.length, researchQueue: researchQueue.length }, null, 2));
