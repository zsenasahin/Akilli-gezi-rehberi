-- ═══════════════════════════════════════════════
-- Smart Travel Guide – Supabase Database Schema v2
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- ────────────────────────────────────
-- 1. Cities
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS cities (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL
);

-- ────────────────────────────────────
-- 2. Places (expanded)
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS places (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,                        -- full description
  short_description TEXT,                  -- card preview text
  category TEXT NOT NULL,                  -- 'museum', 'nature', 'artificial', 'historical', 'food', 'shopping', 'beach', 'religious'
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  avg_duration INTEGER NOT NULL DEFAULT 1, -- hours
  entry_fee NUMERIC NOT NULL DEFAULT 0,
  popularity_score INTEGER NOT NULL DEFAULT 50,
  image_url TEXT,                           -- URL to place image
  source TEXT DEFAULT 'manual'              -- 'osm', 'wikipedia', 'manual'
);

-- ────────────────────────────────────
-- 3. Profiles (linked to Supabase Auth)
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  travel_style TEXT DEFAULT 'relaxed', -- 'relaxed', 'intense', 'family', 'photo-focused'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────
-- 4. Favorites
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_id BIGINT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, place_id) -- prevent duplicate favorites
);

-- ────────────────────────────────────
-- 5. Itineraries (expanded)
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS itineraries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  days INTEGER NOT NULL,
  has_accommodation BOOLEAN DEFAULT false,
  has_transport BOOLEAN DEFAULT false,
  start_location_lat DOUBLE PRECISION,
  start_location_lng DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'ongoing', -- 'ongoing', 'completed'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────
-- 6. Itinerary Items
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS itinerary_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  itinerary_id BIGINT NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  place_id BIGINT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false
);


-- ═══════════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════════

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;

-- Cities: Everyone can read
CREATE POLICY "Cities are viewable by everyone"
  ON cities FOR SELECT
  USING (true);

-- Places: Everyone can read
CREATE POLICY "Places are viewable by everyone"
  ON places FOR SELECT
  USING (true);

-- Profiles: Users manage their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Favorites: Users manage their own favorites
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Itineraries: Users manage their own itineraries
CREATE POLICY "Users can view own itineraries"
  ON itineraries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own itineraries"
  ON itineraries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own itineraries"
  ON itineraries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own itineraries"
  ON itineraries FOR DELETE
  USING (auth.uid() = user_id);

-- Itinerary Items: Users manage items in their own itineraries
CREATE POLICY "Users can view own itinerary items"
  ON itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_items.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own itinerary items"
  ON itinerary_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_items.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own itinerary items"
  ON itinerary_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_items.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own itinerary items"
  ON itinerary_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_items.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════
-- Indexes for performance
-- ═══════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_places_city_id ON places(city_id);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_popularity ON places(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_place_id ON favorites(place_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_itinerary_id ON itinerary_items(itinerary_id);


-- ═══════════════════════════════════════════════
-- Seed Data
-- ═══════════════════════════════════════════════

INSERT INTO cities (name, region) VALUES
  ('İstanbul', 'Marmara'),
  ('Konya', 'İç Anadolu'),
  ('Antalya', 'Akdeniz');

-- İstanbul places (with descriptions & image_url)
INSERT INTO places (city_id, name, short_description, description, category, avg_duration, entry_fee, lat, lng, popularity_score, image_url, source) VALUES
  (1, 'Ayasofya', 'Bizans döneminden kalma ikonik yapı', 'M.S. 537 yılında İmparator Justinianus tarafından inşa ettirilen Ayasofya, yaklaşık 1.500 yıllık tarihiyle İstanbul''un en önemli simgelerinden biridir. Bazilika, cami ve müze olarak hizmet vermiş olan yapı, devasa kubbesi ve muhteşem mozaikleriyle mimarlık tarihinin başyapıtları arasında yer alır.', 'historical', 2, 0, 41.0086, 28.9802, 95, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Hagia_Sophia_Mars_2013.jpg/1280px-Hagia_Sophia_Mars_2013.jpg', 'wikipedia'),
  (1, 'Topkapı Sarayı', 'Osmanlı İmparatorluğu''nun yönetim merkezi', '15. yüzyıldan 19. yüzyıla kadar Osmanlı padişahlarının yaşadığı ve devleti yönettiği saray kompleksi. Harem, hazine odaları, kutsal emanetler ve Boğaz manzaralı bahçeleriyle ünlüdür. Bugün müze olarak ziyarete açıktır.', 'museum', 3, 320, 41.0115, 28.9833, 92, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Topkapi_Palace_Seen_From_Haliç.JPG/1280px-Topkapi_Palace_Seen_From_Haliç.JPG', 'wikipedia'),
  (1, 'Sultanahmet Camii', 'Altı minaresiyle ünlü tarihi cami', '17. yüzyılda Sultan I. Ahmed tarafından yaptırılan cami, iç mekanındaki 20.000''den fazla İznik çinisi nedeniyle "Blue Mosque" olarak da bilinir. Altı minareli nadir camilerden biridir ve Ayasofya''nın karşısında yer alır.', 'religious', 1, 0, 41.0054, 28.9768, 90, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Sultan_Ahmed_Mosque_Istanbul_Turkey_retouched.jpg/1280px-Sultan_Ahmed_Mosque_Istanbul_Turkey_retouched.jpg', 'wikipedia'),
  (1, 'Kapalıçarşı', 'Dünyanın en eski ve büyük kapalı çarşılarından', '1461 yılında kurulan Kapalıçarşı, 4.000''den fazla dükkânıyla dünyanın en büyük ve en eski kapalı çarşılarından biridir. Kuyumcular, halıcılar, baharatçılar ve hediyelik eşya satıcılarıyla dolu labirent gibi sokakları keşfetmeye değer.', 'shopping', 2, 0, 41.0108, 28.9680, 88, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Grand-Bazaar_Shop.jpg/1280px-Grand-Bazaar_Shop.jpg', 'wikipedia'),
  (1, 'Galata Kulesi', 'İstanbul''un panoramik manzarasını sunan kule', '1348 yılında Cenevizliler tarafından inşa edilen kule, 67 metre yüksekliğiyle Haliç ve İstanbul''un tarihi yarımadasının nefes kesen panoramik manzarasını sunar. Terasından izlenen gün batımı unutulmazdır.', 'historical', 1, 130, 41.0256, 28.9741, 85, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Galata_Tower_%282%29.jpg/800px-Galata_Tower_%282%29.jpg', 'wikipedia'),
  (1, 'Dolmabahçe Sarayı', 'Son Osmanlı padişahlarının yaşadığı saray', '1856 yılında Sultan Abdülmecid döneminde tamamlanan saray, Avrupa mimarisinden esinlenen görkemli yapısıyla Boğaz kıyısında yer alır. Dünyanın en büyük Bohemya kristal avizesi burada bulunur. Atatürk''ün son günlerini geçirdiği yerdir.', 'museum', 2, 300, 41.0392, 29.0005, 83, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Dolmabahce_Palace.jpg/1280px-Dolmabahce_Palace.jpg', 'wikipedia'),
  (1, 'Basilika Sarnıcı', 'Bizans döneminden yeraltı su deposu', 'M.S. 532 yılında İmparator Justinianus tarafından yaptırılan bu yeraltı sarnıcı, 336 mermer sütun üzerine inşa edilmiştir. Karanlık atmosferi, su üzerinde yansıyan ışıkları ve ünlü Medusa başlı sütunlarıyla büyüleyici bir deneyim sunar.', 'historical', 1, 190, 41.0084, 28.9779, 80, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Basilica_Cistern_2019.jpg/1280px-Basilica_Cistern_2019.jpg', 'wikipedia'),
  (1, 'İstanbul Arkeoloji Müzesi', 'Antik dönem eserlerin sergilendiği müze', 'Osmanlı İmparatorluğu döneminde kurulan müze, üç ana binadan oluşur ve bir milyondan fazla eser barındırır. İskender Lahiti, Kadesh Antlaşması tableti ve antik çağ heykelleri en dikkat çekici eserleri arasındadır.', 'museum', 2, 100, 41.0117, 28.9818, 75, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Istanbul_-_Museo_archeol._-_Foto_G._Dall%27Orto_28-5-2006_01.jpg/1280px-Istanbul_-_Museo_archeol._-_Foto_G._Dall%27Orto_28-5-2006_01.jpg', 'wikipedia'),
  (1, 'Miniatürk', 'Türkiye''nin minyatür modelleri parkı', 'İstanbul''un Sütlüce semtinde yer alan açık hava müzesi, Türkiye ve eski Osmanlı coğrafyasındaki 135 önemli yapının 1/25 ölçekli maketlerini sergiler. Aileler ve çocuklar için ideal bir gezi noktasıdır.', 'museum', 2, 60, 41.0624, 28.9488, 70, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Miniaturk_009.jpg/1280px-Miniaturk_009.jpg', 'wikipedia'),
  (1, 'Emirgan Korusu', 'Boğaz manzaralı tarihi park', 'İstanbul Boğazı''nın kıyısında yer alan 47 hektarlık park, özellikle Nisan ayındaki lale festivaliyle ünlüdür. Üç tarihi köşk, yürüyüş parkurları ve piknik alanlarıyla şehrin en güzel yeşil alanlarından biridir.', 'nature', 2, 0, 41.1072, 29.0543, 68, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Emirgan_Park_at_the_Istanbul_Tulip_Festival_2014.jpg/1280px-Emirgan_Park_at_the_Istanbul_Tulip_Festival_2014.jpg', 'wikipedia');

-- Konya places (with descriptions & image_url)
INSERT INTO places (city_id, name, short_description, description, category, avg_duration, entry_fee, lat, lng, popularity_score, image_url, source) VALUES
  (2, 'Mevlana Müzesi', 'Mevlana Celaleddin Rumi''nin türbesi', 'Hz. Mevlana Celaleddin Rumi''nin türbesinin bulunduğu bu müze, yeşil kubbesiyle Konya''nın simgesi haline gelmiştir. Yıllık 3 milyondan fazla ziyaretçisiyle Türkiye''nin en çok ziyaret edilen müzelerinden biridir. Mevlevi dervişlerin kullandığı eşyalar, el yazması eserler ve tasavvuf kültürüne ait objeler sergilenmektedir.', 'museum', 2, 0, 37.8714, 32.5045, 95, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Mausoleum_of_Mevlana%2C_Konya.jpg/1280px-Mausoleum_of_Mevlana%2C_Konya.jpg', 'wikipedia'),
  (2, 'Alaeddin Tepesi', 'Selçuklu dönemine ait tarihi tepe', 'Konya''nın merkezinde yer alan bu tepe, Selçuklu Sultanları''nın sarayının bulunduğu yerdir. Alaeddin Camii ve tarihi kalıntılarıyla önemli bir arkeolojik alandır. Günümüzde halkın dinlenme alanı olarak kullanılan tepeden şehrin panoramik manzarası izlenebilir.', 'historical', 1, 0, 37.8747, 32.4932, 80, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Alaeddin_Mosque%2C_Konya_01.jpg/1280px-Alaeddin_Mosque%2C_Konya_01.jpg', 'wikipedia'),
  (2, 'Karatay Medresesi', 'Selçuklu çini sanatının en güzel örnekleri', '1251 yılında Selçuklu veziri Celaleddin Karatay tarafından yaptırılan medrese, günümüzde Çini Eserler Müzesi olarak hizmet vermektedir. Kubbe iç yüzeyindeki mavi-beyaz çini süslemeler Selçuklu sanatının en etkileyici örneklerindendir.', 'museum', 1, 30, 37.8738, 32.4968, 75, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Karatay_medrese_Konya_2013_1.jpg/1024px-Karatay_medrese_Konya_2013_1.jpg', 'wikipedia'),
  (2, 'İnce Minareli Medrese', 'Selçuklu taş işçiliğinin başyapıtı', '1279 yılında inşa edilen medrese, görkemli taş işlemeli portalı ve ince minaresiyle dikkat çeker. Günümüzde Taş ve Ahşap Eserler Müzesi olarak kullanılmaktadır. Selçuklu dönemine ait taş ve ahşap eserler sergilenmektedir.', 'museum', 1, 30, 37.8762, 32.4930, 72, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Ince_Minare_Medresesi%2C_Konya%2C_Turkey.jpg/800px-Ince_Minare_Medresesi%2C_Konya%2C_Turkey.jpg', 'wikipedia'),
  (2, 'Sille Köyü', 'Antik dönemden kalma tarihi köy', 'Konya''ya 8 km uzaklıktaki bu antik yerleşim, Roma, Bizans ve Osmanlı dönemlerinden kalma yapılarıyla bir açık hava müzesi gibidir. Aya Eleni Kilisesi, tarihi evleri ve geleneksel el sanatları atölyeleriyle huzurlu bir gün gezisi için idealdir.', 'nature', 3, 0, 37.9103, 32.4311, 70, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Sille%2C_Konya_Province_01.JPG/1280px-Sille%2C_Konya_Province_01.JPG', 'wikipedia'),
  (2, 'Kelebek Bahçesi', 'Tropikal kelebeklerle dolu bahçe', 'Konya''nın en farklı doğa deneyimlerinden birini sunan Tropikal Kelebek Bahçesi, yüzlerce kelebek türünü barındıran cam sera içinde yer alır. Özellikle aileler ve doğa severlerin ilgisini çeken interaktif bir mekan.', 'nature', 1, 60, 37.8960, 32.5530, 65, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Konya_Tropical_Butterfly_Garden_2.jpg/1280px-Konya_Tropical_Butterfly_Garden_2.jpg', 'wikipedia');

-- Antalya places (with descriptions & image_url)
INSERT INTO places (city_id, name, short_description, description, category, avg_duration, entry_fee, lat, lng, popularity_score, image_url, source) VALUES
  (3, 'Kaleiçi', 'Antalya''nın tarihi kalbi', 'Roma, Bizans, Selçuklu ve Osmanlı dönemlerinden kalma tarihi yapılarla çevrili Kaleiçi, Antalya''nın eski şehir merkezidir. Dar sokakları, restore edilmiş Osmanlı evleri, butik otelleri ve canlı kafelerle dolu bu bölge, Hadrian Kapısı ve Yivli Minare gibi önemli tarihi yapıları barındırır.', 'historical', 2, 0, 36.8841, 30.7056, 93, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Kaleici_Antalya3.JPG/1280px-Kaleici_Antalya3.JPG', 'wikipedia'),
  (3, 'Düden Şelalesi', 'Antalya''nın doğal güzelliği', 'İki farklı noktada görülebilen Düden Şelalesi, hem Üst Düden''deki park alanında hem de denize dökülen Alt Düden kısmında ziyaret edilebilir. Özellikle Alt Düden, kayalıklardan Akdeniz''e dökülen muhteşem manzarasıyla fotoğraf tutkunlarının vazgeçilmez duraklarından biridir.', 'nature', 1, 0, 36.8631, 30.7423, 90, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Düden_Waterfall%2C_Antalya%2C_Turkey_-_panoramio.jpg/1280px-Düden_Waterfall%2C_Antalya%2C_Turkey_-_panoramio.jpg', 'wikipedia'),
  (3, 'Antalya Müzesi', 'Akdeniz bölgesinin en zengin müzesi', 'Türkiye''nin en büyük müzelerinden biri olan Antalya Müzesi, 13 sergi salonunda antik dönemden kalan heykeller, mozaikler, sikkeler ve takılar sergiler. Perge, Aspendos ve Side kazılarından çıkarılan eserlerin önemli bir bölümü burada yer alır.', 'museum', 2, 90, 36.8855, 30.6796, 85, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Antalya_Museum.jpg/1280px-Antalya_Museum.jpg', 'wikipedia'),
  (3, 'Konyaaltı Plajı', 'Antalya''nın ünlü sahil şeridi', 'Beydağları''nın eteklerinden Akdeniz kıyısına uzanan 7 km''lik çakıltaşı plaj, berrak turkuaz suları ve arkasındaki dağ manzarasıyla ünlüdür. Sahil boyunca kafeler, restoranlar ve su sporları tesisleri bulunur. Mavi bayraklı plaj, yüzme ve güneşlenme için idealdir.', 'beach', 3, 0, 36.8685, 30.6354, 88, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Konyaalti_Beach_Antalya.jpg/1280px-Konyaalti_Beach_Antalya.jpg', 'wikipedia'),
  (3, 'Aspendos Antik Tiyatrosu', 'Dünyanın en iyi korunmuş Roma tiyatrosu', 'M.S. 2. yüzyılda inşa edilen ve 15.000 kişi kapasiteli bu antik tiyatro, akustiğiyle dünya çapında ünlüdür. Hâlâ konser ve opera performanslarına ev sahipliği yapmaktadır. Roma dönemi mühendisliğinin en etkileyici örneklerinden biridir.', 'historical', 2, 90, 36.9389, 31.1721, 82, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Aspendos_amfiteatroa.jpg/1280px-Aspendos_amfiteatroa.jpg', 'wikipedia'),
  (3, 'Perge Antik Kenti', 'Pamfilya''nın önemli antik kenti', 'Antalya''ya 17 km mesafedeki Perge, Pamfilya bölgesinin en önemli şehirlerinden biriydi. Roma döneminden kalma stadyum, tiyatro, agora ve sütunlu cadde kalıntıları görülebilir. İskender''in Anadolu seferinde uğradığı kentlerden biridir.', 'historical', 2, 90, 36.9606, 30.8539, 78, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Perge_Colonnaded_Street.jpg/1280px-Perge_Colonnaded_Street.jpg', 'wikipedia'),
  (3, 'Manavgat Şelalesi', 'Doğal güzellikleri ile ünlü şelale', 'Manavgat Çayı üzerindeki geniş ve alçak şelale, çevresindeki piknik alanları ve restoranlarıyla popüler bir günübirlik gezi noktasıdır. Turkuaz renkli suyun beyaz kayalar üzerinden akışı fotoğrafçılar için mükemmel kareler sunar.', 'nature', 1, 10, 36.8128, 31.4481, 75, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Manavgat_Waterfall.jpg/1280px-Manavgat_Waterfall.jpg', 'wikipedia'),
  (3, 'Olimpos', 'Antik kent ve doğa cenneti', 'Likya birliğinin altı büyük kentinden biri olan Olimpos, yemyeşil doğası içinde antik kalıntıları barındırır. Yakınındaki Çıralı plajı ve Yanartaş (Chimera) doğal alevleriyle birlikte değerlendirildiğinde Antalya''nın en eşsiz deneyimlerinden birini sunar.', 'nature', 3, 70, 36.3958, 30.4731, 73, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Olympos_1.JPG/1280px-Olympos_1.JPG', 'wikipedia');
