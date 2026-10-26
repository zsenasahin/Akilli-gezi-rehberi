-- ============================================================
-- Güvenlik sıkılaştırma + şehir görselleri + turizm aktiviteleri
-- Supabase Dashboard → SQL Editor'da veya `supabase db push` ile çalıştırın.
-- Tekrar çalıştırılabilir (idempotent).
-- ============================================================

-- ─── 1. api_cache: herkese açık yazma/silme kapatılır ────────────────────────
-- Eski politika `FOR ALL USING (true)` olduğu için anon anahtarı olan herkes
-- (anon anahtar APK içinde bulunur) önbelleği okuyup değiştirebiliyordu; bu da
-- uygulamada gösterilen restoran/otel verisinin zehirlenmesine izin veriyordu.
-- Edge Function'lar service_role ile çalışır ve RLS'i zaten atlar; bu yüzden
-- istemci rolleri için hiçbir politikaya gerek yoktur.
DROP POLICY IF EXISTS "Service role full access on api_cache" ON public.api_cache;
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_cache FROM anon, authenticated;

-- ─── 2. İçerik tabloları: istemci yalnızca okuyabilir ───────────────────────
REVOKE INSERT, UPDATE, DELETE ON public.cities FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.places FROM anon, authenticated;
DO $$
BEGIN
    IF to_regclass('public.city_specialties') IS NOT NULL THEN
        EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.city_specialties FROM anon, authenticated';
    END IF;
    IF to_regclass('public.venues') IS NOT NULL THEN
        EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.venues FROM anon, authenticated';
    END IF;
END $$;

-- ─── 3. Şehir görselleri ──────────────────────────────────────────────────────
-- Kart ve kapak görselleri DB'de tutulur; uygulama boşsa yerel veriye düşer.
ALTER TABLE public.cities
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
    ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ─── 4. Turizm aktiviteleri (Kültür Portalı, 81 il) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.tourism_activities (
    id BIGSERIAL PRIMARY KEY,
    city_id BIGINT REFERENCES public.cities(id) ON DELETE CASCADE,
    city_slug TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    title TEXT NOT NULL,
    image_url TEXT,
    source_url TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tourism_activities_city_idx ON public.tourism_activities (city_id);

ALTER TABLE public.tourism_activities ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.tourism_activities FROM anon, authenticated;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tourism_activities' AND policyname = 'Active activities are readable') THEN
        CREATE POLICY "Active activities are readable" ON public.tourism_activities FOR SELECT USING (is_active);
    END IF;
END $$;
