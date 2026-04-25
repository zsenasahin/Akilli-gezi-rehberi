#!/usr/bin/env node
/**
 * Entry Fee Validator — Giriş Ücretleri Doğrulama Scripti
 *
 * Supabase places tablosundaki entry_fee verilerini Wikidata ve OSM ile doğrular.
 *
 * Kullanım:
 *   node scripts/validate-entry-fees.js              # Dry-run, rapor üretir
 *   node scripts/validate-entry-fees.js --apply      # Doğrulanan değerleri yazar
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs/promises';

// ── Supabase Config ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_')) {
    console.error('❌ SUPABASE_URL ve SUPABASE_ANON_KEY environment variable\'ları gerekli.');
    console.error('   Örnek: SUPABASE_URL=https://xxx.supabase.co SUPABASE_ANON_KEY=xxx node scripts/validate-entry-fees.js');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Flags ────────────────────────────────────────────────────────────────────
const APPLY_CHANGES = process.argv.includes('--apply');
const TIMEOUT_MS = 30000;

// ── Wikidata SPARQL Query ────────────────────────────────────────────────────
async function queryWikidata(placeName) {
    const query = `
        SELECT ?item ?fee WHERE {
            ?item rdfs:label "${placeName}"@tr .
            OPTIONAL { ?item wdt:P2555 ?fee . }
        }
        LIMIT 1
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch('https://query.wikidata.org/sparql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `query=${encodeURIComponent(query)}`,
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) return null;
        const data = await response.json();
        if (!data.results?.bindings?.length) return null;

        const feeValue = data.results.bindings[0]?.fee?.value;
        if (!feeValue) return null;

        // TL kontrolü (basit: sayısal değer varsayıyoruz)
        const numericFee = parseFloat(feeValue);
        return isNaN(numericFee) ? null : numericFee;
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            console.warn(`⏱️ Wikidata timeout: ${placeName}`);
        } else {
            console.warn(`⚠️ Wikidata error for ${placeName}:`, error.message);
        }
        return null;
    }
}

// ── OSM Overpass Query ───────────────────────────────────────────────────────
async function queryOSM(placeName) {
    const query = `
        [out:json][timeout:30];
        node["name"="${placeName}"]["fee"];
        out body;
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query,
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) return null;
        const data = await response.json();
        if (!data.elements?.length) return null;

        const feeTag = data.elements[0]?.tags?.fee;
        if (!feeTag) return null;

        // "yes" / "no" gibi değerler varsa null döndür
        if (feeTag === 'yes' || feeTag === 'no') return null;

        const numericFee = parseFloat(feeTag);
        return isNaN(numericFee) ? null : numericFee;
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            console.warn(`⏱️ OSM timeout: ${placeName}`);
        } else {
            console.warn(`⚠️ OSM error for ${placeName}:`, error.message);
        }
        return null;
    }
}

// ── Validate Place ───────────────────────────────────────────────────────────
async function validatePlace(place) {
    const { id, name, entry_fee } = place;
    console.log(`🔍 Doğrulanıyor: ${name}`);

    let wikidataFee = await queryWikidata(name);
    let osmFee = null;
    let source = null;
    let confidence = null;

    if (wikidataFee !== null) {
        source = 'wikidata';
        confidence = 'high';
    } else {
        osmFee = await queryOSM(name);
        if (osmFee !== null) {
            source = 'osm';
            confidence = 'low';
        }
    }

    const foundFee = wikidataFee ?? osmFee;
    let suggestion = 'not_found';

    if (foundFee !== null) {
        if (entry_fee === null || Math.abs(entry_fee - foundFee) > 1) {
            suggestion = 'update';
        } else {
            suggestion = 'no_change';
        }
    }

    return {
        placeId: id,
        placeName: name,
        currentFee: entry_fee,
        wikidataFee,
        osmFee,
        suggestion,
        source,
        confidence,
    };
}

// ── Generate Report ──────────────────────────────────────────────────────────
async function generateReport(places) {
    const report = [];
    for (const place of places) {
        const result = await validatePlace(place);
        report.push(result);
    }
    return report;
}

// ── Apply Updates ────────────────────────────────────────────────────────────
async function applyUpdates(report) {
    const toUpdate = report.filter(r => r.suggestion === 'update');
    console.log(`\n📝 ${toUpdate.length} kayıt güncellenecek...`);

    for (const entry of toUpdate) {
        const newFee = entry.wikidataFee ?? entry.osmFee;
        const { error } = await supabase
            .from('places')
            .update({ entry_fee: newFee })
            .eq('id', entry.placeId);

        if (error) {
            console.error(`❌ Güncelleme hatası (${entry.placeName}):`, error.message);
        } else {
            console.log(`✅ Güncellendi: ${entry.placeName} → ₺${newFee}`);
        }
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('🚀 Entry Fee Validator başlatılıyor...\n');

    // Tüm places'i çek
    const { data: places, error } = await supabase.from('places').select('id, name, entry_fee');
    if (error) {
        console.error('❌ Supabase hatası:', error.message);
        process.exit(1);
    }

    console.log(`📊 ${places.length} yer bulundu.\n`);

    // Rapor üret
    const report = await generateReport(places);

    // Raporu kaydet
    await fs.writeFile('entry-fee-report.json', JSON.stringify(report, null, 2));
    console.log('\n✅ Rapor kaydedildi: entry-fee-report.json');

    // Özet
    const updateCount = report.filter(r => r.suggestion === 'update').length;
    const noChangeCount = report.filter(r => r.suggestion === 'no_change').length;
    const notFoundCount = report.filter(r => r.suggestion === 'not_found').length;

    console.log(`\n📈 Özet:`);
    console.log(`   Güncelleme önerisi: ${updateCount}`);
    console.log(`   Değişiklik yok: ${noChangeCount}`);
    console.log(`   Bulunamadı: ${notFoundCount}`);

    // --apply flag'i varsa güncelle
    if (APPLY_CHANGES) {
        console.log('\n🔧 --apply flagi aktif, değişiklikler uygulanıyor...');
        await applyUpdates(report);
        console.log('\n✅ Tamamlandı!');
    } else {
        console.log('\n💡 Değişiklikleri uygulamak için: node scripts/validate-entry-fees.js --apply');
    }
}

main().catch(console.error);
