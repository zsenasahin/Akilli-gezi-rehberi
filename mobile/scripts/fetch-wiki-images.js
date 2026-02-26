/**
 * Bu script'i bilgisayarda çalıştırarak Wikipedia'dan resim URL'lerini çeker
 * ve Supabase'i güncellemek için SQL üretir.
 * 
 * Kullanım:
 *   node scripts/fetch-wiki-images.js
 * 
 * Çıktıyı kopyalayıp Supabase SQL Editor'da çalıştırın.
 */

const PLACES = [
    'Ayasofya',
    'Topkapı Sarayı',
    'Sultanahmet Camii',
    'Kapalıçarşı',
    'Galata Kulesi',
    'Dolmabahçe Sarayı',
    'Basilika Sarnıcı',
    'İstanbul Arkeoloji Müzesi',
    'Miniatürk',
    'Emirgan Korusu',
    'Mevlana Müzesi',
    'Alaeddin Tepesi',
    'Karatay Medresesi',
    'İnce Minareli Medrese',
    'Sille Köyü',
    'Kelebek Bahçesi',
    'Kaleiçi',
    'Düden Şelalesi',
    'Antalya Müzesi',
    'Konyaaltı Plajı',
    'Aspendos Antik Tiyatrosu',
    'Perge Antik Kenti',
    'Manavgat Şelalesi',
    'Olimpos',
];

// Wikipedia alternatifleri — bazı yer adları Wikipedia'da farklı başlıkla olabilir
const WIKI_TITLE_MAP = {
    'Sultanahmet Camii': 'Sultan Ahmed Camii',
    'Basilika Sarnıcı': 'Yerebatan Sarnıcı',
    'İstanbul Arkeoloji Müzesi': 'İstanbul Arkeoloji Müzeleri',
    'Kelebek Bahçesi': 'Konya Tropikal Kelebek Bahçesi',
    'Kaleiçi': 'Kaleiçi (Antalya)',
    'Düden Şelalesi': 'Düden Şelaleleri',
    'Konyaaltı Plajı': 'Konyaaltı',
    'Aspendos Antik Tiyatrosu': 'Aspendos',
    'Perge Antik Kenti': 'Perge',
    'Olimpos': 'Olympos (antik kent)',
    'Sille Köyü': 'Sille',
    'Alaeddin Tepesi': 'Alâeddin Camii (Konya)',
};

async function fetchWikiSummary(title) {
    const encoded = encodeURIComponent(title);

    // Türkçe dene
    try {
        const res = await fetch(`https://tr.wikipedia.org/api/rest_v1/page/summary/${encoded}`);
        if (res.ok) {
            const data = await res.json();
            if (data.type !== 'disambiguation' && data.thumbnail?.source) {
                // Thumbnail URL'ini daha büyük yap (330px → 500px)
                const biggerUrl = data.thumbnail.source.replace(/\/\d+px-/, '/500px-');
                return {
                    imageUrl: biggerUrl,
                    description: data.extract || '',
                };
            }
        }
    } catch (e) { }

    // İngilizce dene
    try {
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`);
        if (res.ok) {
            const data = await res.json();
            if (data.type !== 'disambiguation' && data.thumbnail?.source) {
                const biggerUrl = data.thumbnail.source.replace(/\/\d+px-/, '/500px-');
                return {
                    imageUrl: biggerUrl,
                    description: data.extract || '',
                };
            }
        }
    } catch (e) { }

    return null;
}

async function main() {
    console.log('-- Wikipedia resim URL\'lerini çekiyor...\n');
    console.log('-- Bu SQL\'i Supabase Dashboard → SQL Editor\'da çalıştırın\n');

    for (const place of PLACES) {
        const wikiTitle = WIKI_TITLE_MAP[place] || place;
        const result = await fetchWikiSummary(wikiTitle);

        if (result) {
            const escapedUrl = result.imageUrl.replace(/'/g, "''");
            const escapedDesc = result.description.replace(/'/g, "''").substring(0, 1000);
            console.log(`UPDATE places SET image_url = '${escapedUrl}' WHERE name = '${place.replace(/'/g, "''")}';`);
        } else {
            console.log(`-- ⚠️ Wikipedia'da bulunamadı: ${place} (wikiTitle: ${wikiTitle})`);
        }
    }

    console.log('\n-- Tamamlandı!');
}

main();
