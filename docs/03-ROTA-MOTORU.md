# 03 · Rota Motoru (v4)

Plan motoru tamamen istemcide çalışır ve **hiçbir ücretli API kullanmaz**. Mesafeler Haversine ile hesaplanır, gerçek yol süresi ulaşım moduna özel katsayılarla tahmin edilir.

```
generateItinerary(places, days, options)          mobile/src/domain/itineraryGenerator.js
 │
 ├─ 1. normalizePlace       süre (smartDuration) · kapanış saati · kış düzeltmesi
 ├─ 2. selectRealisticTripPlaces   yeme-içme hariç · tempo × gün kadar durak (otomatik mod)
 ├─ 3. süre bütçesi         (gün bitişi − başlangıç − öğle arası) × gün
 ├─ 4. balancePlacesIntoDays   K-Means + süre dengesi + durak sayısı dengesi
 ├─ 5. scheduleDay (her gün)
 │     ├─ optimizeRoute      Nearest Neighbor + 2-Opt (delta)
 │     ├─ aday sıralar       TSP · erken kapanan önce · ters TSP
 │     └─ generateTimeline   en çok durağı sığdıran / en kısa süren aday seçilir
 ├─ 6. redistributeOverflow  sığmayan durak → coğrafi olarak en yakın, kapasitesi olan gün
 └─ 7. plan + tripMeta + unscheduled
```

## Seçenekler

| Seçenek | Değerler | Varsayılan |
|---|---|---|
| `transportMode` | `walking` · `transit` · `driving` | `transit` |
| `pace` | `relaxed` · `balanced` · `intense` | `balanced` |
| `selectionMode` | `auto` · `manual` | `manual` |
| `startDate` | `YYYY-MM-DD` | — (tarihsiz plan) |
| `startLocation` | `{ latitude, longitude }` | — (günübirlik) |
| `cityLat`, `cityLng` | şehir merkezi | İstanbul |

## Ulaşım profilleri (`algorithms/travelProfiles.ts`)

| Mod | Hız | Yol katsayısı | Sabit bekleme | Özel kural |
|---|---|---|---|---|
| Yürüyüş | 4.5 km/s | 1.3 | 0 dk | 2.5 km üstü bacak → toplu taşıma |
| Toplu taşıma | 18 km/s | 1.4 | 10 dk | 0.5 km altı bacak → yürüyüş |
| Araç | 25 km/s | 1.4 | 8 dk (park) | 0.5 km altı bacak → yürüyüş |

## Tempo profilleri

| Tempo | Başlangıç | Gün sonu | Gün başı maks. durak | Öğle arası |
|---|---|---|---|---|
| Sakin | 10:00 | 18:00 | 3 | 75 dk |
| Dengeli | 09:00 | 18:30 | 4 | 60 dk |
| Yoğun | 08:30 | 19:30 | 6 | 45 dk |

## Zaman çizelgesi kuralları (`algorithms/timeline.ts`)

- **Öğle arası:** 12:30'dan sonraki ilk boşlukta verilir; 12:00'den sonra başlayıp 14:00'ü geçecek uzun bir ziyaret varsa önce yemek molası verilir. 15:00'ten sonra verilmez.
- **Kapanış saati:** Varışta, ziyaret süresinin en az yarısı (min. 30 dk) kapanıştan önce tamamlanamıyorsa durak o güne sığmaz. Eski sürüm 3 saatlik antik kenti kapanışa 15 dk kala "ziyaret edildi" sayabiliyordu.
- **Piknik / mesire:** 14:00'ten önce başlatılmaz.
- **Dönüş:** Konaklama varsa günün son durağından otele dönüş mesafesi gün toplamına eklenir.

## Süre ve kapanış tahmini (`algorithms/smartDuration.ts`)

- Anahtar kelimeler **kelime başında** eşleşir: "kale" → "Rumeli Kalesi" ✓, "han" → "Cihangir" ✗.
- Türkçe büyük harfler küçültmeden önce dönüştürülür (`İ → i`, `I → ı`).
- Kasım–Şubat arasında açık hava yerleri (ören yeri, doğa, plaj, kale…) en geç **17:30**'da kapanır.

## Kayıtlı plan formatı (`itineraries.plan` JSONB)

Geriye dönük uyumluluk için plan hâlâ **gün dizisidir**. Yeni alanlar eklenmiştir:

```jsonc
[
  {
    "day": 1,
    "date": "2026-10-23",
    "startTime": "09:03", "endTime": "16:54",
    "totalHours": 7.9, "totalDistance": 1.6, "totalTravelMinutes": 24, "transitLegs": 0,
    "transportMode": "walking", "pace": "balanced",
    "breaks": [{ "type": "lunch", "startTime": "12:11", "endTime": "13:11", "afterIndex": 1 }],
    "places": [
      { "id": 2, "name": "Ayasofya Camii", "arrivalTime": "09:03", "departureTime": "09:33",
        "travelMinutesFromPrev": 3, "travelModeFromPrev": "walking", "travelDistanceKmFromPrev": 0.1,
        "closing_hour": 20, "duration_minutes": 30, "lat": 41.0086, "lng": 28.9802, "is_completed": false }
    ],
    // Yalnızca ilk günde: gezi seviyesindeki bilgi
    "tripMeta": {
      "version": 2, "transportMode": "walking", "pace": "balanced", "selectionMode": "manual",
      "startDate": "2026-10-23", "accommodationName": "…",
      "unscheduled": [{ "id": 9, "name": "Rumeli Hisarı", "category": "tarihi", "reason": "overflow" }]
    }
  }
]
```

`getTripMeta(plan)` bu bilgiyi okur; eski planlarda `null` döner ve ekranlar varsayılanlarla çalışır.

## Plan düzenleme: `rescheduleDay(places, dayNumber, options)`

Detay ekranında durak silindiğinde veya alternatifle değiştirildiğinde günün saatleri yeniden hesaplanır. Kullanıcının sırası korunur; güne sığmayan duraklar silinmez, `isOverflow: true` ile "Zaman yetmeyebilir" olarak işaretlenir.

## Test

```bash
cd mobile
npm run test:planner
```

`scripts/test-planner.js` Türkçe eşleşme, mevsim düzeltmesi, ulaşım bacakları, 2-Opt, öğle arası, kapanış saati, manuel seçimde kayıp olmaması, gün dengesi ve yeniden zamanlamayı doğrular.
