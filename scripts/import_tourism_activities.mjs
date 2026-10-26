/**
 * Turizm aktivitelerini ve şehir kapak görsellerini Supabase'e aktarır.
 *
 * Önce migration'ı çalıştırın: supabase/migrations/20261023120000_security_and_content.sql
 *
 * Çalıştırma (proje kök klasöründen):
 *   node scripts/import_tourism_activities.mjs
 *
 * SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenlerinden, yoksa
 * mobile/.env dosyasından okunur. Service role anahtarı yalnızca bu
 * bilgisayarda kullanılır; uygulamaya veya git'e girmemelidir.
 */
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { createClient } = require('../mobile/node_modules/@supabase/supabase-js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://www.kulturportali.gov.tr';
// mobile/.env içindeki değerleri (ortamda tanımlı değilse) yükle
try {
    const envText = await readFile(path.join(root, 'mobile/.env'), 'utf8');
    for (const line of envText.split(/\r?\n/)) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
} catch { /* .env yoksa ortam değişkenleri kullanılır */ }

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY bulunamadı (mobile/.env veya ortam değişkeni).');
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const encode = (url) => { try { return encodeURI(decodeURI(url)); } catch { return encodeURI(url); } };
const slugify = (value) => String(value).toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const titleCase = (value) => String(value).trim().toLocaleLowerCase('tr-TR')
    .replace(/(?:^|\s|-)\S/g, c => c.toLocaleUpperCase('tr-TR'));

const { data: cities, error: citiesError } = await supabase.from('cities').select('id, name');
if (citiesError) throw citiesError;

const { error: tableError } = await supabase.from('tourism_activities').select('id').limit(1);
if (tableError) {
    console.error('`tourism_activities` tablosu yok. Önce migration dosyasını Supabase SQL Editor\'da çalıştırın:\n  supabase/migrations/20261023120000_security_and_content.sql');
    process.exit(1);
}
const cityBySlug = new Map(cities.map(city => [slugify(city.name), city]));

// ── Turizm aktiviteleri ──────────────────────────────────────────────────────
const activities = JSON.parse(await readFile(path.join(root, 'mobile/src/data/turkiye_turizm_aktiviteleri.json'), 'utf8'));
const rows = activities.map(item => {
    const [rawType, ...rest] = item.Baslik.split(' - ');
    const slug = item.Url.split('/')[2];
    return {
        city_id: cityBySlug.get(slug)?.id ?? null,
        city_slug: slug,
        activity_type: rest.length ? titleCase(rawType) : 'Turizm Aktivitesi',
        title: titleCase(rest.length ? rest.join(' - ') : item.Baslik),
        image_url: item.Resim ? encode(`${BASE_URL}${item.Resim}`) : null,
        source_url: `${BASE_URL}${item.Url}`,
        last_synced_at: new Date().toISOString(),
    };
});
for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from('tourism_activities').upsert(rows.slice(i, i + 200), { onConflict: 'source_url' });
    if (error) throw error;
}
console.log(`✓ ${rows.length} turizm aktivitesi aktarıldı`);

// ── Şehir kapak görselleri (Kültür Portalı'ndaki en popüler yerlerden) ──────
const detail = JSON.parse(await readFile(path.join(root, 'mobile/src/data/turkiye_gezilecek_yerler_detay.json'), 'utf8'));
let updated = 0;
for (const city of cities) {
    const entry = detail[city.name];
    const photos = (entry?.yerler || []).map(place => place.ana_fotograf).filter(Boolean).slice(0, 6).map(encode);
    if (!photos.length) continue;
    const { error } = await supabase.from('cities')
        .update({ image_url: photos[0], hero_image_url: photos[0], gallery: photos })
        .eq('id', city.id)
        .is('image_url', null); // elle seçilmiş görselin üzerine yazma
    if (error) throw error;
    updated += 1;
}
console.log(`✓ ${updated} şehrin görseli güncellendi (önceden görseli olanlara dokunulmadı)`);
