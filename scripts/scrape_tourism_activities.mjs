/**
 * Kültür Portalı "Turizm Aktiviteleri" listesini (81 il, ~550 kayıt) çeker.
 *
 * Çıktı: mobile/src/data/turkiye_turizm_aktiviteleri.json
 *   Uygulama bu dosyayı çevrimdışı yedek olarak paketler; Supabase'e aktarmak
 *   için: node scripts/import_tourism_activities.mjs
 *
 * Çalıştırma:  node scripts/scrape_tourism_activities.mjs
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const API_URL = 'https://www.kulturportali.gov.tr/Moduller/TurizmAktiviteleri.aspx/TurizmAktiviteleriFilitreliGetir';
const PAGE_SIZE = 100;
const OUTPUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../mobile/src/data/turkiye_turizm_aktiviteleri.json');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPage(sira) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (SmartTravelGuide content sync)',
        },
        body: JSON.stringify({
            sira: String(sira), sayi: String(PAGE_SIZE), TurKod: '0', ilID: '0',
            gorsel: false, aramaText: '', etiket: '', hariciEtiket: '',
        }),
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const items = typeof json.d === 'string' ? JSON.parse(json.d) : json.d;
    return Array.isArray(items) ? items : [];
}

const first = await fetchPage(1);
const total = Number(first[0]?.KayitSayisi ?? first.length);
const all = [...first];
for (let sira = 2; all.length < total; sira++) {
    await sleep(600); // portalı yormamak için
    const page = await fetchPage(sira);
    if (!page.length) break;
    all.push(...page);
    console.log(`${all.length}/${total}`);
}

// Portal bazen "//www..." ile başlayan, bazen göreli resim yolu döndürür.
const cleaned = [...new Map(all.map(item => [item.Url, {
    Baslik: String(item.Baslik || '').trim(),
    Resim: String(item.Resim || '').replace(/^\/\/www\.kulturportali\.gov\.tr/, ''),
    Url: item.Url,
    KayitSayisi: item.KayitSayisi,
}])).values()];

await writeFile(OUTPUT, JSON.stringify(cleaned, null, 2) + '\n');
console.log(`✓ ${cleaned.length} aktivite yazıldı → ${OUTPUT}`);
