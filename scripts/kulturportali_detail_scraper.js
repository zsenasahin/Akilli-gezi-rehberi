#!/usr/bin/env node
/**
 * kulturportali_detail_scraper.js
 *
 * turkiye_gezilecek_yerler.json'daki her yer için Kültür Portalı detay
 * sayfasından açıklama + fotoğraf galerisini çeker ve
 * turkiye_gezilecek_yerler_detay.json olarak kaydeder.
 *
 * Kullanım:
 *   node scripts/kulturportali_detail_scraper.js
 *   node scripts/kulturportali_detail_scraper.js --il=İstanbul   (tek il)
 *   node scripts/kulturportali_detail_scraper.js --resume        (kaldığı yerden devam)
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FILE  = path.join(__dirname, 'turkiye_gezilecek_yerler.json');
const OUTPUT_FILE = path.join(__dirname, 'turkiye_gezilecek_yerler_detay.json');
const BASE_URL    = 'https://www.kulturportali.gov.tr';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'tr-TR,tr;q=0.9',
};

const DELAY_MS   = 600;   // istekler arası bekleme
const TIMEOUT_MS = 12000;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── HTML yardımcıları ─────────────────────────────────────────────────────────

function decodeHtmlEntities(str) {
  return str
    .replace(/&uuml;/g, 'ü').replace(/&Uuml;/g, 'Ü')
    .replace(/&ouml;/g, 'ö').replace(/&Ouml;/g, 'Ö')
    .replace(/&ccedil;/g, 'ç').replace(/&Ccedil;/g, 'Ç')
    .replace(/&scedil;/g, 'ş').replace(/&Scedil;/g, 'Ş')
    .replace(/&iuml;/g, 'ı').replace(/&Iuml;/g, 'İ')
    .replace(/&gbreve;/g, 'ğ').replace(/&Gbreve;/g, 'Ğ')
    .replace(/&acirc;/g, 'â').replace(/&icirc;/g, 'î').replace(/&ucirc;/g, 'û')
    .replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&#\d+;/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDescription(html) {
  // class="aciklama" div'inden açıklamayı çek
  const m = html.match(/class="[^"]*aciklama[^"]*"[^>]*>([\s\S]{10,5000}?)<\/div>/i);
  if (!m) return '';
  return decodeHtmlEntities(m[1]).slice(0, 1500);
}

function extractOgImage(html) {
  // og:image meta tag'inden ana fotoğrafı çek (large kalite)
  const m = html.match(/property="og:image"\s+content="([^"]+)"/i)
           || html.match(/content="([^"]+)"\s+property="og:image"/i);
  if (!m) return null;
  const url = m[1].trim();
  return url.startsWith('http') ? url : `${BASE_URL}${url}`;
}

function extractGalleryImages(html) {
  // small/ prefix'li tüm resimleri bul, large/ versiyonuna çevir
  const seen = new Set();
  const imgs = [];

  const matches = [...html.matchAll(/repoKulturPortali\/small\/([^"'\s?]+\.(jpg|jpeg|png|JPG|PNG|webp))/gi)];
  for (const m of matches) {
    const smallPath = m[1];
    if (seen.has(smallPath)) continue;
    seen.add(smallPath);
    // large versiyonu oluştur
    const largeUrl = `${BASE_URL}/repoKulturPortali/large/${smallPath}?format=jpg&quality=85`;
    imgs.push(largeUrl);
    if (imgs.length >= 6) break;
  }
  return imgs;
}

// ── Detay çek ────────────────────────────────────────────────────────────────

async function fetchDetail(relativeUrl) {
  const url = `${BASE_URL}${relativeUrl}`;
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const description = extractDescription(html);
  const mainImage   = extractOgImage(html);
  const gallery     = extractGalleryImages(html);

  // Ana fotoğrafı galeriye ekle (duplicate değilse)
  const allImages = mainImage
    ? [mainImage, ...gallery.filter(g => g !== mainImage)]
    : gallery;

  return {
    description,
    images: allImages.slice(0, 6),
    main_image: allImages[0] || null,
  };
}

// ── Ana akış ─────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const targetIl = args.find(a => a.startsWith('--il='))?.split('=')[1] || null;
  const resume   = args.includes('--resume');

  console.log('🇹🇷 Kültür Portalı Detay Scraper başlatılıyor...');
  if (targetIl) console.log(`🎯 Sadece: ${targetIl}`);
  if (resume)   console.log('⏩ Resume modu: mevcut detaylar korunacak');

  // Kaynak veriyi oku
  const kaynak = JSON.parse(await fs.readFile(INPUT_FILE, 'utf-8'));

  // Mevcut çıktıyı oku (resume modu)
  let sonuc = {};
  if (resume) {
    try {
      sonuc = JSON.parse(await fs.readFile(OUTPUT_FILE, 'utf-8'));
      console.log(`📂 Mevcut dosyadan ${Object.keys(sonuc).length} il yüklendi\n`);
    } catch { /* dosya yoksa sıfırdan başla */ }
  }

  const iller = targetIl
    ? { [targetIl]: kaynak[targetIl] }
    : kaynak;

  let toplamYer = 0;
  let basarili  = 0;
  let hatali    = 0;

  for (const [ilAdi, ilData] of Object.entries(iller)) {
    if (!ilData?.yerler?.length) continue;

    console.log(`\n🏙️  ${ilAdi} (${ilData.yerler.length} yer)`);

    if (!sonuc[ilAdi]) {
      sonuc[ilAdi] = { il_id: ilData.il_id, yerler: [], toplam: ilData.toplam };
    }

    // Resume: zaten işlenmiş yerleri atla
    const mevcutUrls = new Set(sonuc[ilAdi].yerler.map(y => y.Url));

    for (let i = 0; i < ilData.yerler.length; i++) {
      const yer = ilData.yerler[i];
      toplamYer++;

      if (resume && mevcutUrls.has(yer.Url)) {
        process.stdout.write('·');
        basarili++;
        continue;
      }

      process.stdout.write(`\n  [${i + 1}/${ilData.yerler.length}] ${yer.Baslik?.slice(0, 40).padEnd(40)} → `);

      try {
        const detail = await fetchDetail(yer.Url);

        sonuc[ilAdi].yerler.push({
          ...yer,
          aciklama: detail.description || '',
          ana_fotograf: detail.main_image || `${BASE_URL}${yer.Resim}`,
          fotograflar: detail.images,
        });

        const hasDesc = detail.description.length > 20;
        const hasImg  = detail.images.length > 0;
        console.log(`${hasDesc ? '📝' : '  '} ${hasImg ? `🖼️ ${detail.images.length}` : '  '} ${detail.description.slice(0, 60)}...`);
        basarili++;
      } catch (err) {
        // Hata durumunda orijinal veriyi koru, detay boş bırak
        sonuc[ilAdi].yerler.push({
          ...yer,
          aciklama: '',
          ana_fotograf: `${BASE_URL}${yer.Resim}`,
          fotograflar: [`${BASE_URL}${yer.Resim}`],
        });
        console.log(`❌ ${err.message}`);
        hatali++;
      }

      // Her 10 yerde bir ara kaydet
      if (toplamYer % 10 === 0) {
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(sonuc, null, 2), 'utf-8');
      }

      await sleep(DELAY_MS);
    }
  }

  // Son kayıt
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(sonuc, null, 2), 'utf-8');

  const toplamDetayli = Object.values(sonuc).reduce((s, il) => s + il.yerler.length, 0);

  console.log('\n\n─────────────────────────────────────────────────');
  console.log('📊 ÖZET:');
  console.log(`  ✅ Başarılı: ${basarili}`);
  console.log(`  ❌ Hatalı:   ${hatali}`);
  console.log(`  📍 Toplam:   ${toplamDetayli} yer`);
  console.log(`  💾 Kaydedildi: ${OUTPUT_FILE}`);
  console.log('─────────────────────────────────────────────────');
}

main().catch(err => {
  console.error('❌ Beklenmeyen hata:', err);
  process.exit(1);
});
