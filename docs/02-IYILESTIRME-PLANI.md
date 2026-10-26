# 02 · İyileştirme Planı

Hedef: Ücretli API kullanmadan, mevcut mimariyi (algorithms → domain → data → screens) bozmadan planı **gerçekçi, kişisel ve "premium" hissettiren** bir ürüne dönüştürmek. Bulgu numaraları [01-PROJE-ANALIZI.md](01-PROJE-ANALIZI.md) ile eşleşir.

Durum: ✅ tamamlandı · ⏭️ sonraya bırakıldı

---

## Faz 1 — Plan motoru (çekirdek değer)

| Adım | İş | Bulgu | Durum |
|---|---|---|---|
| 1.1 | Ulaşım modu profilleri: yürüyüş / toplu taşıma / araç (hız, yol katsayısı, sabit bekleme, Google Maps modu) | P1 | ✅ |
| 1.2 | Gezi temposu: sakin / dengeli / yoğun (gün başlangıç-bitiş saati, gün başı maks. durak) | P6 | ✅ |
| 1.3 | Zaman çizelgesine öğle arası (12:30–14:00 penceresinde 60 dk) | P4 | ✅ |
| 1.4 | Kapanış saati duyarlı sıralama: TSP sırası ile "erken kapanan önce" sırası denenir, daha çok durağı sığdıran / daha kısa olan seçilir | P5 | ✅ |
| 1.5 | Sığmayan durakları boş kapasitesi olan diğer günlere taşıma; hâlâ sığmayanları `unscheduled` olarak döndürme | P2 | ✅ |
| 1.6 | Gün tarihleri (başlangıç tarihi + gün), kış aylarında açık hava kapanış saatinin öne çekilmesi | P7 | ✅ |
| 1.7 | `smartDuration`: Türkçe normalize düzeltmesi, kelime başı eşleşme, kural sırası | P8, P9 | ✅ |
| 1.8 | Süre kontrolü hatası, 2-Opt delta hesabı | P3, P10 | ✅ |
| 1.9 | Ulaşım moduna göre bütçe (yakıt / toplu taşıma bileti / yürüyüş) | P1 | ✅ |

## Faz 2 — Plan oluşturma ekranı

| Adım | İş | Bulgu | Durum |
|---|---|---|---|
| 2.1 | "Tarih" adımına ulaşım modu ve tempo seçimi | P1, P6 | ✅ |
| 2.2 | Şehir araması (Türkçe duyarlı) | C1, C5 | ✅ |
| 2.3 | Yerel tarih yardımcıları (UTC kayması), 14 gün üst sınırı | C3, C4 | ✅ |
| 2.4 | Plan oluşturmada try/catch + kullanıcıya anlamlı hata | C2 | ✅ |
| 2.5 | Özet ekranında ulaşım/tempo bilgisi | — | ✅ |

## Faz 3 — Plan detay ekranı

| Adım | İş | Bulgu | Durum |
|---|---|---|---|
| 3.1 | Gün başlığında tarih + gün adı, toplam km / saat / bitiş saati | D1 | ✅ |
| 3.2 | Her durakta varış–ayrılış saati, duraklar arasında ulaşım süresi + mod ikonu, öğle arası satırı | D1 | ✅ |
| 3.3 | Alternatif önerisi şehrin gezilecek yerlerinden; JSONB planlarda sil/alternatif plan JSON'u üzerinden | D2, D3 | ✅ |
| 3.4 | JSONB planlarda durak sayısı, uygulama haritası | D3 | ✅ |
| 3.5 | Bütçe kartı | D4 | ✅ |
| 3.6 | Gün bazlı "Rotayı Haritada Aç", seçilen ulaşım moduna göre | D5 | ✅ |
| 3.7 | Plana sığmayan yerler uyarısı | P2 | ✅ |
| 3.8 | Paylaşımda gün gün metin program | D6 | ✅ |

## Faz 4 — Altyapı

| Adım | İş | Bulgu | Durum |
|---|---|---|---|
| 4.1 | `app.config.js` eklentilerini koru, Gemini anahtarını istemciden çıkar | I1, I2 | ✅ |
| 4.2 | Plan kaydında item hatasında geri alma (rollback) | I3 | ✅ |
| 4.3 | Overpass isteklerinde eşzamanlı istek birleştirme (in-flight dedup) | I4 | ✅ |
| 4.4 | `refreshCity` cache anahtarları | I5 | ✅ |
| 4.5 | Kayıtlı planlarda JSONB durak sayısı | I6 | ✅ |
| 4.6 | Algoritma doğrulama betiği (`npm run test:planner`) | — | ✅ |

## Sonraya bırakılanlar (öneri)

| İş | Neden |
|---|---|
| ⏭️ Temanın `useTheme()` + dinamik stillerle yeniden yazılması | Tüm ekranlara dokunur; ayrı PR olmalı |
| ⏭️ Büyük ekranların bileşenlere bölünmesi | Davranış değiştirmeyen refactor, ayrı PR |
| ⏭️ Kullanılmayan dosyaların silinmesi | Önce sahibi onaylamalı |
| ⏭️ Gerçek açılış saatleri (`opening_hours` JSONB) ile çalışma | Veri setinde alan büyük ölçüde boş; içerik çalışması gerekiyor |
| ⏭️ Günlük hava durumuna göre iç/dış mekân değişimi (Open-Meteo ücretsiz) | `weatherService.js` hazır ama bağlı değil; iyi bir sonraki özellik |
| ⏭️ Jest ile birim testleri | Betik ile temel doğrulama eklendi; CI kurulduğunda Jest'e taşınabilir |
