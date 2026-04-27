/**
 * cityImageService.js
 *
 * Şehir kartları için Kültür Portalı'ndan gelen gerçek fotoğrafları döndürür.
 * Detay verisi yoksa cityImages.js'deki Unsplash fallback'e düşer.
 */

import detayData from '../data/turkiye_gezilecek_yerler_detay.json';
import { getCityImages as getUnsplashImages } from '../constants/cityImages';

const BASE_URL = 'https://www.kulturportali.gov.tr';

// Şehir adı → normalize
function normalizeStr(str) {
    return (str || '').toLowerCase()
        .replace(/İ/g, 'i').replace(/ı/g, 'i').replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
        .replace(/Ü/g, 'u').replace(/ü/g, 'u').replace(/Ş/g, 's').replace(/ş/g, 's')
        .replace(/Ö/g, 'o').replace(/ö/g, 'o').replace(/Ç/g, 'c').replace(/ç/g, 'c');
}

// Şehir için Kültür Portalı fotoğraflarını çek
function getKulturPortaliImages(cityName) {
    // Direkt eşleşme
    let ilData = detayData[cityName];

    // Normalize ile eşleşme
    if (!ilData) {
        const norm = normalizeStr(cityName);
        const key = Object.keys(detayData).find(k => normalizeStr(k) === norm);
        if (key) ilData = detayData[key];
    }

    if (!ilData?.yerler?.length) return null;

    // İlk 5 yerin fotoğraflarını topla
    const photos = [];
    for (const yer of ilData.yerler.slice(0, 10)) {
        if (yer.ana_fotograf) photos.push(yer.ana_fotograf);
        if (photos.length >= 5) break;
    }

    if (!photos.length) return null;

    return {
        hero: photos[0],
        card: photos[0],
        gallery: photos,
        source: 'kulturportali',
    };
}

/**
 * Şehir için en iyi fotoğrafları döndürür.
 * Kültür Portalı verisi varsa onu, yoksa Unsplash fallback'i kullanır.
 *
 * @param {string} cityName
 * @param {string} [region]
 * @returns {{ hero: string, card: string, gallery: string[], source: string }}
 */
export function getCityImages(cityName, region) {
    const kp = getKulturPortaliImages(cityName);
    if (kp) return kp;
    return { ...getUnsplashImages(cityName, region), source: 'unsplash' };
}
