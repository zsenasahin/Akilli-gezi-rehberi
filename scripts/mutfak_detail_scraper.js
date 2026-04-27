#!/usr/bin/env node
/**
 * mutfak_detail_scraper.js
 * turkiye_mutfak.json'daki her yemek için detay sayfasından
 * açıklama + büyük fotoğraf çeker.
 *
 * Kullanım:
 *   node scripts/mutfak_detail_scraper.js
 *   node scripts/mutfak_detail_scraper.js --il=Konya
 *   node scripts/mutfak_detail_scraper.js --resume
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT  = path.join(__dirname, 'turkiye_mutfak.json');
const OUTPUT = path.join(__dirname, 'turkiye_mutfak_detay.json');
const BASE   = 'https://www.kulturportali.gov.tr';
const DELAY  = 500;
const sleep  = ms => new Promise(r => setTimeout(r, ms));

function decodeHtml(str) {
    return str
        .replace(/&uuml;/g,'ü').replace(/&Uuml;/g,'Ü').replace(/&ouml;/g,'ö').replace(/&Ouml;/g,'Ö')
        .replace(/&ccedil;/g,'ç').replace(/&Ccedil;/g,'Ç').replace(/&scedil;/g,'ş').replace(/&Scedil;/g,'Ş')
        .replace(/&iuml;/g,'ı').replace(/&gbreve;/g,'ğ').replace(/&Gbreve;/g,'Ğ')
        .replace(/&rsquo;/g,"'").replace(/&amp;/g,'&').replace(/&nbsp;/g,' ')
        .replace(/&#39;/g,"'").replace(/&#\d+;/g,'')
        .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}

async function fetchDetail(relUrl) {
    const url = `${BASE}${relUrl}`;
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15', 'Accept': 'text/html' },
            signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) return null;
        const html = await res.text();

        // Açıklama
        const descMatch = html.match(/class="[^"]*aciklama[^"]*"[^>]*>([\s\S]{10,5000}?)<\/div>/i);
        const description = descMatch ? decodeHtml(descMatch[1]).slice(0, 1500) : '';

        // Ana fotoğraf (og:image → large)
        const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/i)
                     || html.match(/content="([^"]+)"\s+property="og:image"/i);
        const mainImage = ogMatch ? ogMatch[1].trim() : null;

        // Galeri (small → large)
        const seen = new Set();
        const gallery = [];
        for (const m of html.matchAll(/repoKulturPortali\/small\/([^"'\s?]+\.(jpg|jpeg|png|JPG|PNG))/gi)) {
            if (seen.has(m[1])) continue;
            seen.add(m[1]);
            gallery.push(`${BASE}/repoKulturPortali/large/${m[1]}?format=jpg&quality=85`);
            if (gallery.length >= 4) break;
        }

        const allImages = mainImage
            ? [mainImage, ...gallery.filter(g => g !== mainImage)]
            : gallery;

        return { description, ana_fotograf: allImages[0] || null, fotograflar: allImages.slice(0, 4) };
    } catch { return null; }
}

async function main() {
    const args = process.argv.slice(2);
    const targetIl = args.find(a => a.startsWith('--il='))?.split('=')[1] || null;
    const resume   = args.includes('--resume');

    console.log('🍽️  Mutfak Detay Scraper başlatılıyor...');
    if (targetIl) console.log(`🎯 Sadece: ${targetIl}`);
    if (resume)   console.log('⏩ Resume modu aktif');

    const kaynak = JSON.parse(await fs.readFile(INPUT, 'utf-8'));
    let sonuc = {};
    if (resume) {
        try { sonuc = JSON.parse(await fs.readFile(OUTPUT, 'utf-8')); } catch {}
        console.log(`📂 Mevcut: ${Object.keys(sonuc).length} il\n`);
    }

    const iller = targetIl ? { [targetIl]: kaynak[targetIl] } : kaynak;
    let basarili = 0, hatali = 0, toplam = 0;

    for (const [ilAdi, ilData] of Object.entries(iller)) {
        if (!ilData?.yemekler?.length) continue;
        console.log(`\n🏙️  ${ilAdi} (${ilData.yemekler.length} yemek)`);

        if (!sonuc[ilAdi]) sonuc[ilAdi] = { il_id: ilData.il_id, yemekler: [], toplam: 0 };
        const mevcutUrls = new Set(sonuc[ilAdi].yemekler.map(y => y.Url));

        for (let i = 0; i < ilData.yemekler.length; i++) {
            const yemek = ilData.yemekler[i];
            toplam++;

            if (resume && mevcutUrls.has(yemek.Url)) { process.stdout.write('·'); basarili++; continue; }

            process.stdout.write(`\n  [${i+1}/${ilData.yemekler.length}] ${(yemek.Baslik||'').slice(0,35).padEnd(35)} → `);

            const detail = await fetchDetail(yemek.Url);
            if (detail) {
                sonuc[ilAdi].yemekler.push({ ...yemek, ...detail });
                const hasDesc = detail.description?.length > 20;
                console.log(`${hasDesc ? '📝' : '  '} 🖼️ ${detail.fotograflar?.length || 0}`);
                basarili++;
            } else {
                sonuc[ilAdi].yemekler.push({ ...yemek, description: '', ana_fotograf: yemek.Resim ? `${BASE}${yemek.Resim}` : null, fotograflar: [] });
                console.log('❌');
                hatali++;
            }

            sonuc[ilAdi].toplam = sonuc[ilAdi].yemekler.length;

            if (toplam % 10 === 0) await fs.writeFile(OUTPUT, JSON.stringify(sonuc, null, 2), 'utf-8');
            await sleep(DELAY);
        }
    }

    await fs.writeFile(OUTPUT, JSON.stringify(sonuc, null, 2), 'utf-8');
    const toplamYemek = Object.values(sonuc).reduce((s, il) => s + il.yemekler.length, 0);

    console.log('\n\n─────────────────────────────────────────');
    console.log(`✅ Başarılı: ${basarili}  ❌ Hatalı: ${hatali}`);
    console.log(`📍 Toplam: ${toplamYemek} yemek`);
    console.log(`💾 ${OUTPUT}`);
    console.log('─────────────────────────────────────────');
}

main().catch(e => { console.error(e); process.exit(1); });
