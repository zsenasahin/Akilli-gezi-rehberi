# 01 · Proje Analizi

Bu belge, Akıllı Gezi Rehberi'nin mevcut durumunu, mimarisini ve kod incelemesinde bulunan hataları/eksikleri özetler. Bir sonraki adım için bkz. [02-IYILESTIRME-PLANI.md](02-IYILESTIRME-PLANI.md).

---

## 1. Genel Bakış

| Alan | Durum |
|---|---|
| Platform | React Native 0.81 · Expo SDK 54 · New Architecture açık |
| Backend | Supabase (Postgres + RLS + Auth PKCE + Edge Functions) |
| Harita | Leaflet (WebView) + OpenStreetMap — ücretsiz |
| POI / Restoran / Otel | Overpass API (ücretsiz, 4 yedek sunucu) + opsiyonel `city-pois` Edge Function |
| Gezilecek yer verisi | Supabase `places` tablosu → yoksa Kültür Portalı JSON'ları (`src/data/*.json`) |
| Plan motoru | İstemci tarafında, tamamen ücretsiz: K-Means + TSP (NN + 2-Opt) + zaman çizelgesi |

### Klasör yapısı (mobile/src)

```
algorithms/   Saf TS algoritmaları (haversine, clustering, tsp, timeline, smartDuration)
domain/       Plan orkestrasyonu (itineraryGenerator.js)
data/         Repository katmanı + harici API istemcileri + statik JSON veri
services/     Cache, geocoding, otel, görseller, rozetler vb.
screens/      Ekranlar (auth, home, discover, itinerary, map, profile, onboarding)
components/   Ortak ve özelliğe özel bileşenler
contexts/     Auth ve Tema context'leri
navigation/   Root → Auth / Main (Tab: Ana Sayfa · Planlar · Profil)
```

### Plan oluşturma akışı (mevcut)

```
CreateItineraryScreen (Şehir → Yerler → Tarih → Konaklama → Özet)
   └─ loadCityPlaces()            (DB → statik JSON → geocoding, 1 hafta cache)
   └─ generateItinerary()         (domain/itineraryGenerator.js)
        ├─ selectRealisticTripPlaces  (yeme-içme hariç, gün başı ≤ 4 durak)
        ├─ balancePlacesIntoDays      (K-Means + süre dengeleme + durak sayısı dengesi)
        ├─ optimizeRoute              (Nearest Neighbor + 2-Opt)
        └─ generateTimeline           (09:00 başlangıç, 15 km/s, 18:30 bitiş)
   └─ createItinerary()           (itineraries + itinerary_items + plan JSONB)
ItineraryDetailScreen → plan JSONB / itinerary_items okunur
```

---

## 2. Bulunan Hatalar ve Eksikler

Önem: 🔴 kritik (yanlış sonuç / çalışmayan özellik) · 🟠 önemli (kalite / UX) · 🟡 küçük

### 2.1 Plan motoru

| # | Önem | Sorun | Yer |
|---|---|---|---|
| P1 | 🔴 | **Ulaşım bilgisi hiç alınmıyor.** `hasTransport: false` sabit yazılmış; zaman çizelgesi her durumda 15 km/s varsayıyor. Yürüyerek gezen ile arabalı kullanıcı aynı planı alıyor. | `CreateItineraryScreen.js` `handleCreatePlan`, `timeline.ts` |
| P2 | 🔴 | **Güne sığmayan yerler sessizce siliniyor.** Manuel seçilen bir yer zaman çizelgesine sığmazsa başka günde yer olsa bile plandan düşüyor ve kullanıcıya söylenmiyor. | `itineraryGenerator.js` (overflow yalnızca loglanıyor) |
| P3 | 🟠 | Toplam süre kontrolü yanlış listeyle yapılıyor (`formattedPlaces` yerine `tripPlaces` olmalı). Otomatik modda gereksiz popülerlik kırpması tetikleniyor. | `itineraryGenerator.js` |
| P4 | 🟠 | Öğle yemeği arası zaman çizelgesinde yok; 09:00–18:30 arası kesintisiz ziyaret planlanıyor. | `timeline.ts` |
| P5 | 🟠 | TSP sırası kapanış saatlerini dikkate almıyor. 17:00'de kapanan müze günün sonuna düşüp "sığmadı" sayılabiliyor. (Kümeleme sonundaki kapanış sıralaması TSP tarafından eziliyor.) | `itineraryGenerator.js`, `clustering.ts` Phase 3 |
| P6 | 🟠 | Gezi temposu (sakin/dengeli/yoğun) seçilemiyor; gün başına durak sayısı sabit 4. | `selectRealisticTripPlaces` |
| P7 | 🟠 | Mevsim farkı yok: Kasım–Şubat'ta açık hava yerleri 20:00'ye kadar açık varsayılıyor. | `smartDuration.ts` |
| P8 | 🟡 | `normalizeTR` önce `toLowerCase()` çağırdığı için `İ/I` dönüşümleri hiç çalışmıyor (`"İ".toLowerCase()` → `i̇`). | `smartDuration.ts` |
| P9 | 🟡 | Anahtar kelime eşleşmesi alt dizgi ile yapılıyor: `han` → "Cihangir", `ada` → "Adana…" gibi yanlış eşleşmeler. `saat kulesi` kuralı `kule`'den sonra geldiği için hiç tetiklenmiyor; "Sarnıcı" (ç→c) yakalanmıyor. | `smartDuration.ts` |
| P10 | 🟡 | 2-Opt her denemede tüm rotanın mesafesini baştan hesaplıyor (O(n³)/tur). Küçük n'de sorun değil ama gereksiz. | `tsp.ts` |

### 2.2 Plan detay ekranı

| # | Önem | Sorun |
|---|---|---|
| D1 | 🔴 | Motorun hesapladığı **saatler, yolculuk süreleri, gün tarihi ve gün özeti ekranda hiç gösterilmiyor.** Planın en değerli kısmı kayboluyor. |
| D2 | 🔴 | "Alternatif" önerisi `getPlacesByCity` üzerinden **restoran listesinden** seçiyor; müze yerine restoran öneriyor ve Overpass ID'sini `itinerary_items`'a yazmaya çalışınca FK hatası alıyor. |
| D3 | 🔴 | Kültür Portalı (JSONB `plan`) tabanlı planlarda: durak sayısı 0 görünüyor, uygulama içi harita butonu çıkmıyor, "Sil" ve "Alternatif" `plan-1-0` gibi sahte ID'lerle DB'ye istek atıp başarısız oluyor. |
| D4 | 🟠 | Bütçe tahmini hesaplanıyor ama ekranda gösterilmiyor (stilleri bile hazır). |
| D5 | 🟠 | Google Maps tüm geziyi tek rota olarak açıyor (8 ara nokta sınırı → çok günlük planlarda duraklar kayboluyor); ulaşım modu hep `driving`. |
| D6 | 🟡 | Paylaşım yalnızca deep link gönderiyor; uygulaması olmayan (veya RLS nedeniyle planı göremeyen) kişi hiçbir şey göremiyor. |

### 2.3 Plan oluşturma ekranı

| # | Önem | Sorun |
|---|---|---|
| C1 | 🟠 | 81 şehir arama olmadan ızgarada listeleniyor. |
| C2 | 🟠 | `handleCreatePlan` try/catch içermiyor; hata olursa yükleniyor durumu takılı kalıyor. |
| C3 | 🟠 | Tarihler `toISOString()` ile üretiliyor → UTC kayması (TR'de gece 00:00–03:00 arası "bugün" dünü gösterir). |
| C4 | 🟡 | Gün sayısına üst sınır yok (60 günlük plan seçilebiliyor). |
| C5 | 🟡 | Yer araması Türkçe büyük/küçük harf duyarlı değil (`İstanbul` ≠ `istanbul`). |

### 2.4 Altyapı / veri

| # | Önem | Sorun | Yer |
|---|---|---|---|
| I1 | 🔴 | `app.config.js` `plugins: []` ile app.json'daki eklentileri siliyor → `expo-image-picker` izin metinleri ve `expo-secure-store` yapılandırması build'e girmiyor (iOS'ta fotoğraf seçerken çökme riski). | `mobile/app.config.js` |
| I2 | 🟠 | `GEMINI_API_KEY` istemci `extra` alanına gömülüyor; APK içinden okunabilir. Anahtar yalnızca Edge Function secret'ı olmalı. | `mobile/app.config.js` |
| I3 | 🟠 | Plan kaydında item ekleme başarısız olursa yarım plan (item'sız itinerary) DB'de kalıyor. | `itineraryRepository.js` |
| I4 | 🟠 | Aynı POI isteği aynı anda birden fazla kez atılıyor (ör. her gün için yemek önerisi → N paralel aynı Overpass sorgusu). Ücretsiz sunucularda rate-limit riski. | `overpassApi.js` |
| I5 | 🟡 | `refreshCity` artık kullanılmayan cache anahtarlarını temizliyor (`kp_places_v3_…`), gerçek anahtar `published_places_v1_…`. | `placeDataManager.js` |
| I6 | 🟡 | Kayıtlı planlar listesinde JSONB tabanlı planların durak sayısı 0 görünüyor. | `SavedItinerariesScreen.js` |

### 2.5 Mimari notlar (bu turda değiştirilmeyen)

- **Tema:** `ThemeContext` global `COLORS` nesnesini mutasyona uğratıyor; `StyleSheet.create` modül yüklenirken çalıştığı için koyu tema yalnızca kısmen uygulanıyor. Kalıcı çözüm, stillerin `useTheme()` ile üretilmesi — tüm ekranlara dokunduğu için ayrı bir iş olarak bırakıldı.
- **Kullanılmayan dosyalar:** `contexts/AssistantContext.js`, `constants/categories.js`, `utils/validators.js`, `services/{apiService,weatherService,cityPhotoService,places.ts}`, `components/{itinerary/DayCard,home/CityCard,common/VisitToggle,common/Input}.js`. Yapıyı bozmamak için silinmedi; temizlik için aday.
- **Geriye dönük uyumluluk katmanları:** `logic/itineraryGenerator.js`, `services/itineraryService.js`, `services/mapService.js` yalnızca yeniden export ediyor. Zararsız.
- **Büyük ekranlar:** `CreateItineraryScreen.js` (~2100 satır) ve `CityDetailScreen.js` (~2000 satır) parçalanmaya aday.
- **Test yok:** Algoritmalar saf fonksiyon olduğu için test yazmak kolay; bu turda `mobile/scripts/test-planner.js` (`npm run test:planner`) ile hızlı bir doğrulama betiği eklendi.
