# Smart Travel Guide - Maintenance Scripts

Bu dizin, Smart Travel Guide uygulaması için bakım ve doğrulama scriptlerini içerir.

## Entry Fee Validator

Supabase `places` tablosundaki giriş ücreti verilerini Wikidata ve OpenStreetMap API'leri ile doğrular.

### Kurulum

```bash
cd scripts
npm install
```

### Kullanım

#### 1. Dry-run (Sadece Rapor Üret)

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
node validate-entry-fees.js
```

Bu komut:
- Tüm yerleri Wikidata ve OSM ile kontrol eder
- `entry-fee-report.json` dosyasına rapor yazar
- Veritabanında hiçbir değişiklik yapmaz

#### 2. Apply Mode (Değişiklikleri Uygula)

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
node validate-entry-fees.js --apply
```

Bu komut:
- Rapor üretir
- `suggestion: 'update'` olan kayıtları Supabase'e yazar
- Her güncellemeyi konsola loglar

### Rapor Formatı

`entry-fee-report.json` dosyası şu formatta kayıtlar içerir:

```json
{
  "placeId": "uuid",
  "placeName": "Topkapı Sarayı",
  "currentFee": 100,
  "wikidataFee": 150,
  "osmFee": null,
  "suggestion": "update",
  "source": "wikidata",
  "confidence": "high"
}
```

**Suggestion değerleri:**
- `update`: Güncelleme önerilir (fark var)
- `no_change`: Değişiklik gerekmez (aynı değer)
- `not_found`: API'lerde veri bulunamadı

**Source değerleri:**
- `wikidata`: Wikidata'dan alındı (yüksek güvenilirlik)
- `osm`: OpenStreetMap'ten alındı (düşük güvenilirlik)
- `null`: Hiçbir kaynakta bulunamadı

### Özellikler

- ✅ Wikidata SPARQL sorguları (öncelikli kaynak)
- ✅ OpenStreetMap Overpass API (fallback)
- ✅ 30 saniye timeout (her API çağrısı için)
- ✅ TL olmayan değerleri reddetme
- ✅ Güvenli `--apply` modu (sadece doğrulanan kayıtlar)
- ✅ Detaylı hata loglama

### Notlar

- Script, Wikidata'yı öncelikli kaynak olarak kullanır
- Wikidata'da bulunamazsa OSM'e fallback yapar
- Timeout veya hata durumunda sonraki kayda geçer
- `--apply` olmadan hiçbir yazma işlemi yapılmaz
