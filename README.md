# Akıllı Gezi Rehberi

Türkiye'nin 81 ili için gezilecek yerleri, etkinlikleri ve yöresel lezzetleri gösteren; kullanıcının şehir, tarih, ulaşım şekli, tempo, konaklama ve isteğe bağlı yer seçimine göre **saat saat kişisel gezi programı** çıkaran React Native (Expo) uygulaması.

Plan motoru tamamen istemcide ve **ücretsiz** çalışır: K-Means kümeleme, TSP (Nearest Neighbor + 2-Opt), kapanış saati ve öğle arası duyarlı zaman çizelgesi. Harita ve POI verisi OpenStreetMap / Overpass, içerik Kültür Portalı ve Supabase'ten gelir.

## Hızlı başlangıç

```bash
cd mobile
npm install
cp .env.example .env   # SUPABASE_URL ve SUPABASE_ANON_KEY değerlerini girin
npm start              # Expo dev server
npm run test:planner   # plan motoru testleri
```

`.env` içeriği:

```
SUPABASE_URL=https://<proje>.supabase.co
SUPABASE_ANON_KEY=<anon key>
```

> Gizli anahtarlar (Gemini vb.) `.env`/`app.config.js` üzerinden istemciye **verilmez**; yalnızca Supabase Edge Function secret'ı olarak tanımlanır.

## Proje yapısı

```
mobile/           Expo uygulaması (src/ altında algorithms → domain → data → screens)
supabase/         Migration'lar ve Edge Function'lar
scripts/          İçerik kazıma / içe aktarma betikleri
outputs/          İçerik kataloğu (CSV/XLSX)
docs/             Teknik dokümantasyon
```

## Dokümantasyon

| Belge | İçerik |
|---|---|
| [docs/01-PROJE-ANALIZI.md](docs/01-PROJE-ANALIZI.md) | Mimari ve bulunan hatalar |
| [docs/02-IYILESTIRME-PLANI.md](docs/02-IYILESTIRME-PLANI.md) | Fazlara bölünmüş iyileştirme planı ve durumu |
| [docs/03-ROTA-MOTORU.md](docs/03-ROTA-MOTORU.md) | Plan motorunun algoritmaları, profiller, kayıt formatı |
| [docs/04-DEGISIKLIK-NOTLARI.md](docs/04-DEGISIKLIK-NOTLARI.md) | Değişiklik notları, SDK 57 yükseltmesi |
| [docs/05-TASARIM-VE-PLANLAYICI.md](docs/05-TASARIM-VE-PLANLAYICI.md) | Yeni palet, planlama sihirbazı, bölge farkındalıklı planlayıcı, güvenlik |
| [mobile/doc/prd.md](mobile/doc/prd.md) | Ürün gereksinimleri |
| [scripts/README.md](scripts/README.md) | İçerik betikleri |
