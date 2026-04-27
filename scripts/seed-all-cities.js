#!/usr/bin/env node
/**
 * seed-all-cities.js — Tüm şehirler için gezilecek yerleri Overpass'tan çekip Supabase'e kaydeder.
 *
 * Kullanım:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_ANON_KEY=xxx node scripts/seed-all-cities.js
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/seed-all-cities.js --city-id=5
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/seed-all-cities.js --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// ── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ SUPABASE_URL ve SUPABASE_ANON_KEY environment variable\'ları gerekli.');
    console.error('   Örnek: SUPABASE_URL=https://xxx.supabase.co SUPABASE_ANON_KEY=xxx node scripts/seed-all-cities.js');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DRY_RUN = process.argv.includes('--dry-run');
const CITY_ID_ARG = process.argv.find(a => a.startsWith('--city-id='));
const TARGET_CITY_ID = CITY_ID_ARG ? parseInt(CITY_ID_ARG.split('=')[1]) : null;

const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const TR_WIKI = 'https://tr.wikipedia.org/api/rest_v1/page/summary';
const EN_WIKI = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const HEADERS = { Accept: 'application/json', 'User-Agent': 'SmartTravelGuide/1.0' };
const RATE_LIMIT_MS = 1200;

// ── Yardımcılar ──────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .normalize('NFC').trim();
}

function getCategoryFromTags(tags) {
    if (tags.tourism === 'museum') return 'müze';
    if (tags.tourism === 'attraction') return 'tarihi';
    if (tags.tourism === 'viewpoint') return 'doğa';
    if (tags.historic === 'castle') return 'tarihi';
    if (tags.historic === 'mosque' || tags.amenity === 'place_of_worship') return 'dini';
    if (tags.historic) return 'tarihi';
    if (tags.leisure === 'park' || tags.leisure === 'garden') return 'park';
    if (tags.natural) return 'doğa';
    return 'tarihi';
}

// ── Overpass ─────────────────────────────────────────────────────────────────

async function queryOverpass(query) {
    for (const server of OVERPASS_SERVERS) {
        try {
            const res = await fetch(server, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `data=${encodeURIComponent(query)}`,
                signal: AbortSignal.timeout(25000),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.elements?.length) return data.elements;
            }
        } catch (e) {
            console.warn(`  ⚠️  Overpass sunucusu başarısız (${server}): ${e.message}`);
        }
    }
    return [];
}

async function fetchPlacesFromOverpass(lat, lng, radiusM = 8000) {
    const query = `
[out:json][timeout:25];
(
  node["tourism"~"attraction|museum|viewpoint|artwork|gallery|theme_park|zoo"](around:${radiusM},${lat},${lng});
  node["historic"~"castle|monument|ruins|mosque|church|synagogue|memorial|archaeological_site|building|fort"](around:${radiusM},${lat},${lng});
  node["amenity"="place_of_worship"]["name"](around:${radiusM},${lat},${lng});
  node["leisure"~"park|garden|nature_reserve"](around:${radiusM},${lat},${lng});
  way["tourism"~"attraction|museum"](around:${radiusM},${lat},${lng});
  way["historic"](around:${radiusM},${lat},${lng});
);
out center 60;
    `.trim();

    const elements = await queryOverpass(query);
    return elements
        .filter((el) => el.tags?.name)
        .map((el) => {
            const tags = el.tags || {};
            const category = getCategoryFromTags(tags);
            return {
                osm_id: String(el.id),
                name: cleanText(tags.name || tags['name:tr'] || ''),
                lat: el.lat ?? el.center?.lat,
                lng: el.lon ?? el.center?.lon,
                category,
                wikidata_id: tags.wikidata || null,
                website: tags.website || tags['contact:website'] || '',
                phone: tags.phone || tags['contact:phone'] || '',
                opening_hours: tags.opening_hours || '',
            };
        })
        .filter((p) => p.lat && p.lng && p.name);
}

// ── Wikidata / Wikipedia ──────────────────────────────────────────────────────

async function fetchWikidataInfo(wikidataId) {
    if (!wikidataId) return null;
    try {
        const url = `${WIKIDATA_API}?action=wbgetentities&ids=${wikidataId}&format=json&languages=tr|en&props=descriptions|sitelinks&origin=*`;
        const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const data = await res.json();
        const entity = data.entities?.[wikidataId];
        if (!entity) return null;
        return {
            description: cleanText(entity.descriptions?.tr?.value || entity.descriptions?.en?.value || ''),
            trWiki: entity.sitelinks?.trwiki?.title || null,
            enWiki: entity.sitelinks?.enwiki?.title || null,
            commonsCategory: entity.sitelinks?.commonswiki?.title?.replace('Category:', '') || null,
        };
    } catch { return null; }
}

async function fetchWikipediaPhoto(title, lang = 'tr') {
    if (!title) return null;
    try {
        const api = lang === 'tr' ? TR_WIKI : EN_WIKI;
        const res = await fetch(`${api}/${encodeURIComponent(title)}`, {
            headers: HEADERS, signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.type === 'disambiguation') return null;
        return {
            description: cleanText(data.extract || ''),
            imageUrl: data.originalimage?.source || data.thumbnail?.source || null,
        };
    } catch { return null; }
}

async function fetchCommonsPhoto(placeName) {
    if (!placeName) return null;
    try {
        const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(placeName)}&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=800&origin=*`;
        const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const data = await res.json();
        const pages = Object.values(data.query?.pages || {});
        for (const page of pages) {
            const imgUrl = page.imageinfo?.[0]?.url;
            if (imgUrl && /\.(jpg|jpeg|png)$/i.test(imgUrl)) return imgUrl;
        }
    } catch { /* sessizce */ }
    return null;
}

// ── Enrich ────────────────────────────────────────────────────────────────────

async function enrichPlaces(rawPlaces, cityName) {
    const enriched = [];
    for (let i = 0; i < rawPlaces.length; i++) {
        const place = rawPlaces[i];
        let description = '';
        let imageUrl = null;

        try {
            if (place.wikidata_id) {
                const wdInfo = await fetchWikidataInfo(place.wikidata_id);
                if (wdInfo) {
                    description = wdInfo.description;
                    const wikiTitle = wdInfo.trWiki || wdInfo.enWiki;
                    if (wikiTitle) {
                        const lang = wdInfo.trWiki ? 'tr' : 'en';
                        const wikiData = await fetchWikipediaPhoto(wikiTitle, lang);
                        if (wikiData) {
                            if (!description) description = wikiData.description;
                            imageUrl = wikiData.imageUrl;
                        }
                    }
                    if (!imageUrl && wdInfo.commonsCategory) {
                        imageUrl = await fetchCommonsPhoto(wdInfo.commonsCategory);
                    }
                }
            }

            if (!imageUrl || !description) {
                const wikiData = await fetchWikipediaPhoto(place.name, 'tr');
                if (wikiData) {
                    if (!description) description = wikiData.description;
                    if (!imageUrl) imageUrl = wikiData.imageUrl;
                }
            }

            if (!imageUrl) {
                imageUrl = await fetchCommonsPhoto(place.name);
            }
        } catch { /* kısmi veriyle devam */ }

        enriched.push({ ...place, description, imageUrl });

        process.stdout.write(`\r  📍 ${cityName}: ${i + 1}/${rawPlaces.length} yer işlendi`);

        if (i % 3 === 2) await sleep(RATE_LIMIT_MS);
    }
    console.log(); // satır sonu
    return enriched;
}

// ── Supabase ──────────────────────────────────────────────────────────────────

async function savePlacesToSupabase(cityId, places) {
    if (!places.length) return 0;

    const osmIds = places.map((p) => p.osm_id).filter(Boolean);
    const { data: existing } = await supabase
        .from('places').select('osm_id').in('osm_id', osmIds);

    const existingIds = new Set((existing || []).map((e) => e.osm_id));
    const newPlaces = places.filter((p) => !existingIds.has(p.osm_id));

    if (!newPlaces.length) return 0;

    const rows = newPlaces.map((p) => ({
        city_id: cityId,
        osm_id: p.osm_id,
        name: p.name,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        image_url: p.imageUrl || null,
        short_description: p.description ? p.description.slice(0, 300) : null,
        website: p.website || null,
        phone: p.phone || null,
        opening_hours: p.opening_hours || null,
        popularity_score: 50,
        avg_duration: 1,
        entry_fee: 0,
        source: 'osm',
    }));

    const { error } = await supabase.from('places').insert(rows);
    if (error) throw new Error(`Supabase insert hatası: ${error.message}`);
    return rows.length;
}

// ── Ana Akış ──────────────────────────────────────────────────────────────────

async function processCity(city) {
    console.log(`\n🏙️  ${city.name} (id: ${city.id}) işleniyor...`);

    // Bu şehirde zaten kayıt var mı?
    const { data: existing, error: checkErr } = await supabase
        .from('places').select('id', { count: 'exact', head: true }).eq('city_id', city.id);

    if (checkErr) {
        console.warn(`  ⚠️  Kontrol hatası: ${checkErr.message}`);
    }

    const { count } = await supabase
        .from('places').select('*', { count: 'exact', head: true }).eq('city_id', city.id);

    if (count > 0) {
        console.log(`  ✅ Zaten ${count} yer mevcut, atlanıyor.`);
        return { city: city.name, status: 'skipped', count };
    }

    // Overpass'tan çek
    console.log(`  🌍 Overpass'tan veriler çekiliyor (${city.lat}, ${city.lng})...`);
    const rawPlaces = await fetchPlacesFromOverpass(city.lat, city.lng);

    if (!rawPlaces.length) {
        console.log(`  ⚠️  Overpass'tan hiç yer bulunamadı.`);
        return { city: city.name, status: 'empty', count: 0 };
    }

    console.log(`  📦 ${rawPlaces.length} ham yer bulundu, zenginleştiriliyor...`);

    // Wikidata/Wikipedia ile zenginleştir
    const enriched = await enrichPlaces(rawPlaces, city.name);

    if (DRY_RUN) {
        console.log(`  🔍 [DRY-RUN] ${enriched.length} yer kaydedilecekti (Supabase'e yazılmadı).`);
        return { city: city.name, status: 'dry-run', count: enriched.length };
    }

    // Supabase'e kaydet
    const saved = await savePlacesToSupabase(city.id, enriched);
    console.log(`  💾 ${saved} yeni yer Supabase'e kaydedildi.`);
    return { city: city.name, status: 'seeded', count: saved };
}

async function main() {
    console.log('🚀 Şehir Seed Scripti başlatılıyor...');
    if (DRY_RUN) console.log('🔍 DRY-RUN modu aktif — Supabase\'e yazılmayacak.\n');

    // Tüm şehirleri çek
    let query = supabase.from('cities').select('id, name, lat, lng').order('name');
    if (TARGET_CITY_ID) query = query.eq('id', TARGET_CITY_ID);

    const { data: cities, error } = await query;
    if (error) {
        console.error('❌ Şehirler çekilemedi:', error.message);
        process.exit(1);
    }

    if (!cities?.length) {
        console.error('❌ Hiç şehir bulunamadı. cities tablosunu kontrol et.');
        process.exit(1);
    }

    console.log(`📋 ${cities.length} şehir bulundu.\n`);

    const results = [];
    for (const city of cities) {
        try {
            const result = await processCity(city);
            results.push(result);
            // Şehirler arası bekleme — Overpass rate limit
            await sleep(2000);
        } catch (err) {
            console.error(`  ❌ ${city.name} işlenirken hata: ${err.message}`);
            results.push({ city: city.name, status: 'error', error: err.message });
        }
    }

    // Özet
    console.log('\n─────────────────────────────────────────');
    console.log('📊 ÖZET:');
    for (const r of results) {
        const icon = r.status === 'seeded' ? '✅' : r.status === 'skipped' ? '⏭️' : r.status === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} ${r.city}: ${r.status} (${r.count ?? r.error ?? 0})`);
    }
    console.log('─────────────────────────────────────────');
    console.log('✅ Tamamlandı.');
}

main().catch((err) => {
    console.error('❌ Beklenmeyen hata:', err);
    process.exit(1);
});
