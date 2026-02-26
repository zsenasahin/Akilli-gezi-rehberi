# 🗺️ Harita ve Rota Sistemi — Kurulum Rehberi

## 1. Supabase Cache Tablosu

Supabase Dashboard → **SQL Editor** → yeni sorgu oluştur ve şunu çalıştır:

```sql
CREATE TABLE IF NOT EXISTS api_cache (
    id SERIAL PRIMARY KEY,
    cache_key TEXT UNIQUE NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on api_cache"
    ON api_cache FOR ALL USING (true) WITH CHECK (true);
```

---

## 2. OpenRouteService API Key

1. https://openrouteservice.org adresine git
2. **Sign Up** ile ücretsiz hesap oluştur
3. Dashboard → **API Keys** → **Create Token**
4. Token'ı kopyala (örn: `5b3ce3597851110001cf624812345...`)

### Supabase'e API Key Ekle

Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**:

| Secret Name    | Value                              |
|----------------|-------------------------------------|
| `ORS_API_KEY`  | `5b3ce3597851110001cf624812345...`  |

---

## 3. Edge Functions Deploy

### Supabase CLI Kur (eğer yoksa)
```bash
npm install -g supabase
supabase login
```

### Projeyi bağla
```bash
cd /Users/zeynep/Documents/SmartTravelGuide
supabase link --project-ref hgyuzdgrmgsfemluccab
```

### Edge Functions'ı Deploy Et
```bash
# Yakın oteller
supabase functions deploy nearby-hotels --no-verify-jwt

# Yakın restoranlar
supabase functions deploy nearby-restaurants --no-verify-jwt

# Rota optimizasyonu
supabase functions deploy optimize-route --no-verify-jwt
```

### Environment Variable ayarla
```bash
supabase secrets set ORS_API_KEY=YOUR_OPENROUTESERVICE_API_KEY
```

---

## 4. Test Et

### Edge Function test:
```bash
# Yakın oteller (İstanbul Sultanahmet çevresi)
curl -X POST https://hgyuzdgrmgsfemluccab.supabase.co/functions/v1/nearby-hotels \
  -H "Authorization: Bearer sb_publishable_jioYqSeYqUBScL7gzyq9aA_XumQ9io9" \
  -H "Content-Type: application/json" \
  -d '{"lat": 41.0082, "lng": 28.9784, "radius": 2000}'

# Yakın restoranlar
curl -X POST https://hgyuzdgrmgsfemluccab.supabase.co/functions/v1/nearby-restaurants \
  -H "Authorization: Bearer sb_publishable_jioYqSeYqUBScL7gzyq9aA_XumQ9io9" \
  -H "Content-Type: application/json" \
  -d '{"lat": 41.0082, "lng": 28.9784, "radius": 1000}'

# Rota optimizasyonu
curl -X POST https://hgyuzdgrmgsfemluccab.supabase.co/functions/v1/optimize-route \
  -H "Authorization: Bearer sb_publishable_jioYqSeYqUBScL7gzyq9aA_XumQ9io9" \
  -H "Content-Type: application/json" \
  -d '{
    "accommodation": {"lat": 41.0082, "lng": 28.9784},
    "places": [
      {"id": 1, "name": "Ayasofya", "lat": 41.0086, "lng": 28.9802},
      {"id": 2, "name": "Topkapı Sarayı", "lat": 41.0115, "lng": 28.9833},
      {"id": 5, "name": "Galata Kulesi", "lat": 41.0256, "lng": 28.9741}
    ]
  }'
```

---

## 5. Dosya Yapısı (Oluşturulan)

```
mobile/
├── src/
│   ├── screens/map/
│   │   └── MapScreen.js              ✅ Ana harita ekranı (3 adımlı wizard)
│   ├── components/map/
│   │   ├── HotelCard.js              ✅ Otel öneri kartı
│   │   └── RestaurantCard.js         ✅ Restoran kartı
│   ├── services/
│   │   └── mapService.js             ✅ Edge Function API çağrıları
│   ├── utils/
│   │   ├── haversine.js              ✅ Mesafe hesaplama + sıralama
│   │   └── leafletHtml.js            ✅ Leaflet.js WebView HTML
│   └── navigation/
│       └── MainNavigator.js          ✅ MapScreen route eklendi
│
supabase/
├── functions/
│   ├── nearby-hotels/index.ts        ✅ Overpass API → Oteller
│   ├── nearby-restaurants/index.ts   ✅ Overpass API → Restoranlar
│   └── optimize-route/index.ts       ✅ Haversine + ORS → Rota
└── migrations/
    └── create_api_cache.sql          ✅ Cache tablosu
```

---

## 6. Güvenlik Kontrol Listesi

- [x] API key'ler sadece backend'de (Supabase Secrets)
- [x] Frontend ASLA doğrudan Overpass/ORS'a istek atmıyor
- [x] Rate limiting: Overpass API 24 saat cache
- [x] Hata yönetimi: her serviste try/catch + fallback
- [x] Loading ve error state'ler: MapScreen'de her adımda
- [x] © OpenStreetMap contributors attribution: Leaflet'te dahili
