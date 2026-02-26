# 🗺️ Harita ve Rota Sistemi — Uygulama Planı

## Mimari Genel Bakış

```
┌─────────────────────────────────────────┐
│              FRONTEND (React Native)     │
│                                          │
│  MapScreen ← WebView + Leaflet.js        │
│     ├── Long-press → Konaklama seçimi    │
│     ├── Markers → Gezi noktaları         │
│     ├── Polyline → Optimized rota        │
│     ├── Hotel Cards → Overpass sonuçları  │
│     └── Restaurant List → Yakın mekanlar │
│                                          │
│  API Calls → Supabase Edge Functions     │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         BACKEND (Supabase Edge Func.)    │
│                                          │
│  /nearby-hotels  → Overpass API          │
│  /nearby-restaurants → Overpass API      │
│  /optimize-route → Haversine + ORS API   │
│                                          │
│  ENV: ORS_API_KEY (güvenli)              │
│  CACHE: Supabase DB (24h TTL)            │
└──────────────────────────────────────────┘
```

## Dosya Yapısı

```
mobile/
├── src/
│   ├── screens/
│   │   └── map/
│   │       └── MapScreen.js          ← Ana harita ekranı
│   ├── components/
│   │   └── map/
│   │       ├── MapWebView.js         ← Leaflet WebView bileşeni
│   │       ├── HotelCard.js          ← Otel öneri kartı
│   │       └── RestaurantCard.js     ← Restoran öneri kartı
│   ├── services/
│   │   ├── mapService.js             ← Edge Function API çağrıları
│   │   └── haversine.js              ← Mesafe hesaplama
│   └── utils/
│       └── leafletHtml.js            ← Leaflet HTML template
│
supabase/
└── functions/
    ├── nearby-hotels/
    │   └── index.ts                  ← Overpass: Yakın oteller
    ├── nearby-restaurants/
    │   └── index.ts                  ← Overpass: Yakın restoranlar
    └── optimize-route/
        └── index.ts                  ← Haversine + ORS rota
```

## Uygulama Adımları

### Adım 1: Supabase Cache Tablosu
### Adım 2: Edge Functions (3 adet)
### Adım 3: Haversine Utility
### Adım 4: Map Service (API çağrıları)
### Adım 5: Leaflet WebView Bileşeni
### Adım 6: MapScreen (ana ekran)
### Adım 7: Navigation entegrasyonu
