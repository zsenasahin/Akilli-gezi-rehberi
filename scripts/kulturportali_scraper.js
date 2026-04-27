#!/usr/bin/env node
/**
 * kulturportali_scraper.js
 * Kültür Portalı'ndan 81 il için gezilecek yerleri çeker ve JSON olarak kaydeder.
 *
 * Kullanım:
 *   node scripts/kulturportali_scraper.js
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── API ilID → şehir adı mapping (URL'den tespit edildi) ─────────────────────
// API'nin kendi ilID sistemi resmi il numaralarından farklı.
// Tüm geçerli ilID'leri tarayarak tespit edildi.
const IL_IDS = Array.from({ length: 100 }, (_, i) => i + 1); // 1-100 arası tara

const API_URL = 'https://www.kulturportali.gov.tr/Moduller/GezilecekYerler.aspx/GezilecekYerleriFilitreliGetir';

const HEADERS = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Accept': '*/*',
  'Origin': 'https://www.kulturportali.gov.tr',
  'Referer': 'https://www.kulturportali.gov.tr/turkiye/genel/gezilecekyer',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  'X-Requested-With': 'XMLHttpRequest',
};

// URL slug → Türkçe şehir adı
const SLUG_TO_IL = {
  'adana': 'Adana', 'adiyaman': 'Adıyaman', 'afyonkarahisar': 'Afyonkarahisar',
  'agri': 'Ağrı', 'aksaray': 'Aksaray', 'amasya': 'Amasya', 'ankara': 'Ankara',
  'antalya': 'Antalya', 'ardahan': 'Ardahan', 'artvin': 'Artvin', 'aydin': 'Aydın',
  'balikesir': 'Balıkesir', 'bartin': 'Bartın', 'batman': 'Batman', 'bayburt': 'Bayburt',
  'bilecik': 'Bilecik', 'bingol': 'Bingöl', 'bitlis': 'Bitlis', 'bolu': 'Bolu',
  'burdur': 'Burdur', 'bursa': 'Bursa', 'canakkale': 'Çanakkale', 'cankiri': 'Çankırı',
  'corum': 'Çorum', 'denizli': 'Denizli', 'diyarbakir': 'Diyarbakır', 'duzce': 'Düzce',
  'edirne': 'Edirne', 'elazig': 'Elazığ', 'erzincan': 'Erzincan', 'erzurum': 'Erzurum',
  'eskisehir': 'Eskişehir', 'gaziantep': 'Gaziantep', 'giresun': 'Giresun',
  'gumushane': 'Gümüşhane', 'hakkari': 'Hakkari', 'hatay': 'Hatay', 'igdir': 'Iğdır',
  'isparta': 'Isparta', 'istanbul': 'İstanbul', 'izmir': 'İzmir', 'kahramanmaras': 'Kahramanmaraş',
  'karabuk': 'Karabük', 'karaman': 'Karaman', 'kars': 'Kars', 'kastamonu': 'Kastamonu',
  'kayseri': 'Kayseri', 'kilis': 'Kilis', 'kirikkale': 'Kırıkkale', 'kirklareli': 'Kırklareli',
  'kirsehir': 'Kırşehir', 'kocaeli': 'Kocaeli', 'konya': 'Konya', 'kutahya': 'Kütahya',
  'malatya': 'Malatya', 'manisa': 'Manisa', 'mardin': 'Mardin', 'mersin': 'Mersin',
  'mugla': 'Muğla', 'mus': 'Muş', 'nevsehir': 'Nevşehir', 'nigde': 'Niğde',
  'ordu': 'Ordu', 'osmaniye': 'Osmaniye', 'rize': 'Rize', 'sakarya': 'Sakarya',
  'samsun': 'Samsun', 'sanliurfa': 'Şanlıurfa', 'siirt': 'Siirt', 'sinop': 'Sinop',
  'sirnak': 'Şırnak', 'sivas': 'Sivas', 'tekirdag': 'Tekirdağ', 'tokat': 'Tokat',
  'trabzon': 'Trabzon', 'tunceli': 'Tunceli', 'usak': 'Uşak', 'van': 'Van',
  'yalova': 'Yalova', 'yozgat': 'Yozgat', 'zonguldak': 'Zonguldak',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Tek sayfa çek ─────────────────────────────────────────────────────────────
async function fetchPage(ilID, sira = '1', sayi = '100') {
  const body = JSON.stringify({
    sira,
    sayi,
    TurKod: '0',
    TurizmTurKod: '0',
    ilID: String(ilID),
    gorsel: false,
    nearest: false,
    aramaText: '',
    etiket: '',
    HariciEtiket: '',
    lat: '0',
    lang: '0',
  });

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: HEADERS,
    body,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  // API yanıtı: { d: "[{...}]" } — d alanı string olarak JSON içeriyor
  if (!json?.d) return { yerler: [], toplam: 0, slug: null };

  const parsed = typeof json.d === 'string' ? JSON.parse(json.d) : json.d;
  if (!Array.isArray(parsed) || parsed.length === 0) return { yerler: [], toplam: 0, slug: null };

  const toplam = Number(parsed[0]?.KayitSayisi ?? parsed.length);
  // URL'den şehir slug'ını çıkar: /turkiye/istanbul/gezilecekyer/...
  const slug = parsed[0]?.Url?.split('/')?.[2] ?? null;

  return { yerler: parsed, toplam, slug };
}

// ── Bir ilID için tüm sayfaları çek ──────────────────────────────────────────
async function fetchAllPages(ilID) {
  const page1 = await fetchPage(ilID, '1', '100');
  if (page1.yerler.length === 0) return page1;

  let yerler = [...page1.yerler];

  // Toplam > 100 ise kalan sayfaları da çek
  if (page1.toplam > 100) {
    const toplamSayfa = Math.ceil(page1.toplam / 100);
    for (let s = 2; s <= toplamSayfa; s++) {
      await sleep(400);
      try {
        const pageN = await fetchPage(ilID, String(s), '100');
        if (pageN.yerler.length > 0) {
          yerler = [...yerler, ...pageN.yerler];
        }
      } catch (e) {
        console.warn(`\n    ⚠️  Sayfa ${s} alınamadı: ${e.message}`);
        break;
      }
    }
  }

  return { yerler, toplam: page1.toplam, slug: page1.slug };
}

// ── Ana akış ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('🇹🇷 Kültür Portalı Scraper başlatılıyor...');
  console.log('🔍 1-100 arası ilID taranıyor, URL\'den şehir tespit ediliyor\n');

  // Şehir bazında birleştirme (aynı şehir birden fazla ilID'ye sahip olabilir)
  const sehirMap = {}; // slug → { il_adi, yerler[], toplam }
  let basarili = 0;
  let bos = 0;
  let hatali = 0;

  for (let ilID = 1; ilID <= 100; ilID++) {
    process.stdout.write(`[${String(ilID).padStart(3, '0')}/100] ilID=${ilID.toString().padEnd(3)} → `);

    try {
      const { yerler, toplam, slug } = await fetchAllPages(ilID);

      if (yerler.length === 0 || !slug) {
        console.log('⚪ Boş');
        bos++;
      } else {
        const ilAdi = SLUG_TO_IL[slug] ?? slug;

        if (!sehirMap[slug]) {
          sehirMap[slug] = { il_adi: ilAdi, slug, yerler: [], toplam: 0 };
        }

        // Duplicate kontrolü (osm_id yerine Url kullan)
        const mevcutUrls = new Set(sehirMap[slug].yerler.map(y => y.Url));
        const yeniYerler = yerler.filter(y => !mevcutUrls.has(y.Url));
        sehirMap[slug].yerler.push(...yeniYerler);
        sehirMap[slug].toplam = Math.max(sehirMap[slug].toplam, toplam);

        console.log(`✅ ${ilAdi.padEnd(20)} ${yerler.length} yer (toplam: ${toplam})`);
        basarili++;
      }
    } catch (err) {
      console.log(`❌ Hata: ${err.message}`);
      hatali++;
    }

    if (ilID < 100) await sleep(500);
  }

  // ── Çıktı formatını düzenle ──────────────────────────────────────────────────
  const sonuc = {};
  for (const [slug, data] of Object.entries(sehirMap)) {
    sonuc[data.il_adi] = {
      il_id: slug,
      yerler: data.yerler,
      toplam: data.yerler.length,
    };
  }

  // ── Kaydet ──────────────────────────────────────────────────────────────────
  const outputPath = path.join(__dirname, 'turkiye_gezilecek_yerler.json');
  await fs.writeFile(outputPath, JSON.stringify(sonuc, null, 2), 'utf-8');

  // ── Özet ────────────────────────────────────────────────────────────────────
  const toplamYer = Object.values(sonuc).reduce((s, il) => s + il.yerler.length, 0);
  const bulunanSehir = Object.keys(sonuc).length;

  console.log('\n─────────────────────────────────────────────────');
  console.log('📊 ÖZET:');
  console.log(`  ✅ Veri olan ilID: ${basarili}`);
  console.log(`  ⚪ Boş ilID:       ${bos}`);
  console.log(`  ❌ Hatalı ilID:    ${hatali}`);
  console.log(`  🏙️  Bulunan şehir: ${bulunanSehir}`);
  console.log(`  📍 Toplam yer:     ${toplamYer}`);
  console.log(`  💾 Kaydedildi:     ${outputPath}`);
  console.log('─────────────────────────────────────────────────');

  // Eksik şehirleri göster
  const tumIller = Object.values(SLUG_TO_IL);
  const bulunanlar = Object.keys(sonuc);
  const eksikler = tumIller.filter(il => !bulunanlar.includes(il));
  if (eksikler.length > 0) {
    console.log(`\n⚠️  Veri bulunamayan şehirler (${eksikler.length}):`);
    console.log('  ' + eksikler.join(', '));
  }
}

main().catch((err) => {
  console.error('❌ Beklenmeyen hata:', err);
  process.exit(1);
});
