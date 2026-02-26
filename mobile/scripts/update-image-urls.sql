-- ════════════════════════════════════════════════════
-- Wikipedia resim URL'lerini güncelle (500px thumbnails)
-- Bu SQL'i Supabase Dashboard → SQL Editor'da çalıştırın
-- ════════════════════════════════════════════════════

-- İstanbul
UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Hagia_Sophia_%28228968325%29.jpeg/500px-Hagia_Sophia_%28228968325%29.jpeg'
WHERE name = 'Ayasofya';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Topkap%C4%B1_-_01.jpg/500px-Topkap%C4%B1_-_01.jpg'
WHERE name = 'Topkapı Sarayı';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Sultan_Ahmed_Mosque_Istanbul_Turkey_retouched.jpg/500px-Sultan_Ahmed_Mosque_Istanbul_Turkey_retouched.jpg'
WHERE name = 'Sultanahmet Camii';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Istanbul_asv2021-11_img41_Grand_Bazaar.jpg/500px-Istanbul_asv2021-11_img41_Grand_Bazaar.jpg'
WHERE name = 'Kapalıçarşı';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/İstanbul_5765.jpg/500px-İstanbul_5765.jpg'
WHERE name = 'Galata Kulesi';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Dolmabah%C3%A7e_Palace%2C_Istanbul_cropped.jpg/500px-Dolmabah%C3%A7e_Palace%2C_Istanbul_cropped.jpg'
WHERE name = 'Dolmabahçe Sarayı';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Basilica_Cistern_2019.jpg/500px-Basilica_Cistern_2019.jpg'
WHERE name = 'Basilika Sarnıcı';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Istanbul_-_Museo_archeol._-_Foto_G._Dall%27Orto_28-5-2006_01.jpg/500px-Istanbul_-_Museo_archeol._-_Foto_G._Dall%27Orto_28-5-2006_01.jpg'
WHERE name = 'İstanbul Arkeoloji Müzesi';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Miniat%C3%BCrk_genel_g%C3%B6r%C3%BCn%C3%BCm.JPG/500px-Miniat%C3%BCrk_genel_g%C3%B6r%C3%BCn%C3%BCm.JPG'
WHERE name = 'Miniatürk';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Emirgan_Park_at_the_Istanbul_Tulip_Festival_2014.jpg/500px-Emirgan_Park_at_the_Istanbul_Tulip_Festival_2014.jpg'
WHERE name = 'Emirgan Korusu';

-- Konya
UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/MevlanaMuseum.jpg/500px-MevlanaMuseum.jpg'
WHERE name = 'Mevlana Müzesi';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Alaeddin_Mosque%2C_Konya_01.jpg/500px-Alaeddin_Mosque%2C_Konya_01.jpg'
WHERE name = 'Alaeddin Tepesi';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Konya_-_panoramio_-_HALUK_COMERTEL_%2825%29.jpg/500px-Konya_-_panoramio_-_HALUK_COMERTEL_%2825%29.jpg'
WHERE name = 'Karatay Medresesi';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Ince_Minareli_Medrese_01.jpg/500px-Ince_Minareli_Medrese_01.jpg'
WHERE name = 'İnce Minareli Medrese';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Sille%2C_Konya_Province_01.JPG/500px-Sille%2C_Konya_Province_01.JPG'
WHERE name = 'Sille Köyü';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Konya_Tropical_Butterfly_Garden_2.jpg/500px-Konya_Tropical_Butterfly_Garden_2.jpg'
WHERE name = 'Kelebek Bahçesi';

-- Antalya
UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Kaleici_Antalya3.JPG/500px-Kaleici_Antalya3.JPG'
WHERE name = 'Kaleiçi';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Antalya_-_D%C3%BCden_Wasserfall_16.jpg/500px-Antalya_-_D%C3%BCden_Wasserfall_16.jpg'
WHERE name = 'Düden Şelalesi';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Turkey-2622_%282216327975%29_%282%29.jpg/500px-Turkey-2622_%282216327975%29_%282%29.jpg'
WHERE name = 'Antalya Müzesi';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Konyaalti_Beach_Antalya.jpg/500px-Konyaalti_Beach_Antalya.jpg'
WHERE name = 'Konyaaltı Plajı';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Aspendos_amfiteatroa.jpg/500px-Aspendos_amfiteatroa.jpg'
WHERE name = 'Aspendos Antik Tiyatrosu';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Perge_Colonnaded_Street.jpg/500px-Perge_Colonnaded_Street.jpg'
WHERE name = 'Perge Antik Kenti';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Manavgat_waterfall_by_tomgensler.JPG/500px-Manavgat_waterfall_by_tomgensler.JPG'
WHERE name = 'Manavgat Şelalesi';

UPDATE places SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Olympos_1.JPG/500px-Olympos_1.JPG'
WHERE name = 'Olimpos';
