-- =============================================
-- itineraries tablosuna start_date kolonu ekle
-- Supabase Dashboard > SQL Editor'da çalıştırın
-- =============================================

ALTER TABLE public.itineraries
    ADD COLUMN IF NOT EXISTS start_date DATE;
