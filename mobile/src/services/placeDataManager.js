/**
 * placeDataManager.js
 *
 * Kültür Portalı JSON veri seti → normalize → AsyncStorage cache
 */

import { cache, TTL } from './cacheService';
import { supabase } from '../config/supabase';
import { batchGeocodeForCity, countMissingCoords } from './geocodingService';
import { estimateDuration, estimateClosingHour } from '../algorithms/smartDuration';
import { getCityCenter } from '../constants/cities';
import yerlerData from '../data/turkiye_gezilecek_yerler.json';
import detayData from '../data/turkiye_gezilecek_yerler_detay.json';

// Kültür Portalı'nın kendi haritasından çekilmiş doğru koordinatlar
let placeCoordinates = {};
try {
    placeCoordinates = require('../data/place_coordinates.json');
} catch (e) {
    console.warn('[PlaceDataManager] place_coordinates.json bulunamadı, geocoding kullanılacak');
}

const BASE_IMAGE_URL = 'https://www.kulturportali.gov.tr';

// ─── Kategori tahmini ─────────────────────────────────────────────────────────

function getCategoryFromTitle(title = '') {
    const t = title.toLowerCase();
    if (t.includes('cami') || t.includes('camii') || t.includes('kilise') || t.includes('türbe') || t.includes('tekke') || t.includes('dergah') || t.includes('mescit')) return 'dini';
    if (t.includes('müze') || t.includes('müzesi') || t.includes('galeri')) return 'müze';
    if (t.includes('kale') || t.includes('hisar') || t.includes('saray') || t.includes('anıt') || t.includes('harabe') || t.includes('antik') || t.includes('höyük') || t.includes('köprü') || t.includes('kervansaray')) return 'tarihi';
    if (t.includes('park') || t.includes('orman') || t.includes('şelale') || t.includes('göl') || t.includes('plaj') || t.includes('sahil') || t.includes('dağ') || t.includes('mağara') || t.includes('kanyon')) return 'doğa';
    return 'tarihi';
}

function getCategoryFromUrl(url = '') {
    const u = url.toLowerCase();
    if (u.includes('cami') || u.includes('kilise') || u.includes('tekke') || u.includes('turbe')) return 'dini';
    if (u.includes('muze') || u.includes('muzesi')) return 'müze';
    if (u.includes('kale') || u.includes('hisar') || u.includes('saray') || u.includes('anit') || u.includes('antik')) return 'tarihi';
    if (u.includes('park') || u.includes('orman') || u.includes('doga') || u.includes('selalesi') || u.includes('golu') || u.includes('plaj') || u.includes('dagi')) return 'doğa';
    return 'tarihi';
}

function getCategory(baslik, url) {
    const fromTitle = getCategoryFromTitle(baslik);
    if (fromTitle !== 'tarihi') return fromTitle;
    return getCategoryFromUrl(url);
}

function getEmojiFromCategory(cat) {
    const map = { 'müze': '🎨', 'tarihi': '🏛️', 'dini': '🕌', 'doğa': '🌿', 'park': '🌳', 'eğlence': '🎭' };
    return map[cat] || '📍';
}

function toTitleCase(str) {
    return str
        .toLowerCase()
        .replace(/(?:^|\s|[-])\S/g, (c) => c.toUpperCase())
        .replace(/\bVe\b/g, 've')
        .replace(/\bİle\b/g, 'ile');
}

function normalizeStr(str) {
    return (str || '').toLowerCase()
        .replace(/İ/g, 'i').replace(/ı/g, 'i').replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
        .replace(/Ü/g, 'u').replace(/ü/g, 'u').replace(/Ş/g, 's').replace(/ş/g, 's')
        .replace(/Ö/g, 'o').replace(/ö/g, 'o').replace(/Ç/g, 'c').replace(/ç/g, 'c');
}

// ─── Normalize ────────────────────────────────────────────────────────────────

function normalizePlace(yer, idx) {
    const category = getCategory(yer.Baslik || '', yer.Url || '');
    const imageUrl = yer.ana_fotograf
        ? yer.ana_fotograf
        : yer.Resim ? `${BASE_IMAGE_URL}${yer.Resim}` : null;

    const slug = yer.Url?.split('/').pop() || `place-${idx}`;

    const placeName = toTitleCase(yer.Baslik || '');
    const smartDuration = estimateDuration(yer.Baslik || '', category);
    const closingHour = estimateClosingHour(yer.Baslik || '', category);

    // Koordinat: önce place_coordinates.json'dan bak (Kültür Portalı'nın kendi haritasından)
    const urlPath = yer.Url || '';
    const portalCoords = placeCoordinates[urlPath];
    const lat = portalCoords?.lat ?? null;
    const lng = portalCoords?.lng ?? null;

    return {
        id: slug,
        osm_id: slug,
        name: placeName,
        category,
        emoji: getEmojiFromCategory(category),
        image_url: imageUrl,
        imageUrl,
        short_description: yer.aciklama || null,
        description: yer.aciklama || null,
        gallery: yer.fotograflar?.length ? yer.fotograflar : (imageUrl ? [imageUrl] : []),
        lat,
        lng,
        avg_duration: smartDuration,
        closing_hour: closingHour,
        entry_fee: 0,
        popularity_score: yer.KayitSayisi ?? 50,
        source: 'kulturportali',
        kulturportali_url: yer.Url ? `${BASE_IMAGE_URL}${yer.Url}` : null,
        website: yer.Url ? `${BASE_IMAGE_URL}${yer.Url}` : null,
        address: '',
        phone: '',
        opening_hours: '',
        wikidata_id: null,
    };
}

// ─── Şehir adı eşleştirme ─────────────────────────────────────────────────────

function findCityData(cityName) {
    // Önce detay verisinde ara (açıklama + galeri var)
    if (detayData[cityName]?.yerler?.length) return detayData[cityName];

    // Normalize edilmiş isimle ara
    const norm = normalizeStr(cityName);
    const detayKey = Object.keys(detayData).find(k => normalizeStr(k) === norm);
    if (detayKey && detayData[detayKey]?.yerler?.length) return detayData[detayKey];

    // Temel veride ara
    if (yerlerData[cityName]?.yerler?.length) return yerlerData[cityName];
    const temelKey = Object.keys(yerlerData).find(k => normalizeStr(k) === norm);
    if (temelKey) return yerlerData[temelKey];

    return null;
}

// ─── Ana Manager ──────────────────────────────────────────────────────────────

export async function loadCityPlaces(city, onProgress) {
    // Süre kuralları güncellendiğinde eski 1 saatlik tahminleri kullanmamak için
    // sürümlü cache anahtarı kullanıyoruz.
    const CACHE_KEY = `published_places_v1_${city.id ?? city.name}`;

    const cached = await cache.get(CACHE_KEY);
    if (cached?.length) {
        onProgress?.('cache', 1, 1);
        return cached;
    }

    onProgress?.('Yerler yükleniyor...', 0, 1);

    // Yayın verisi Supabase'te varsa onu kullan. Statik Kültür Portalı dosyası
    // yalnızca ilk içerik aktarımı tamamlanana veya çevrimdışı kalınana kadar
    // güvenli geri dönüş kaynağıdır.
    if (city.id != null) {
        try {
            const { data, error } = await supabase
                .from('places')
                .select('id, name, category, image_url, short_description, description, gallery, lat, lng, avg_duration, entry_fee, popularity_score, opening_hours, source_url')
                .eq('city_id', city.id)
                .eq('is_active', true)
                .order('popularity_score', { ascending: false });
            if (!error && data?.length) {
                const published = data.map(place => ({
                    ...place,
                    imageUrl: place.image_url,
                    description: place.description || place.short_description,
                    gallery: Array.isArray(place.gallery) ? place.gallery : [],
                    avg_duration: place.avg_duration || null,
                    source: 'database',
                }));
                await cache.set(CACHE_KEY, published, TTL.WEEK);
                onProgress?.('Tamamlandı', 1, 1);
                return published;
            }
            if (error) console.warn('[PlaceDataManager] DB yerleri okunamadı:', error.message);
        } catch (error) {
            console.warn('[PlaceDataManager] DB yerleri okunamadı:', error.message);
        }
    }

    const ilData = findCityData(city.name);
    if (!ilData?.yerler?.length) return [];

    // 1. Normalize (akıllı süre + kapanış saati tahmini)
    let normalized = ilData.yerler.map((y, i) => normalizePlace(y, i));

    // 2. Geocoding — koordinatları çözümle
    const missingCount = countMissingCoords(normalized);
    if (missingCount > 0) {
        const cityCenter = getCityCenter(city.name);
        onProgress?.(`Konumlar çözümleniyor (${missingCount} yer)...`, 0, missingCount);
        try {
            normalized = await batchGeocodeForCity(
                normalized,
                city.name,
                cityCenter,
                (current, total, geocoded) => {
                    onProgress?.(`Konum çözümleniyor: ${current}/${total}`, current, total);
                }
            );
        } catch (err) {
            console.warn('[PlaceDataManager] Geocoding hatası, devam ediliyor:', err.message);
            // Geocoding başarısız olsa bile koordinatsız verilerle devam et
        }
    }

    await cache.set(CACHE_KEY, normalized, TTL.WEEK);
    onProgress?.('Tamamlandı', 1, 1);
    return normalized;
}

export async function loadPlaceDetail(place) {
    return place;
}

export async function refreshCity(cityName) {
    await cache.invalidate(`kp_places_v3_${cityName}`);
    await cache.invalidate(`kp_places_v2_${cityName}`); // eski cache'i de temizle
    await cache.invalidate(`geocode_coords_v2_${cityName}`);
}
