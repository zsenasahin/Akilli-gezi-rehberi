# Akıllı Gezi Rehberi (SmartTravelGuide) — Teknik Mülakat & Kod İnceleme Rehberi

Bu belge, **Akıllı Gezi Rehberi** projesini teknik mülakatlarda, kod incelemelerinde (live code review) ve sistem tasarımı seanslarında profesyonelce, kendinden emin ve derinlemesine anlatabilmen için hazırlanmış eksiksiz bir rehberdir.

---

## 📑 İÇİNDEKİLER

1. [Proje Özeti & 30 Saniyelik Asansör Konuşması (Elevator Pitch)](#1-proje-özeti--30-saniyelik-asansör-konuşması)
2. [Sistem Mimarisi ve Teknoloji Tercihleri (Tech Stack & Architecture)](#2-sistem-mimarisi-ve-teknoloji-tercihleri)
3. [Algoritmalar ve Matematiksel Modelleme (Mülakatın Yıldızı)](#3-algoritmalar-ve-matematiksel-modelleme)
   - 3.1 Haversine Formülü & Jeodezik Mesafe
   - 3.2 Duration-Aware K-Means Kümeleme (Clustering) & Furthest-First
   - 3.3 Gün Dengeleme (Rebalancing) & Geo-Slack Güvenliği
   - 3.4 Gezgin Satıcı Problemi (TSP): Nearest Neighbor + 2-Opt Heuristic
   - 3.5 Gerçekçi Zaman Çizelgesi (Timeline Engine & 1.4x Yol Katsayısı)
   - 3.6 Doğal Dil / Anahtar Kelime Bazlı Akıllı Süre Tahmini (smartDuration)
4. [Veri Mimarisi, İki Kademeli Cache (L1/L2) & Hata Dayanıklılığı](#4-veri-mimarisi-iki-kademeli-cache-l1l2--hata-dayanıklılığı)
5. [Kod Yürüyüşü (Live Code Review Senaryoları)](#5-kod-yürüyüşü-live-code-review-senaryoları)
   - Senaryo A: Gezi Planı Oluşturma Motoru (`itineraryGenerator.js`)
   - Senaryo B: Kimlik Doğrulama & Güvenlik (`AuthContext.js` & PKCE / SecureStore)
   - Senaryo C: Harita & WebView Köprüsü (`MapScreen.js` & Leaflet HTML)
   - Senaryo D: AI Gezi Asistanı (Supabase Edge Function & Gemini 2.0 Flash)
6. [Mülakatta Gelebilecek Zor Teknik Sorular ve Cevapları (Q&A)](#6-mülakatta-gelebilecek-zor-teknik-sorular-ve-cevapları)
7. [Performans Optimizasyonları & Best Practice'ler](#7-performans-optimizasyonları--best-practiceler)
8. [Mülakat Günü İçin Altın İpuçları (Cheat Sheet)](#8-mülakat-günü-için-altın-ipuçları)

---

## 1. PROJE ÖZETİ & 30 SANİYELİK ASANSÖR KONUŞMASI

### 🎙️ Asansör Konuşması (Mülakatta ilk soru: "Bize projenden bahseder misin?")
> *"Akıllı Gezi Rehberi, kullanıcıların Türkiye'nin 81 ilinde kişiselleştirilmiş, zamansal ve coğrafi açıdan optimize edilmiş seyahat rotaları oluşturmasını sağlayan yapay zeka destekli bir mobil seyahat platformudur.*
>
> *Bu projedeki temel motivasyonum, geleneksel gezi uygulamalarının sadece liste sunması veya harita üzerinde birbirine uzak noktaları aynı güne rastgele dağıtması sorununu çözmekti. Ben bu projede **K-Means kümeleme**, **Gezgin Satıcı Problemi (TSP 2-Opt optimizasyonu)** ve **müze kapanış saatlerine duyarlı zaman çizelgesi algoritmalarını** sıfırdan implemente ettim.*
>
> *Frontend'de **React Native (Expo)**, backend tarafında **Supabase (PostgreSQL, Edge Functions, RLS)**, harita katmanında **OpenStreetMap/Leaflet** ve AI katmanında **Gemini 2.0 Flash** kullandım. Ayrıca ağ kesintilerine karşı iki kademeli (L1 In-Memory + L2 AsyncStorage) önbellekleme mimarisi kurdum."*

---

## 2. SİSTEM MİMARİSİ VE TEKNOLOJİ TERCİHLERİ

Proje, **Clean Architecture (Temiz Mimari)** ve **Separation of Concerns (İlgi Alanlarının Ayrımı)** prensiplerine sadık kalarak 5 temel katmana ayrılmıştır:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Presentation Layer (Screens, Components, Hooks)          │
│    - HomeScreen, CityDetailScreen, CreateItineraryScreen   │
│    - Animated TabBar, SkeletonLoader, Parallax Hero         │
├─────────────────────────────────────────────────────────────┤
│ 2. Domain / Business Logic Layer                            │
│    - itineraryGenerator (Plan orkestrasyonu, bütçe hesabı) │
│    - Achievement / Gamification logic                       │
├─────────────────────────────────────────────────────────────┤
│ 3. Core Algorithms Layer (Pure TypeScript / Zero React Dep) │
│    - clustering.ts (K-Means, Furthest-First, Rebalancing)   │
│    - tsp.ts (Nearest Neighbor + 2-Opt Swap)                 │
│    - timeline.ts (Time budget, 1.4x detour, closing hours)  │
│    - haversine.ts (Geodesic distance calculation)           │
│    - smartDuration.ts (Turkish NLP duration estimation)     │
├─────────────────────────────────────────────────────────────┤
│ 4. Data / Repository Layer (Abstractions)                   │
│    - itineraryRepository, placeRepository, authRepository   │
│    - favoriteRepository, cityRepository                     │
├─────────────────────────────────────────────────────────────┤
│ 5. Infrastructure & Services (External World)               │
│    - cacheService (L1 Memory + L2 Disk with TTL)            │
│    - Supabase (Postgres, Auth PKCE, Edge Functions)         │
│    - Overpass API, Nominatim Geocoding, Open-Meteo Weather  │
└─────────────────────────────────────────────────────────────┘
```

### Neden Bu Teknolojileri Seçtin? (Architectural Decisions)

| Teknoloji | Neden Seçildi? | Alternatife Göre Avantajı |
|---|---|---|
| **React Native (Expo SDK 54)** | Tek kod tabanı ile iOS ve Android desteği, hızlı prototipleme ve modern JS/TS ekosistemi. | Saf yerel kodlamaya (Swift/Kotlin) göre 2 kat geliştirme hızı; Flutter'a göre React ekosistemi ve JS kütüphane zenginliği. |
| **Pure TypeScript Algoritmalar** | Matematik ve optimizasyon algoritmaları React context'inden bağımsız, saf fonksiyon (pure function) olarak yazıldı. | Kolay test edilebilirlik, sıfır yan etki (side-effect), mobil platformdan bağımsız çalışabilme. |
| **Supabase (BaaS / PostgreSQL)** | Güçlü ilişkisel veri modeli (Foreign Key, Cascade), Row Level Security (RLS) ve Deno tabanlı Edge Functions. | Firebase Firestore noSQL'dir; ilişkisel coğrafi sorgular ve kullanıcı plan-öğe ilişkisi SQL'de çok daha tutarlı ve güvenlidir. |
| **Expo SecureStore + PKCE Auth** | Mobil güvenlik standartlarına tam uyum. Token'lar düz AsyncStorage yerine iOS Keychain / Android Keystore'da saklanır. | XSS ve tersine mühendislik ile token çalınma riskini sıfıra indirir. |
| **OpenStreetMap & Leaflet (WebView)** | Lisans ücreti gerektirmeyen, sınırsız sorgulanabilir, tam özelleştirilebilir harita arayüzü. | Google Maps SDK yüksek maliyetlidir ve marker/polyline özelleştirmeleri sınırlıdır. |
| **Gemini 2.0 Flash Lite (Edge Function)** | Düşük gecikme süresi (low latency), yüksek bağlam penceresi ve ekonomik token maliyeti. | Şehir, gün, tamamlanan mekanlar ve kalan süre gibi zengin dinamik prompt context'ini anlık yorumlar. |

---

## 3. ALGORİTMALAR VE MATEMATİKSEL MODELLEME (MÜLAKATIN YILDIZI)

> 💡 **Mülakat Tüyosu:** Mülakatçı koduna baktığında ilk açacağın yer `mobile/src/algorithms/` klasörü olmalıdır. Burası bir junior/mid geliştiriciyi kıdemli bir mühendisten ayıran kısımdır.

### 3.1 Haversine Formülü (`haversine.ts`)
Dünya bir küre (geoid) olduğu için düzlem geometri (Öklid mesafesi) koordinatlarda büyük sapmalara yol açar. İki enlem-boylam noktası arasındaki küresel mesafeyi hesaplamak için Haversine formülü kullanılır:

$$\Delta\sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$
$$d = R \cdot \Delta\sigma \quad (R = 6371 \text{ km})$$

*Koddaki Yeri:* `mobile/src/algorithms/haversine.ts`

---

### 3.2 Duration-Aware K-Means Kümeleme (`clustering.ts`)
Kullanıcı örneğin 3 günlük bir gezi istediğinde, gezilecek yerleri günlere nasıl ayırıyoruz?

#### 1. Aşama: Furthest-First Traversal ile Merkez Belirleme (K-Means++ Mantığı)
- Rastgele merkez seçmek K-Means algoritmasında "local optima" tuzağına düşürebilir ve birbirine yakın iki gün kümesi üretebilir.
- **Çözüm:** İlk merkez ilk nokta seçilir. Sonraki her $k$. merkez, mevcut tüm merkezlere olan minimum mesafesi en büyük olan noktadan seçilir (Max-Min Greedy Heuristic).

#### 2. Aşama: K-Means İterasyonu
- Her nokta en yakın gün merkezine atanır.
- Gün merkezleri, içindeki noktaların ağırlık merkezine (ortalama enlem-boylam) ötelenir.
- Değişim durana kadar veya maksimum 20 iterasyonda yakınsar.

---

### 3.3 Gün Dengeleme (Duration Rebalancing) & Geo-Slack Güvenliği

Klasik K-Means sadece **mesafeye** bakar; **süreye** bakmaz. Bir güne 10 saatlik, diğer güne 1 saatlik gezi düşebilir!

- **Günlük Zaman Bütçesi:** 09:00 - 18:00 arası 540 dakika (ziyaret + yol).
- **Heuristic Rebalancing:** En yoğun günden en hafif güne nokta taşınırken şu optimizasyon puanı hesaplanır:

$$\text{Score} = \left(\frac{1}{\text{distToTarget} + 0.1}\right) \times 0.6 + \left(\frac{\text{duration}}{\text{MAX\_DAY\_MINUTES}}\right) \times 0.4$$

#### 🚨 Kritik Tasarım Kararı: `GEO_REBALANCE_SLACK = 1.35`
> *"Sırf süreleri eşit olsun diye Sultanahmet'teki bir camiyi Kadıköy gününe taşımak gerçek hayatta bir turistin başına gelebilecek en kötü şeydir."*
- Bu yüzden koddaki `GEO_REBALANCE_SLACK = 1.35` eşiği kontrol edilir: Aday nokta, hedef kümeye mevcut komşularından %35'ten daha uzaksa **asla taşınmaz**, coğrafi bütünlük korunur!

#### `rebalanceStopCounts` Fonksiyonu
- Kullanıcı manuel seçim yaptığında 8-1-1 gibi dengesiz durak dağılımlarını engeller; farkın en fazla 1 olmasını ($\lceil N/D \rceil$) sağlar.

---

### 3.4 Gezgin Satıcı Problemi (TSP): Nearest Neighbor + 2-Opt Heuristic (`tsp.ts`)

Bir günün içindeki 4-5 durağı hangi sırayla gezeceğiz? Bu klasik bir **NP-Hard Gezgin Satıcı Problemidir (TSP)**.

1. **Nearest Neighbor (Açgözlü Başlangıç):** Konaklama noktasından başlayarak her adımda henüz ziyaret edilmemiş en yakın noktaya gidilir. Zaman karmaşıklığı: $O(N^2)$.
2. **2-Opt Local Search (Düğümleri Çözme):** Nearest neighbor rotasında çizgiler birbirini kesebilir (zigzag). 2-Opt algoritması, rotadaki ikili kenarları ters çevirerek (swap) toplam mesafeyi azaltmaya çalışır:

```typescript
function twoOptSwap(route: Place[], i: number, k: number): Place[] {
  const newRoute = [...route.slice(0, i)];
  const reversedChunk = [...route.slice(i, k + 1)].reverse();
  newRoute.push(...reversedChunk);
  newRoute.push(...route.slice(k + 1));
  return newRoute;
}
```
Mesafe iyileşmeyene kadar iterasyon devam eder. Çapraz geçişler yok edilir.

---

### 3.5 Gerçekçi Zaman Çizelgesi (Timeline Engine & 1.4x Yol Katsayısı) (`timeline.ts`)

Piyasadaki gezi uygulamalarının yaptığı en büyük hata kuş uçuşu mesafeyi ve sabit yürüyüş hızını baz alıp gerçek hayatı yok saymaktır. Bizim modelimiz:

1. **1.4x Detour Katsayısı:** Şehir içi sokaklar doğrusal değildir. Kuş uçuşu mesafe $1.4$ katsayısı ile çarpılarak gerçek yol mesafesi tahmin edilir (`realDistKm = travelDistKm * 1.4`).
2. **15 km/s Ortalama Hız & 5 dk Minimum Tampon:** Şehir içi ulaşım süresi hesaplanır; minimum 5 dakika transfer süresi garanti edilir.
3. **İlk Durak Transferi:** İlk durağın mesafesi de otelden/başlangıç noktasından başlatılır (0 dk varsayılmaz).
4. **Kapanış Saati Kontrolü & Overflow Yönetimi:**
   - Bir mekanın varış saati kapanış saatinden sonraysa mekan güne sığmaz (`overflowPlaces` listesine atılır).
   - Mekana kapanmadan önce varılıyor ama gezi süresi kapanışı aşıyorsa, ziyaret süresi otomatik olarak kapanış saatine göre kısaltılır (hata fırlatılmaz).

---

### 3.6 Doğal Dil / Anahtar Kelime Bazlı Akıllı Süre Tahmini (`smartDuration.ts`)

Veri setinde mekanların ziyaret süresi eksikse ne yapıyoruz?
Türkçe karakter normalizasyonu (`normalizeTR`) yapılarak zengin bir kural motoru çalışır:
- *"antik kent", "ören yeri"* $\rightarrow$ 3.0 saat (Kapanış: 19:00)
- *"saray", "arkeoloji müzesi"* $\rightarrow$ 2.5 saat (Kapanış: 17:00)
- *"müze", "galeri"* $\rightarrow$ 1.5 saat (Kapanış: 17:00)
- *"cami", "türbe"* $\rightarrow$ 0.5 saat (Kapanış: 20:00)
- *"piknik", "mesire"* $\rightarrow$ 4.5 saat (Kapanış: 21:00, öğleden sonra tercihli)
- *"saat kulesi", "çeşme"* $\rightarrow$ 15-20 dakika

---

## 4. VERİ MİMARİSİ, İKİ KADEMELİ CACHE (L1/L2) & HATA DAYANIKLILIĞI

Uygulamanın çevrimdışı veya zayıf ağ koşullarında kesintisiz çalışması için tasarlanan stratejiler:

### 4.1 İki Kademeli (L1/L2) Önbellek Sistemi (`cacheService.js`)
- **L1 Cache (In-Memory Map):** RAM üzerinde JavaScript `Map` objesi. 0 ms erişim süresi, JSON parse maliyeti yok.
- **L2 Cache (AsyncStorage):** Cihaz diskinde kalıcı storage. Uygulama kapatılıp açılsa da veriyi korur.
- **Stale-While-Revalidate Mantığı (`getStale`):** Ağ koptuğunda süresi geçmiş olsa bile eski veriyi ekrana basarak kullanıcının boş ekran görmesini engeller.
- **Storage Limit Koruması:** Cihaz diski dolarsa (`SQLite_Full` / quota hatası) eski cache otomatik temizlenir.

```
İstek ──> L1 (RAM Map) [Milisaniye Altı]
             │ (Yoksa)
             ▼
          L2 (AsyncStorage / Disk) [~5-10ms]
             │ (Yoksa)
             ▼
          Network / API Çağrısı ──> L1 ve L2'ye Yaz
```

### 4.2 Katmanlı API Fallback Zinciri (Graceful Degradation)

| Özellik | Birincil Kaynak (Primary) | İkincil Kaynak (Secondary) | Nihai Fallback (Offline) |
|---|---|---|---|
| **Şehir Mekanları** | Supabase `places` tablosu | Kültür Portalı 81 İl JSON Verisi | AsyncStorage Cache |
| **Mekan Koordinatları** | `place_coordinates.json` (Doğrulanmış Harita Verisi) | Nominatim API (1.1s rate limited batch geocoding) | Şehir Merkezi Koordinatları |
| **Rota Çizimi & Yol** | Supabase Edge Function (OpenRouteService) | İstemci Tarafı Haversine TSP Motoru | Düz Çizgi Polylines |
| **Yeme/İçme & Otel** | Supabase Edge Function (TomTom API) | OpenStreetMap Overpass (4 yedek sunucu döngüsü) | Stale Local Cache |
| **Gezi Asistanı** | Gemini 2.0 Flash Lite Edge Function | Yerel Kural Bazlı Asistan Yanıtı | "Çevrimdışı Mod" Bilgilendirmesi |

---

## 5. KOD YÜRÜYÜŞÜ (LIVE CODE REVIEW SENARYOLARI)

Mülakatta *"Bize kod üzerinden bir akışı anlat"* dediklerinde açacağın 4 kritik dosya:

### 🎯 Senaryo A: Gezi Planı Oluşturma Motoru
**Dosya:** `mobile/src/domain/itineraryGenerator.js`
1. `generateItinerary(places, days, options)` fonksiyonunu göster.
2. **Adım 1:** Veri normalizasyonu (`formattedPlaces`). Koordinatlar, `smartDuration` ile akıllı süreler ve kapanış saatleri hesaplanır.
3. **Adım 2:** Restoran/kafe gibi mekanların gezi rotasına dahil edilmemesi (`selectRealisticTripPlaces`). Starbucks bir gezi noktası değildir; yemek öğünleri ayrı yönetilir.
4. **Adım 3:** Günlük 540 dakikalık bütçe kontrolü. Aşarsa en yüksek popülerlik puanına göre greedy pruning.
5. **Adım 4:** `balancePlacesIntoDays` ile duration-aware K-Means kümelemesi.
6. **Adım 5:** Gün kümelerini konaklama merkezine en yakın olandan başlatacak şekilde sıralama (`nearestClusterDistance`).
7. **Adım 6:** Her gün için `optimizeRoute` (TSP 2-Opt) ve `generateTimeline` çağrısı.
8. **Adım 7:** Güne sığmayan `overflowPlaces` tespiti ve toplam bütçe hesaplaması (`estimateTotalBudget`).

### 🎯 Senaryo B: Güvenlik, Oturum ve Token Yönetimi
**Dosya:** `mobile/src/contexts/AuthContext.js` ve `mobile/src/config/supabase.js`
1. `SecureStoreAdapter`: Supabase token'larının Expo SecureStore ile iOS Keychain / Android Keystore'a yazıldığını göster.
2. `flowType: 'pkce'`: Mobil ortamda client secret saklanamayacağı için PKCE (Proof Key for Code Exchange) akışı kullanıldığını belirt.
3. `AppState` Listener: Kullanıcı uygulamayı arka plandan ön plana aldığında token'ın bitmesine 300 saniyeden az kalmışsa arka planda sessizce `refreshSession()` çağrıldığını göster.

### 🎯 Senaryo C: Leaflet Harita ve İki Yönlü WebView Köprüsü
**Dosya:** `mobile/src/screens/map/MapScreen.js` & `mobile/src/utils/leafletHtml.js`
1. Harici native harita SDK'ları yerine neden Leaflet.js + WebView seçildiğini anlat (hafiflik, esneklik, ücretsiz katmanlar).
2. React Native ile WebView arasındaki köprüyü göster:
   - React Native $\rightarrow$ WebView: `webViewRef.current.postMessage(JSON.stringify({ action: 'flyTo', lat, lng }))`
   - WebView $\rightarrow$ React Native: Kullanıcı haritaya dokunduğunda `window.ReactNativeWebView.postMessage(...)` ile `locationPick` event'inin dinlenmesi.
3. Google Maps Deep Link desteği: Tek nokta için rota veya çoklu noktalar için waypoints (8 ara nokta sınırı ile) native Google Maps uygulamasını açma.

### 🎯 Senaryo D: AI Gezi Asistanı & Prompt Engineering
**Dosya:** `supabase/functions/travel-assistant/index.ts`
1. Gemini 2.0 Flash modeline giden dinamik bağlamı (context injection) göster:
   - Kullanıcının bulunduğu şehir, toplam gün sayısı, gezi günü.
   - Bugünkü planlanan yerler, tamamlanan yerler.
   - Gün içindeki **kalan net boş vakit (dakika)**.
2. Modelin bu sayede *"Şu an 45 dakikan var, Topkapı Sarayı'na yetişemezsin ama hemen yanındaki Gülhane Parkı'nda kahve içebilirsin"* şeklinde duruma özel yanıt verebildiğini anlat.

---

## 6. MÜLAKATTA GELEBİLECEK ZOR TEKNİK SORULAR VE CEVAPLARI (Q&A)

#### S1: "Neden Redux Toolkit veya Zustand kullanmadın da Context API tercih ettin?"
> **Cevap:** *"Uygulamadaki global durum (state) gereksinimi oldukça odaklıydı: Kimlik doğrulama (`AuthContext`), tema tercihi (`ThemeContext`) ve gezi asistanı bağlamı (`AssistantContext`). Gezi planlama akışındaki veriler ekranlar arası navigasyon parametreleri ve repository katmanı üzerinden yönetiliyor. Zustand veya Redux gibi harici bir kütüphane eklemek bundle boyutunu artırır ve gereksiz boilerplate kod üretirdi. Context API, memoization (`useMemo`, `useCallback`) ve atomik yapı ile bu ölçekteki bir uygulama için en verimli ve hafif çözümdü."*

#### S2: "K-Means kümelemesinde neden k-means++ benzeri Furthest-First kullandın?"
> **Cevap:** *"Klasik K-Means rastgele merkez seçimiyle başlar. Coğrafi verilerde eğer iki merkez birbirine çok yakın başlarsa, algoritma yerel minimuma (local minima) saplanıp iki günü neredeyse aynı semte bölebilir. Furthest-First Traversal ile her yeni merkezi, önceki merkezlerden en uzaktaki noktadan seçerek günlerin şehre dengeli yayılmasını garanti altına aldım."*

#### S3: "TSP için 2-Opt algoritmasının zaman karmaşıklığı nedir? Mobilde kasma yapar mı?"
> **Cevap:** *"2-Opt algoritmasının tek bir geçişi $O(N^2)$'dir; genel yakınsaması en kötü senaryoda $O(N^3)$ olabilir. Ancak bizim domain'imizde bir turistin bir günde gezebileceği mantıklı durak sayısı $N \le 6$ ile $8$ arasındadır. $N=6$ için kombinasyon sayısı yalnızca onlar mertebesindedir. Bu hesaplama modern mobil cihazlarda 1-2 milisaniyede tamamlanır; bu yüzden thread'i bloke etmez ve UI donması yaşanmaz."*

#### S4: "Nominatim Geocoding API'nin saniyede 1 istek kuralını (rate limit) nasıl aştın?"
> **Cevap:** *"Nominatim katı bir kullanım politikasına sahip (1 req/sec). Bunu aşmak için 3 seviyeli savunma kurdum: Birincisi, Kültür Portalı'nın haritasından çekilmiş statik bir `place_coordinates.json` tablosu oluşturdum; mekanların %85'i sıfır API çağrısıyla buradan çözülür. İkincisi, bulunamayanlar için `batchGeocodeForCity` servisinde `1100 ms`lik asenkron gecikme (delay queue) uyguladım. Üçüncüsü, çözümlenen her koordinatı AsyncStorage'a kalıcı olarak önbellekledim."*

#### S5: "Projede React 19 ve Expo SDK 54 kullanılmış. Hangi React performans optimizasyonlarını yaptın?"
> **Cevap:**
> 1. *`PlaceCard` ve `EtkinlikCard` gibi liste elemanlarını `React.memo` ile sardım.*
> 2. *`FlatList` bileşenlerinde `initialNumToRender={8}`, `maxToRenderPerBatch={8}`, `windowSize={5}` ve `removeClippedSubviews={true}` tanımlayarak ekran dışı elemanların bellekten düşürülmesini sağladım.*
> 3. *Ağır filtreleme ve harita HTML üretimlerini `useMemo` ile, fonksiyon referanslarını `useCallback` ile korudum.*
> 4. *Görseller için `expo-image` kullanarak disk ve bellek önbelleklemesini yerel (native) seviyede optimize ettim.*

#### S6: "Bu projeyi 1 milyon aktif kullanıcıya çıkaracak olsaydın mimaride neleri değiştirirdin?"
> **Cevap:**
> 1. *"K-Means ve TSP hesaplamalarını mobil istemciden çıkarıp Go veya Rust ile yazılmış microservice'lere veya optimize edilmiş Edge Worker'lara taşırdım."*
> 2. *"Veritabanı tarafında PostgreSQL üzerine **PostGIS** eklentisi kurarak coğrafi indeksleme (`ST_DWithin`, `Spatial Index - R-Tree`) yapardım."*
> 3. *"Tüm statik şehir ve mekan verilerini **Cloudflare CDN** arkasına alarak veritabanı yükünü %90 azaltırdım."*
> 4. *"Supabase Connection Pooler (PgBouncer) yapılandırmasını optimize ederdim."*

---

## 7. PERFORMANS OPTİMİZASYONLARI & BEST PRACTICE'LER

- **Prefetch Stratejisi (`prefetchService.js`):** Uygulama ilk açıldığında en popüler 5 şehir arka planda önceden yüklenir. Kalan şehirler ana thread'i tıkamamak için `setTimeout` ile 2 saniyede bir kuyruğa alınarak belleğe çekilir.
- **Lottie & Glassmorphism:** Onboarding ekranında vektörel Lottie animasyonu ve `expo-blur` ile modern iOS/Android cam tasarımı.
- **Micro-Animations:** TabBar ikonlarında özel `Animated.spring` bounciness ve ölçeklenme efektleri.
- **Skeleton Loader Pattern:** Veri yüklenirken standart dönen çark (spinner) yerine gerçek kart boyutlarında Skeletonloader gösterilerek algılanan performans (perceived performance) maksimize edilmiştir.
- **Gamification (Oyunlaştırma):** Ziyaret edilen şehir sayısı ve tamamlanan rota kilometresi üzerinden rozet sistemi (`achievementService.js`).

---

## 8. MÜLAKAT GÜNÜ İÇİN ALTIN İPUÇLARI (CHEAT SHEET)

1. **Önce Bütünü, Sonra Detayı Göster:** Mimari diyagramı zihninde canlandır. Doğrudan tek bir fonksiyona atlamak yerine *"Uygulama 5 katmandan oluşuyor: UI, Domain, Algoritmalar, Repository ve Dış Servisler"* diyerek giriş yap.
2. **"Neden?" Sorusuna Odaklan:** Mülakatçılar kodun ne yaptığından ziyade kararların arkasındaki mühendislik mantığını duymak ister. *"Neden K-Means?"*, *"Neden 2-Opt?"*, *"Neden L1/L2 Cache?"* sorularının yanıtlarını yukarıdaki teknik argümanlarla açıkla.
3. **Mütevazı ama Bilgili Ol:** *"Algoritmaları önce saf TypeScript olarak ayrı bir modülde yazdım, böylece UI katmanına bağımlı olmadan bağımsız test edebildim"* cümlesi seni doğrudan üst segment bir mühendis adayı yapar.
4. **Hataları Nasıl Yönettiğini Anlat:** *"API çökerse ne olur?"* diye sorulursa hemen Overpass sunucu döngüsünü, ORS yerine Haversine fallback'ini ve AsyncStorage Stale Cache mekanizmasını anlat.

**Başarılar! Bu mimari ve mühendislik seviyesi ile mülakatı domine edeceksin.** 🚀
