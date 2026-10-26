# 04 · Değişiklik Notları

Bu turda yapılan değişiklikler. Commit atılmadı; gözden geçirip kendiniz commit'leyebilirsiniz. Bulgu numaraları için bkz. [01-PROJE-ANALIZI.md](01-PROJE-ANALIZI.md).

## Kullanıcının göreceği yenilikler

**Plan oluşturma**
- Tarih adımında **ulaşım şekli** (yürüyerek / toplu taşıma / araçla) ve **gezi temposu** (sakin / dengeli / yoğun) seçimi.
- Şehir adımında **arama** (Türkçe karakter duyarlı).
- En fazla 14 günlük plan; aşılırsa açıklayıcı uyarı.
- Özet adımında ulaşım, tempo ve "seçtiğiniz yerler sığmayabilir" uyarısı.

**Plan detayı**
- Her gün için **tarih + gün adı**, başlangıç–bitiş saati, toplam km, yolda geçen süre.
- Her durakta **varış–ayrılış saati**, kapanış saati; duraklar arasında **ulaşım süresi ve modu** ("12 dk toplu taşıma · 2.1 km").
- Motorun yerleştirdiği saatte **öğle arası**, yakındaki restoran önerisiyle.
- **Gün bazlı "Rota"** butonu; Google Maps seçilen ulaşım moduyla açılır (toplu taşımada sıradaki durağa).
- **Tahmini bütçe** kartı (giriş, ulaşım/yakıt, yemek).
- Programa sığmayan seçili yerler için **uyarı kartı**.
- Durak silme / alternatifle değiştirme sonrası **saatler yeniden hesaplanır**; Kültür Portalı tabanlı planlarda da çalışır.
- "Alternatif" artık şehrin **gezilecek yerlerinden** öneriyor (önceden restoran öneriyordu).
- **Paylaşım** gün gün program metnini içeriyor.

## Dosya bazında

| Dosya | Değişiklik |
|---|---|
| `mobile/src/algorithms/travelProfiles.ts` | **Yeni.** Ulaşım ve tempo profilleri, `estimateLeg` |
| `mobile/src/algorithms/timeline.ts` | Seçenek nesnesi imzası, öğle arası, mod bazlı bacaklar, anlamlı ziyaret süresi kuralı, otele dönüş |
| `mobile/src/algorithms/tsp.ts` | 2-Opt delta hesabı; `calculateTotalDistance` export |
| `mobile/src/algorithms/smartDuration.ts` | Türkçe normalize düzeltmesi, kelime başı eşleşme, kural sırası, `adjustClosingHourForSeason` |
| `mobile/src/domain/itineraryGenerator.js` | v4 motor: tempo/ulaşım/tarih, aday sıralar, taşma dağıtımı, `rescheduleDay`, `getTripMeta`, mod bazlı bütçe |
| `mobile/src/utils/dateUtils.js` | **Yeni.** Yerel tarih yardımcıları (UTC kayması düzeltmesi) |
| `mobile/src/screens/itinerary/CreateItineraryScreen.js` | Ulaşım/tempo seçimi, şehir araması, yerel tarih, 14 gün sınırı, try/catch |
| `mobile/src/screens/itinerary/ItineraryDetailScreen.js` | Zaman çizelgesi görünümü, bütçe, gün rotası, JSONB plan düzenleme, sığmayan yerler |
| `mobile/src/screens/itinerary/SavedItinerariesScreen.js` | JSONB planlarda durak sayısı |
| `mobile/src/utils/shareManager.js` | Gün gün program metni |
| `mobile/src/components/itinerary/PlaceSelectionCard.js` | İstemci tarafı Gemini çağrısı → ücretsiz Wikipedia özeti |
| `mobile/src/data/api/overpassApi.js` | Eşzamanlı aynı istekleri birleştirme |
| `mobile/src/data/repositories/itineraryRepository.js` | Item kaydı başarısızsa itinerary geri alınır |
| `mobile/src/services/placeDataManager.js` | `refreshCity` doğru cache anahtarını temizler |
| `mobile/app.config.js` | app.json eklentileri korunur; Gemini anahtarı istemciden çıkarıldı |
| `mobile/scripts/test-planner.js`, `mobile/package.json` | **Yeni.** `npm run test:planner` |

## Dikkat edilmesi gerekenler

1. **`app.config.js` eklentileri:** Artık `expo-font`, `expo-secure-store` ve `expo-image-picker` eklentileri build'e giriyor. Bir sonraki native build'de (`eas build` / `expo prebuild`) iOS izin metinleri eklenecek. Eğer `plugins: []` bilinçli bir geçici çözümse geri alın ve sebebini not edin.
2. **Gemini anahtarı:** `GEMINI_API_KEY` artık uygulama paketine girmiyor. Daha önce yayınlanmış bir build'de anahtar açıkta kaldığı için **anahtarı Google AI Studio'dan yenilemeniz** önerilir. Asistan özelliği Edge Function üzerinden (`travel-assistant`) çalışmaya devam eder.
3. **`src/config/secrets.js`** (gitignore'da) artık hiçbir dosya tarafından import edilmiyor; silebilirsiniz.
4. **Eski planlar:** `tripMeta` içermeyen planlar varsayılanlarla (toplu taşıma, dengeli) gösterilir; saat bilgisi yoksa saat satırı çıkmaz. İlk düzenlemede (silme/değiştirme) o günün saatleri hesaplanır.
5. **Veritabanı şeması değişmedi.** Yeni bilgiler mevcut `plan` JSONB kolonunda tutulur; migration gerekmez.

## Doğrulama

- `npm run test:planner` → 11/11 test geçti.
- `npx expo export --platform android` → paket hatasız derlendi.
- `npx expo config --type public` → eklentiler çözülüyor, `extra` içinde yalnızca `supabaseUrl`, `supabaseAnonKey`, `eas` var.
- Cihaz / emülatörde manuel test **yapılmadı**; aşağıdaki senaryoları denemeniz önerilir:
  - Yürüyerek + sakin tempo ile 2 günlük İstanbul planı → saatler, öğle arası, bacak süreleri.
  - Manuel modda 1 güne 9 yer seçin → "X yer programa sığmadı" kartı.
  - Plan detayında bir durağı silin → sonraki durakların saatleri kayar.
  - "Alternatif" → aynı kategoriden yakın bir gezi yeri önerilmeli.
  - Kasım ayı için plan → açık hava yerleri 17:30 öncesine planlanmalı.

## Expo SDK 57 yükseltmesi

Telefondaki Expo Go SDK 57 olduğu için `mobile` projesi SDK 54 → 57'ye yükseltildi (`npx expo install --fix`).

- React Native 0.81 → 0.86, React 19.2, tüm `expo-*` paketleri 57.x.
- `app.json`: `newArchEnabled` kaldırıldı (artık varsayılan); `splash` alanı `expo-splash-screen` eklentisine taşındı; SDK'nın istediği eklentiler eklendi.
- `app.config.js`: `dotenv/config` importu kaldırıldı (Expo CLI `.env`'i kendisi yükler; paket artık kurulu değil).
- Eksik doğrudan bağımlılıklar eklendi: `@expo/vector-icons`, `expo-constants`, `expo-splash-screen`; devDependency: `typescript ~6.0`, `sucrase`.
- `npx expo-doctor` → 21/21; `expo export --platform android` başarılı.

**Önemli:** Uygulamayı **`mobile` klasöründen** başlatın (`cd mobile && npx expo start`). Kök dizindeki `package.json` ayrı bir pakettir (expo ^56) ve orada başlatınca "SDK 56" hatası alınır.
