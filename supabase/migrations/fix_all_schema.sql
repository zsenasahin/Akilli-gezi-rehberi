-- ============================================================
-- SmartTravelGuide — TAM ŞEMA ONARIMI
-- Supabase Dashboard > SQL Editor'da bir kez çalıştırın.
-- Güvenli: IF NOT EXISTS kontrolleri ile mevcut verilere dokunmaz.
-- ============================================================


-- ─────────────────────────────────────────
-- 1. places — eksik kolonlar
-- ─────────────────────────────────────────
ALTER TABLE public.places
    ADD COLUMN IF NOT EXISTS short_description TEXT,
    ADD COLUMN IF NOT EXISTS image_url         TEXT;


-- ─────────────────────────────────────────
-- 2. itineraries — eksik kolonlar
-- ─────────────────────────────────────────
ALTER TABLE public.itineraries
    ADD COLUMN IF NOT EXISTS status             TEXT    NOT NULL DEFAULT 'ongoing',
    ADD COLUMN IF NOT EXISTS has_accommodation  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS has_transport      BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS start_location_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS start_location_lng DOUBLE PRECISION;

-- status sadece geçerli değerleri kabul etsin (isteğe bağlı ama önerilir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'itineraries_status_check'
    ) THEN
        ALTER TABLE public.itineraries
            ADD CONSTRAINT itineraries_status_check
            CHECK (status IN ('ongoing', 'completed', 'cancelled'));
    END IF;
END $$;


-- ─────────────────────────────────────────
-- 3. itinerary_items — tablo yoksa oluştur
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.itinerary_items (
    id            BIGSERIAL PRIMARY KEY,
    itinerary_id  BIGINT  NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
    place_id      BIGINT  NOT NULL REFERENCES public.places(id)      ON DELETE CASCADE,
    day_number    INT     NOT NULL DEFAULT 1,
    order_index   INT     NOT NULL DEFAULT 0,
    is_completed  BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi itinerary'sine ait item'lara erişebilir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'itinerary_items' AND policyname = 'Users manage own itinerary items'
    ) THEN
        CREATE POLICY "Users manage own itinerary items"
        ON public.itinerary_items
        FOR ALL
        USING (
            itinerary_id IN (
                SELECT id FROM public.itineraries WHERE user_id = auth.uid()
            )
        )
        WITH CHECK (
            itinerary_id IN (
                SELECT id FROM public.itineraries WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;


-- ─────────────────────────────────────────
-- 4. favorites — RLS politikası yoksa ekle
-- ─────────────────────────────────────────
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'favorites' AND policyname = 'Users manage own favorites'
    ) THEN
        CREATE POLICY "Users manage own favorites"
        ON public.favorites
        FOR ALL
        USING  (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;


-- ─────────────────────────────────────────
-- 5. itineraries — RLS politikası yoksa ekle
-- ─────────────────────────────────────────
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'itineraries' AND policyname = 'Users manage own itineraries'
    ) THEN
        CREATE POLICY "Users manage own itineraries"
        ON public.itineraries
        FOR ALL
        USING  (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;


-- ─────────────────────────────────────────
-- 6. Sonucu doğrula
-- ─────────────────────────────────────────
SELECT table_name, column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('places', 'itineraries', 'itinerary_items', 'favorites')
ORDER BY table_name, ordinal_position;
