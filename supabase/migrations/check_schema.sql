-- =============================================
-- SmartTravelGuide — Tüm Tablo Şeması Kontrolü
-- Supabase Dashboard > SQL Editor'da çalıştırın
-- =============================================
-- Bu SQL'i çalıştırarak mevcut tablo yapısını görebilir,
-- hangi kolonların eksik olduğunu anlayabilirsiniz.

-- 1. places tablosu kolonları
SELECT 'places' AS tablo, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'places'
ORDER BY ordinal_position;

-- 2. itineraries tablosu kolonları
SELECT 'itineraries' AS tablo, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'itineraries'
ORDER BY ordinal_position;

-- 3. favorites tablosu var mı?
SELECT 'favorites' AS tablo, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'favorites'
ORDER BY ordinal_position;

-- 4. Foreign key uyuşmazlığını kontrol et
-- places.id tipi ile favorites.place_id tipinin eşleşmesi gerekir
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    c1.data_type AS column_type,
    c2.data_type AS foreign_column_type
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.columns c1
  ON c1.table_name = tc.table_name AND c1.column_name = kcu.column_name
JOIN information_schema.columns c2
  ON c2.table_name = ccu.table_name AND c2.column_name = ccu.column_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('favorites', 'itineraries', 'itinerary_items');
