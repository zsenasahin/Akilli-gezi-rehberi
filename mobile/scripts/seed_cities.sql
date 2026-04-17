-- ═══════════════════════════════════════════════════════════════
-- Türkiye'nin 81 İli — Supabase SQL Editor'de çalıştırın
-- ═══════════════════════════════════════════════════════════════
-- Bu SQL, cities tablosunda eksik olan şehirleri ekler.
-- Zaten mevcut olanları atlar (ON CONFLICT ile).

INSERT INTO cities (name, region) VALUES
-- MARMARA
('Bursa', 'Marmara'),
('Kocaeli', 'Marmara'),
('Sakarya', 'Marmara'),
('Tekirdağ', 'Marmara'),
('Edirne', 'Marmara'),
('Kırklareli', 'Marmara'),
('Çanakkale', 'Marmara'),
('Balıkesir', 'Marmara'),
('Yalova', 'Marmara'),
('Bilecik', 'Marmara'),
-- EGE
('İzmir', 'Ege'),
('Manisa', 'Ege'),
('Aydın', 'Ege'),
('Denizli', 'Ege'),
('Muğla', 'Ege'),
('Uşak', 'Ege'),
('Afyonkarahisar', 'Ege'),
('Kütahya', 'Ege'),
-- İÇ ANADOLU
('Ankara', 'İç Anadolu'),
('Kayseri', 'İç Anadolu'),
('Sivas', 'İç Anadolu'),
('Yozgat', 'İç Anadolu'),
('Kırıkkale', 'İç Anadolu'),
('Aksaray', 'İç Anadolu'),
('Niğde', 'İç Anadolu'),
('Nevşehir', 'İç Anadolu'),
('Kırşehir', 'İç Anadolu'),
('Eskişehir', 'İç Anadolu'),
('Çankırı', 'İç Anadolu'),
('Karaman', 'İç Anadolu'),
-- KARADENİZ
('Trabzon', 'Karadeniz'),
('Samsun', 'Karadeniz'),
('Ordu', 'Karadeniz'),
('Giresun', 'Karadeniz'),
('Rize', 'Karadeniz'),
('Artvin', 'Karadeniz'),
('Gümüşhane', 'Karadeniz'),
('Bayburt', 'Karadeniz'),
('Amasya', 'Karadeniz'),
('Tokat', 'Karadeniz'),
('Sinop', 'Karadeniz'),
('Bartın', 'Karadeniz'),
('Karabük', 'Karadeniz'),
('Zonguldak', 'Karadeniz'),
('Bolu', 'Karadeniz'),
('Düzce', 'Karadeniz'),
('Kastamonu', 'Karadeniz'),
-- AKDENİZ
('Mersin', 'Akdeniz'),
('Adana', 'Akdeniz'),
('Hatay', 'Akdeniz'),
('Osmaniye', 'Akdeniz'),
('Kahramanmaraş', 'Akdeniz'),
('Isparta', 'Akdeniz'),
('Burdur', 'Akdeniz'),
-- DOĞU ANADOLU
('Erzurum', 'Doğu Anadolu'),
('Van', 'Doğu Anadolu'),
('Erzincan', 'Doğu Anadolu'),
('Malatya', 'Doğu Anadolu'),
('Elazığ', 'Doğu Anadolu'),
('Tunceli', 'Doğu Anadolu'),
('Bingöl', 'Doğu Anadolu'),
('Muş', 'Doğu Anadolu'),
('Bitlis', 'Doğu Anadolu'),
('Hakkari', 'Doğu Anadolu'),
('Ağrı', 'Doğu Anadolu'),
('Kars', 'Doğu Anadolu'),
('Iğdır', 'Doğu Anadolu'),
('Ardahan', 'Doğu Anadolu'),
-- GÜNEYDOĞU ANADOLU
('Gaziantep', 'Güneydoğu Anadolu'),
('Şanlıurfa', 'Güneydoğu Anadolu'),
('Diyarbakır', 'Güneydoğu Anadolu'),
('Mardin', 'Güneydoğu Anadolu'),
('Batman', 'Güneydoğu Anadolu'),
('Siirt', 'Güneydoğu Anadolu'),
('Şırnak', 'Güneydoğu Anadolu'),
('Adıyaman', 'Güneydoğu Anadolu'),
('Kilis', 'Güneydoğu Anadolu')
ON CONFLICT (name) DO NOTHING;

-- Sonucu kontrol et
SELECT COUNT(*) as total_cities FROM cities;
