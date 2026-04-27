/**
 * placeDataManager.js
 *
 * Kültür Portalı JSON veri seti → normalize → AsyncStorage cache
 */

import { cache, TTL } from './cacheService';
import yerlerData from '../data/turkiye_gezilecek_yerler.json';
import detayData from '../data/turkiye_gezilecek_yerler_detay.json';

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

    return {
        id: slug,
        osm_id: slug,
        name: toTitleCase(yer.Baslik || ''),
        category,
        emoji: getEmojiFromCategory(category),
        image_url: imageUrl,
        imageUrl,
        short_description: yer.aciklama || null,
        description: yer.aciklama || null,
        gallery: yer.fotograflar?.length ? yer.fotograflar : (imageUrl ? [imageUrl] : []),
        lat: null,
        lng: null,
        avg_duration: 1,
        entry_fee: 0,
        popularity_score: 50,
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
    // Cache key'e 'v2' ekle — eski cache'i geçersiz kıl
    const CACHE_KEY = `kp_places_v2_${city.name}`;

    const cached = await cache.get(CACHE_KEY);
    if (cached?.length) {
        onProgress?.('cache', 1, 1);
        return cached;
    }

    onProgress?.('Yerler yükleniyor...', 0, 1);

    const ilData = findCityData(city.name);
    if (!ilData?.yerler?.length) return [];

    const normalized = ilData.yerler.map((y, i) => normalizePlace(y, i));

    await cache.set(CACHE_KEY, normalized, TTL.WEEK);
    onProgress?.('Tamamlandı', 1, 1);
    return normalized;
}

export async function loadPlaceDetail(place) {
    return place;
}

export async function refreshCity(cityName) {
    await cache.invalidate(`kp_places_v2_${cityName}`);
}
