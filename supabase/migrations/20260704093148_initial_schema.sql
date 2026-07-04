-- ============================================================
-- SmartTravelGuide — Akıllı Gezi Rehberi PostGIS Entegrasyonu
-- ============================================================

-- PostGIS eklentisini aktif et (Coğrafi sorgular ve yarıçap hesaplamaları için)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. CITIES Tablosu
CREATE TABLE IF NOT EXISTS public.cities (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Eğer 'cities' tablosu zaten varsa ama 'location' kolonu yoksa diye alter ile ekliyoruz
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Hızlı yarıçap aramaları (ST_DWithin) için GIST index
CREATE INDEX IF NOT EXISTS cities_location_idx ON public.cities USING GIST (location);

-- 2. PLACES Tablosuna PostGIS Desteği Eklenmesi
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 60;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS opening_hours JSONB;
CREATE INDEX IF NOT EXISTS places_location_idx ON public.places USING GIST (location);

-- 3. ITINERARIES Tablosuna Start Location ve Toplam Gün Eklemesi
ALTER TABLE public.itineraries ADD COLUMN IF NOT EXISTS start_location geography(POINT, 4326);
ALTER TABLE public.itineraries ADD COLUMN IF NOT EXISTS total_days INT DEFAULT 1;

-- 4. ITINERARY_DAYS (Gezi Günleri - Kümeleme için)
CREATE TABLE IF NOT EXISTS public.itinerary_days (
    id BIGSERIAL PRIMARY KEY,
    itinerary_id BIGINT NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
    day_index INT NOT NULL,
    date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ITINERARY_STOPS (Rota Durakları - Restoran, Kafe, Otel dahil)
CREATE TABLE IF NOT EXISTS public.itinerary_stops (
    id BIGSERIAL PRIMARY KEY,
    itinerary_day_id BIGINT NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
    stop_type TEXT NOT NULL DEFAULT 'place', -- 'place', 'hotel', 'restaurant', 'cafe'
    place_id BIGINT REFERENCES public.places(id) ON DELETE CASCADE,
    custom_name TEXT,
    location geography(POINT, 4326),
    sequence_order INT NOT NULL DEFAULT 0,
    arrival_time TIME,
    departure_time TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS itinerary_stops_location_idx ON public.itinerary_stops USING GIST (location);

-- ============================================================
-- Güvenlik (RLS) Ayarları
-- ============================================================
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_stops ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'itinerary_days' AND policyname = 'Users manage own itinerary days'
    ) THEN
        CREATE POLICY "Users manage own itinerary days"
            ON public.itinerary_days FOR ALL
            USING (itinerary_id IN (SELECT id FROM public.itineraries WHERE user_id = auth.uid()))
            WITH CHECK (itinerary_id IN (SELECT id FROM public.itineraries WHERE user_id = auth.uid()));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'itinerary_stops' AND policyname = 'Users manage own itinerary stops'
    ) THEN
        CREATE POLICY "Users manage own itinerary stops"
            ON public.itinerary_stops FOR ALL
            USING (itinerary_day_id IN (SELECT id FROM public.itinerary_days WHERE itinerary_id IN (SELECT id FROM public.itineraries WHERE user_id = auth.uid())))
            WITH CHECK (itinerary_day_id IN (SELECT id FROM public.itinerary_days WHERE itinerary_id IN (SELECT id FROM public.itineraries WHERE user_id = auth.uid())));
    END IF;
END $$;
