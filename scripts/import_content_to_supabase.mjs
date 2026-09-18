/**
 * Curated content importer
 *
 * Reads the generated CSV catalogue and upserts it through Supabase's REST API.
 * It requires a service-role key supplied only at runtime; do not put that key
 * in the mobile application or commit it to a file.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const catalogDir = '/Users/zeynep/Documents/SmartTravelGuide/outputs/content-csv';
const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CITY_REGIONS = {
  'Marmara': ['Balıkesir', 'Bilecik', 'Bursa', 'Çanakkale', 'Edirne', 'İstanbul', 'Kırklareli', 'Kocaeli', 'Sakarya', 'Tekirdağ', 'Yalova'],
  'Ege': ['Afyonkarahisar', 'Aydın', 'Denizli', 'İzmir', 'Kütahya', 'Manisa', 'Muğla', 'Uşak'],
  'Akdeniz': ['Adana', 'Antalya', 'Burdur', 'Hatay', 'Isparta', 'Kahramanmaraş', 'Mersin', 'Osmaniye'],
  'İç Anadolu': ['Aksaray', 'Ankara', 'Çankırı', 'Eskişehir', 'Karaman', 'Kayseri', 'Kırıkkale', 'Kırşehir', 'Konya', 'Nevşehir', 'Niğde', 'Sivas', 'Yozgat'],
  'Karadeniz': ['Amasya', 'Artvin', 'Bartın', 'Bayburt', 'Bolu', 'Çorum', 'Düzce', 'Giresun', 'Gümüşhane', 'Kastamonu', 'Karabük', 'Ordu', 'Rize', 'Samsun', 'Sinop', 'Tokat', 'Trabzon', 'Zonguldak'],
  'Doğu Anadolu': ['Ağrı', 'Ardahan', 'Bingöl', 'Bitlis', 'Elazığ', 'Erzincan', 'Erzurum', 'Hakkari', 'Iğdır', 'Kars', 'Malatya', 'Muş', 'Tunceli', 'Van'],
  'Güneydoğu Anadolu': ['Adıyaman', 'Batman', 'Diyarbakır', 'Gaziantep', 'Kilis', 'Mardin', 'Siirt', 'Şanlıurfa', 'Şırnak'],
};

function cityRegion(name) {
  return Object.entries(CITY_REGIONS).find(([, cities]) => cities.includes(name))?.[0] || 'İç Anadolu';
}

if (!baseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY çalışma anında tanımlanmalıdır.');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (!quoted && char === ',') { row.push(cell); cell = ''; continue; }
    if (!quoted && char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    if (char !== '\r') cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [headers, ...data] = rows;
  return data.filter(values => values.some(Boolean)).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

async function readCsv(fileName) {
  return parseCsv((await fs.readFile(path.join(catalogDir, fileName), 'utf8')).replace(/^\uFEFF/, ''));
}

async function rest(table, method, body, query = '') {
  const response = await fetch(`${baseUrl}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? [] : response.json();
}

function batches(rows, size = 250) {
  return Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size));
}

const cities = await readCsv('cities.csv');
const places = await readCsv('places.csv');
const specialties = await readCsv('specialties.csv');

const cityRows = cities.map(city => ({
  name: city.name,
  region: cityRegion(city.name),
  content_key: city.city_key,
  source_url: city.source_url,
  last_verified_at: null,
  content_status: city.content_status,
}));
const cityIds = new Map();
const storedCities = await rest('cities', 'GET', null, '?select=id,name,content_key&limit=500');
const cityByName = new Map(storedCities.map(city => [city.name, city]));
for (let index = 0; index < cities.length; index += 1) {
  const city = cities[index];
  const row = cityRows[index];
  // Eski uygulama kurulumlarında şehirler yalnızca adla bulunabilir. Önce o
  // kaydı güncellemek, aynı şehri ikinci kez oluşturmaktan daha güvenlidir.
  const existing = cityByName.get(city.name);
  const saved = existing
    ? (existing.content_key === city.city_key ? [existing] : await rest(`cities?id=eq.${existing.id}`, 'PATCH', row))
    // content_key için partial unique index kullanıldığı için PostgREST'in
    // on_conflict hedefi olamaz; şehir önceden ada göre aranmış olduğundan
    // yeni kayıt burada güvenle doğrudan eklenir.
    : await rest('cities', 'POST', [row]);
  const cityId = saved[0]?.id || existing?.id;
  if (!cityId) throw new Error(`${city.name} için şehir kaydı oluşturulamadı.`);
  cityIds.set(city.city_key, cityId);
}
console.log(`Cities ready: ${cityIds.size}`);

const placeRows = places
  .filter(place => cityIds.has(place.city_key))
  .map(place => ({
    city_id: cityIds.get(place.city_key),
    external_key: place.place_key,
    name: place.name,
    // Ham kaynakta standart kategori yok. Yanlış bir sınıflandırma türetmek
    // yerine DB'nin zorunlu alanı için nötr bir genel kategori kullanılır.
    category: place.category || 'attraction',
    short_description: place.description || null,
    image_url: place.primary_image_url || null,
    lat: place.lat ? Number(place.lat) : null,
    lng: place.lng ? Number(place.lng) : null,
    popularity_score: place.source_popularity_score ? Number(place.source_popularity_score) : null,
    source_url: place.source_url,
    gallery: place.gallery_json ? JSON.parse(place.gallery_json) : [],
    last_verified_at: null,
    content_status: place.content_status,
    is_active: true,
  }));
// external_key için kısmi unique index mevcut. PostgREST bu indeksi on_conflict
// hedefi olarak kullanamadığından, anahtarları bir kez okuyup yalnızca eksik
// kayıtları ekliyoruz. Böylece tekrar çalıştırmak çoğaltma yapmaz.
const storedPlaceKeys = new Set();
for (let offset = 0; ; offset += 1000) {
  const stored = await rest('places', 'GET', null, `?select=external_key&external_key=not.is.null&limit=1000&offset=${offset}`);
  stored.forEach(place => storedPlaceKeys.add(place.external_key));
  if (stored.length < 1000) break;
}
const newPlaceRows = placeRows.filter(place => !storedPlaceKeys.has(place.external_key));
for (const [index, batch] of batches(newPlaceRows).entries()) {
  await rest('places', 'POST', batch);
  console.log(`Places: ${Math.min((index + 1) * 250, newPlaceRows.length)}/${newPlaceRows.length}`);
}

const specialtyRows = specialties
  .filter(specialty => cityIds.has(specialty.city_key))
  .map(specialty => ({
    city_id: cityIds.get(specialty.city_key),
    name: specialty.name,
    kind: specialty.kind || 'snack',
    popularity_rank: specialty.source_popularity_score ? Math.max(1, 1000 - Number(specialty.source_popularity_score)) : 100,
    short_description: specialty.description || null,
    source_url: specialty.source_url,
    last_verified_at: null,
    is_active: true,
  }));
// Aynı kaynakta bazı lezzet adları aynı şehir için tekrar ediyor. DB'deki
// (city_id, name) tekillik kuralını korumak için ilk kaydı kullanıyoruz.
const uniqueSpecialtyRows = [...new Map(
  specialtyRows.map(row => [`${row.city_id}:${row.name.toLocaleLowerCase('tr-TR')}`, row])
).values()];
for (const [index, batch] of batches(uniqueSpecialtyRows).entries()) {
  await rest('city_specialties?on_conflict=city_id,name', 'POST', batch);
  console.log(`Specialties: ${Math.min((index + 1) * 250, uniqueSpecialtyRows.length)}/${uniqueSpecialtyRows.length}`);
}

console.log(JSON.stringify({ cities: cityRows.length, places: placeRows.length, specialties: uniqueSpecialtyRows.length }, null, 2));
