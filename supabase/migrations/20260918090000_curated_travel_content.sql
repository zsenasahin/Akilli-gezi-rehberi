-- Curated travel content. Static editorial knowledge belongs in these tables;
-- volatile venue availability and opening data can be refreshed independently.

-- `cities` ve `places` uygulamanın mevcut ana kayıtlarıdır. Bu alanlar, dış
-- kaynak anahtarlarını ve kaynak bilgisini ekler; eski kayıtları silmez.
ALTER TABLE public.cities
    ADD COLUMN IF NOT EXISTS content_key TEXT,
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS content_status TEXT NOT NULL DEFAULT 'draft';
CREATE UNIQUE INDEX IF NOT EXISTS cities_content_key_idx
    ON public.cities (content_key) WHERE content_key IS NOT NULL;

ALTER TABLE public.places
    ADD COLUMN IF NOT EXISTS external_key TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS content_status TEXT NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS places_external_key_idx
    ON public.places (external_key) WHERE external_key IS NOT NULL;

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cities' AND policyname = 'Published cities are readable') THEN
        CREATE POLICY "Published cities are readable" ON public.cities FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'places' AND policyname = 'Published places are readable') THEN
        CREATE POLICY "Published places are readable" ON public.places FOR SELECT USING (is_active);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.city_specialties (
    id BIGSERIAL PRIMARY KEY,
    city_id BIGINT NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('main_dish', 'dessert', 'drink', 'breakfast', 'snack')),
    meal_period TEXT CHECK (meal_period IN ('breakfast', 'lunch', 'dinner', 'break')),
    popularity_rank SMALLINT NOT NULL DEFAULT 100 CHECK (popularity_rank > 0),
    short_description TEXT,
    source_url TEXT,
    last_verified_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (city_id, name)
);

CREATE TABLE IF NOT EXISTS public.venues (
    id BIGSERIAL PRIMARY KEY,
    city_id BIGINT NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    venue_type TEXT NOT NULL CHECK (venue_type IN ('restaurant', 'cafe', 'bakery', 'market')),
    location geography(POINT, 4326),
    address TEXT,
    price_band SMALLINT CHECK (price_band BETWEEN 1 AND 4),
    website_url TEXT,
    source_url TEXT,
    last_verified_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (city_id, name)
);
CREATE INDEX IF NOT EXISTS venues_location_idx ON public.venues USING GIST (location);

CREATE TABLE IF NOT EXISTS public.venue_specialties (
    venue_id BIGINT NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    specialty_id BIGINT NOT NULL REFERENCES public.city_specialties(id) ON DELETE CASCADE,
    is_signature_item BOOLEAN NOT NULL DEFAULT false,
    source_url TEXT,
    last_verified_at TIMESTAMPTZ,
    PRIMARY KEY (venue_id, specialty_id)
);

CREATE TABLE IF NOT EXISTS public.route_templates (
    id BIGSERIAL PRIMARY KEY,
    city_id BIGINT NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    days SMALLINT NOT NULL DEFAULT 1 CHECK (days > 0),
    theme TEXT,
    summary TEXT,
    popularity_rank SMALLINT NOT NULL DEFAULT 100 CHECK (popularity_rank > 0),
    source_url TEXT,
    last_verified_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (city_id, name, days)
);

CREATE TABLE IF NOT EXISTS public.route_template_stops (
    id BIGSERIAL PRIMARY KEY,
    route_template_id BIGINT NOT NULL REFERENCES public.route_templates(id) ON DELETE CASCADE,
    place_id BIGINT NOT NULL REFERENCES public.places(id) ON DELETE RESTRICT,
    sequence_no SMALLINT NOT NULL CHECK (sequence_no > 0),
    planned_duration_minutes SMALLINT NOT NULL CHECK (planned_duration_minutes > 0),
    travel_buffer_minutes SMALLINT NOT NULL DEFAULT 15 CHECK (travel_buffer_minutes >= 0),
    recommended_meal_period TEXT CHECK (recommended_meal_period IN ('breakfast', 'lunch', 'dinner', 'break')),
    notes TEXT,
    UNIQUE (route_template_id, sequence_no),
    UNIQUE (route_template_id, place_id)
);

CREATE INDEX IF NOT EXISTS city_specialties_city_rank_idx ON public.city_specialties (city_id, popularity_rank) WHERE is_active;
CREATE INDEX IF NOT EXISTS route_templates_city_rank_idx ON public.route_templates (city_id, days, popularity_rank) WHERE is_active;

ALTER TABLE public.city_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_template_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published city specialties are readable" ON public.city_specialties FOR SELECT USING (is_active);
CREATE POLICY "Published venues are readable" ON public.venues FOR SELECT USING (is_active);
CREATE POLICY "Published venue specialties are readable" ON public.venue_specialties FOR SELECT USING (true);
CREATE POLICY "Published route templates are readable" ON public.route_templates FOR SELECT USING (is_active);
CREATE POLICY "Published route template stops are readable" ON public.route_template_stops FOR SELECT USING (true);
