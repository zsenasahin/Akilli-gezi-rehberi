-- ═══════════════════════════════════════════════════════════
-- API Cache Tablosu — Overpass/ORS sonuçlarını 24 saat cache'ler
-- ═══════════════════════════════════════════════════════════

-- Bu SQL'i Supabase Dashboard → SQL Editor'da çalıştırın

CREATE TABLE IF NOT EXISTS api_cache (
    id SERIAL PRIMARY KEY,
    cache_key TEXT UNIQUE NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);

-- Otomatik TTL temizliği (opsiyonel — 24 saatten eski kayıtları siler)
-- Bu SQL'i her gün çalıştırmak için Supabase'de bir cron job ekleyebilirsiniz:
-- DELETE FROM api_cache WHERE created_at < NOW() - INTERVAL '24 hours';

-- RLS Policy — Edge Functions service role ile erişsin
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

-- Service role full erişim (Edge Functions için)
CREATE POLICY "Service role full access on api_cache"
    ON api_cache
    FOR ALL
    USING (true)
    WITH CHECK (true);
