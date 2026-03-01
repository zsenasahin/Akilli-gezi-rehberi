-- =============================================
-- SmartTravelGuide — itineraries tablosu eksik kolonlar
-- Supabase Dashboard > SQL Editor'da çalıştırın
-- =============================================

-- has_accommodation kolonu
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='itineraries' AND column_name='has_accommodation'
    ) THEN
        ALTER TABLE public.itineraries ADD COLUMN has_accommodation BOOLEAN DEFAULT false;
        RAISE NOTICE 'has_accommodation kolonu eklendi';
    ELSE
        RAISE NOTICE 'has_accommodation kolonu zaten mevcut';
    END IF;
END $$;

-- has_transport kolonu
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='itineraries' AND column_name='has_transport'
    ) THEN
        ALTER TABLE public.itineraries ADD COLUMN has_transport BOOLEAN DEFAULT false;
        RAISE NOTICE 'has_transport kolonu eklendi';
    ELSE
        RAISE NOTICE 'has_transport kolonu zaten mevcut';
    END IF;
END $$;

-- start_location_lat kolonu
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='itineraries' AND column_name='start_location_lat'
    ) THEN
        ALTER TABLE public.itineraries ADD COLUMN start_location_lat DOUBLE PRECISION;
        RAISE NOTICE 'start_location_lat kolonu eklendi';
    ELSE
        RAISE NOTICE 'start_location_lat kolonu zaten mevcut';
    END IF;
END $$;

-- start_location_lng kolonu
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='itineraries' AND column_name='start_location_lng'
    ) THEN
        ALTER TABLE public.itineraries ADD COLUMN start_location_lng DOUBLE PRECISION;
        RAISE NOTICE 'start_location_lng kolonu eklendi';
    ELSE
        RAISE NOTICE 'start_location_lng kolonu zaten mevcut';
    END IF;
END $$;

-- Mevcut kolonları doğrula
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'itineraries'
ORDER BY ordinal_position;
