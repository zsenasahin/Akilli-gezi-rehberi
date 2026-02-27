-- =============================================
-- SmartTravelGuide — Eksik Tablolar
-- Supabase Dashboard > SQL Editor'da çalıştırın
-- =============================================

-- 1. FAVORITES tablosu (favoriler için)
CREATE TABLE IF NOT EXISTS public.favorites (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    place_id    BIGINT NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, place_id)
);

-- Row-Level Security
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Kullanıcı sadece kendi favorilerini görebilir
CREATE POLICY "favorites_select" ON public.favorites
    FOR SELECT USING (auth.uid() = user_id);

-- Kullanıcı kendi favorisini ekleyebilir
CREATE POLICY "favorites_insert" ON public.favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Kullanıcı kendi favorisini silebilir
CREATE POLICY "favorites_delete" ON public.favorites
    FOR DELETE USING (auth.uid() = user_id);


-- =============================================
-- 2. İTİNERARY tablosu — eksik kolonlar kontrolü
-- (eğer zaten varsa ve sadece kolon eksikse)
-- =============================================

-- Eğer has_accommodation kolonu yoksa:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='itineraries' AND column_name='has_accommodation'
    ) THEN
        ALTER TABLE public.itineraries ADD COLUMN has_accommodation BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Eğer has_transport kolonu yoksa:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='itineraries' AND column_name='has_transport'
    ) THEN
        ALTER TABLE public.itineraries ADD COLUMN has_transport BOOLEAN DEFAULT false;
    END IF;
END $$;
