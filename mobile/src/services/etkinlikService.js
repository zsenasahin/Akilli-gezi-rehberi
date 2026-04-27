/**
 * etkinlikService.js
 * Kültür Portalı etkinlik API'si
 */

import { cache, TTL } from './cacheService';

const API_URL = 'https://www.kulturportali.gov.tr/Etkinlikler.aspx/EtkinlikFilitreliGetir';
const BASE_URL = 'https://www.kulturportali.gov.tr';

export async function getEtkinlikler({ sayi = 10, ilID = '0', sira = '1' } = {}) {
    const CACHE_KEY = `etkinlikler_v2_${ilID}_${sira}_${sayi}`;
    const cached = await cache.get(CACHE_KEY);
    if (cached) return { data: cached, error: null };

    try {
        const body = JSON.stringify({
            sira: String(sira),
            sayi: Number(sayi),
            TurKod: '0',
            KategoriID: '-1',
            NitelikKod: '0',
            TarihBaslangic: '',
            TarihBitis: '',
            ilID: String(ilID),
            gorsel: false,
            aramaText: '',
            etiket: '',
            hariciEtiket: '',
            nearest: false,
            lat: '0',
            lang: '0',
            clickDate: '',
        });

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Accept': 'application/json, text/javascript, */*',
            },
            body,
            signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const inner = typeof json.d === 'string' ? JSON.parse(json.d) : json.d;
        const data = Array.isArray(inner) ? inner.map(normalizeEtkinlik) : [];

        await cache.set(CACHE_KEY, data, 30); // 30 dakika
        return { data, error: null };
    } catch (err) {
        console.warn('[etkinlikService] hata:', err.message);
        return { data: [], error: err.message };
    }
}

function normalizeEtkinlik(e) {
    const saat = (e.Saat || '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const parts = saat.split('~');
    const baslangic = parts[0]?.trim() || '';
    const bitis = parts[1]?.trim() || '';

    return {
        gun: e.Gun || '',
        ay: e.Ay || '',
        baslik: toTitleCase(e.Baslik || ''),
        tur: e.Tur || '',
        baslangic,
        bitis,
        il: e.Il || '',
        aciklama: e.Aciklama || '',
        adres: (e.Adres || '').replace(/\n/g, ', ').trim(),
        imageUrl: e.Resim ? `${BASE_URL}${e.Resim}` : null,
        lokasyon: e.Lokasyon || null,
        url: e.Url ? `${BASE_URL}${e.Url}` : null,
        toplam: e.KayitSayisi || 0,
    };
}

function toTitleCase(str) {
    return (str || '').toLowerCase()
        .replace(/(?:^|\s|[-])\S/g, c => c.toUpperCase())
        .replace(/\bVe\b/g, 've')
        .replace(/\bİle\b/g, 'ile');
}
