# Akıllı Gezi Rehberi — Product Requirements Document

**Versiyon:** 1.0  
**Tarih:** Nisan 2026  
**Platform:** React Native (Expo) — iOS & Android

---

## 1. Ürün Özeti

**Akıllı Gezi Rehberi**, Türkiye'yi keşfetmek isteyen gezginler için tasarlanmış, yapay zeka destekli bir mobil seyahat uygulamasıdır. Kullanıcılar şehirleri keşfedebilir, gezilecek yerleri inceleyebilir, kişiselleştirilmiş gezi planları oluşturabilir ve AI destekli bir asistandan anlık rehberlik alabilir.

Uygulama, Türkiye'nin 81 ilini kapsayan kapsamlı bir içerik veritabanı, OpenStreetMap (Overpass API) entegrasyonu ve Supabase altyapısı üzerine inşa edilmiştir.

---

## 2. Hedef Kitle

| Segment | Açıklama |
|---|---|
| Yerli Gezginler | Türkiye içinde seyahat eden, şehirleri keşfetmek isteyen kullanıcılar |
| Kültür Turistleri | Tarihi ve kültürel mekânlara ilgi duyan ziyaretçiler |
| Hafta Sonu Kaçamakçıları | Kısa süreli, planlı şehir gezileri yapan kullanıcılar |
| Gastronomi Meraklıları | Yöresel lezzetleri ve restoranları keşfetmek isteyenler |

---

## 3. Temel Özellikler

### 3.1 Misafir Modu
Uygulama, kayıt olmadan da kullanılabilir. Misafir kullanıcılar şehirleri ve gezilecek yerleri inceleyebilir; ancak gezi planı oluşturma, favorilere ekleme ve profil özellikleri için giriş yapmaları gerekir.

---

## 4. Ekranlar ve Kullanıcı Akışı

### 4.1 Onboarding Ekranı

**Dosya:** `src/screens/onboarding/OnboardingScreen.js`

Uygulamanın ilk açılışında gösterilen karşılama ekranıdır.

**Tasarım:**
- Tam ekran Lottie animasyonu (tren hareketi temalı arka plan)
- Üst kısımda "AKILLI GEZİ REHBERİ" rozeti, büyük başlık ("Türkiye'yi Keşfet") ve alt yazı
- Alt kısımda glassmorphism efektli "Başla" butonu
- "Ücretsiz · Kayıt gerekmez" notu

**Akış:** Başla butonuna basıldığında Auth ekranına yönlendirilir.

---

### 4.2 Kimlik Doğrulama Ekranları

#### 4.2.1 Auth Ekranı (Birleşik Giriş/Kayıt)

**Dosya:** `src/screens/auth/AuthScreen.js`

Üst yarısında doğa fotoğrafı, alt yarısında beyaz kart içinde form bulunan iki bölümlü bir ekrandır.

**Özellikler:**
- E-posta / şifre ile giriş ve kayıt (tek ekranda sekme geçişi)
- Şifre göster/gizle toggle
- "Şifremi unuttum?" bağlantısı (glassmorphism modal ile onay alır, ardından PasswordReset ekranına yönlendirir)
- Google ile giriş butonu
- Giriş/Kayıt modu arasında geçiş

#### 4.2.2 Giriş Ekranı

**Dosya:** `src/screens/auth/LoginScreen.js`

Daha gelişmiş animasyonlu giriş ekranı.

**Özellikler:**
- Gradient arka plan + yüzen renkli orb animasyonları
- Spring tabanlı fade-in animasyonları (header, form, sosyal butonlar, footer sırayla)
- E-posta ve şifre alanları (ikon + input)
- Gradient "Giriş Yap" butonu
- "Şifremi Unuttum" — e-posta girilmişse direkt sıfırlama maili gönderir, başarı banner'ı gösterir
- Google ile devam et butonu
- iOS'ta Apple ile devam et butonu
- "Hesabın yok mu? Kayıt Ol" footer linki

#### 4.2.3 Kayıt Ekranı

**Dosya:** `src/screens/auth/RegisterScreen.js`

**Özellikler:**
- Ad Soyad, E-posta, Şifre alanları
- Gerçek zamanlı şifre güç göstergesi (Zayıf / Orta / İyi / Güçlü — renkli segment bar)
- Google ve Apple (iOS) ile kayıt
- Kayıt sonrası e-posta doğrulama ekranı: mail ikonu, ipuçları, "Tekrar Gönder" butonu

#### 4.2.4 Şifre Sıfırlama Ekranı

**Dosya:** `src/screens/auth/PasswordResetScreen.js`

OTP kodu ile şifre sıfırlama akışı.

---

### 4.3 Ana Sayfa (Home)

**Dosya:** `src/screens/home/HomeScreen.js`

Uygulamanın ana ekranı. Parallax hero görsel ve kaydırılabilir içerik kartından oluşur.

**Bölümler:**

#### Hero Alanı
- İstanbul fotoğrafı üzerine parallax efekti (scroll ile yavaş kayar)
- "Akıllı Gezi Rehberi" rozeti
- Büyük başlık: "Türkiye'nin en güzel şehirleri"
- Alt başlık: "Akıllı rotalar oluştur, hayalindeki seyahati planla"
- "Gezi Planla" CTA butonu (giriş gerektiren işlem — misafir ise auth modal açılır)

#### Misafir Banner
Giriş yapılmamışsa "Giriş Yap veya Kaydol" banner'ı gösterilir.

#### Popüler Şehirler
- 2'li grid düzeninde şehir kartları (İstanbul, Antalya, İzmir, Muğla öncelikli)
- Her kartta: şehir fotoğrafı, gradient overlay, şehir adı, bölge adı
- Sağ üst köşede "+" butonu ile direkt gezi planı oluşturma
- "Hepsini Görüntüle" linki → AllCities ekranı

#### Etkinlikler
- "CANLI" rozeti ile canlı etkinlik listesi
- Her etkinlik kartında: tarih kutusu (gün/ay), başlık, il, tür rozeti (Sergi/Konser/Tiyatro/Festival/Yarışma — renk kodlu)
- "Tüm Etkinlikleri Gör" butonu → Etkinlikler ekranı

---

### 4.4 Tüm Şehirler Ekranı

**Dosya:** `src/screens/home/AllCitiesScreen.js`

Türkiye'deki tüm şehirlerin listelendiği ekran. Arama ve bölge filtresi içerir.

---

### 4.5 Şehir Detay Ekranı

**Dosya:** `src/screens/discover/CityDetailScreen.js`

Bir şehre tıklandığında açılan kapsamlı detay ekranı.

**Tasarım:**
- Parallax hero fotoğraf (scroll ile animasyonlu)
- Şeffaf header (scroll ile opak hale gelir)
- Yatay kaydırılabilir kategori sekmeleri

**Kategoriler:**

| Sekme | İçerik |
|---|---|
| 🏛️ Gezilecek | Supabase + Overpass API'den gelen turistik yerler |
| 🍽️ Ne Yenir? | Statik JSON'dan yöresel yemekler (81 il verisi) |
| 🏪 Restoranlar | OpenStreetMap'ten çekilen restoranlar |
| ☕ Kafeler | OpenStreetMap'ten çekilen kafeler |
| 🏨 Oteller | OpenStreetMap'ten çekilen oteller |
| 🍺 Barlar | OpenStreetMap'ten çekilen barlar |
| 🏧 Pratik | ATM ve eczane konumları |

**Yer Kartı Özellikleri:**
- Wikipedia'dan çekilen gerçek fotoğraf (öncelikli) veya curated fallback
- Favori ekleme/çıkarma (kalp ikonu)
- Giriş ücreti / ücretsiz rozeti
- Ortalama ziyaret süresi

**Detay Modal (Bottom Sheet):**
- Hero fotoğraf
- İstatistikler: süre, giriş ücreti, popülerlik puanı
- Otel için: yıldız sayısı, oda sayısı
- Restoran için: mutfak türü, fiyat aralığı
- Adres, açılış saatleri, WiFi, engelsiz erişim, vegan/vejetaryen bilgisi
- Aksiyon butonları: Ara, Web'de Gör, Haritada Gör (Google Maps deep link)
- Kültür Portalı entegrasyonu: açıklama ve fotoğraf galerisi

**Ek Özellikler:**
- Yer arama (metin filtresi)
- Şehir ziyaret durumu toggle (Gittim / Gitmek İstiyorum)
- Floating AI Asistan butonu (şehir bağlamıyla açılır)

---

### 4.6 Keşfet Ekranı

**Dosya:** `src/screens/discover/DiscoverScreen.js`

Tüm şehirlerdeki gezilecek yerlerin listelendiği keşif ekranı.

**Özellikler:**
- 2'li grid düzeninde yer kartları
- Arama çubuğu (yer adı, şehir veya kategori)
- Şehir filtresi (dropdown modal)
- Kategori filtresi: Tarihi / Müze / Doğa / Dini / Alışveriş / Plaj (dropdown modal)
- Aktif filtre sayısı rozeti + "Temizle" butonu
- Sayfalama (10 yer/sayfa, önceki/sonraki + sayfa numaraları)
- Favori toggle (giriş gerektiren)
- Yer detay modal (Wikipedia açıklaması, istatistikler, "Haritada Gör" butonu)

---

### 4.7 Etkinlikler Ekranı

**Dosya:** `src/screens/discover/EtkinliklerScreen.js`

Türkiye genelindeki kültürel etkinliklerin listelendiği ekran. Supabase'den çekilen canlı veri.

---

### 4.8 Gezi Planı Oluşturma

**Dosya:** `src/screens/itinerary/CreateItineraryScreen.js`

4 adımlı wizard akışı ile gezi planı oluşturma.

**Adım Göstergesi:** Şehir → Yerler → Süre → Konaklama (tamamlanan adımlar checkmark ile işaretlenir)

#### Adım 1: Şehir Seçimi
- Grid düzeninde şehir kartları
- Seçilen şehir vurgulanır (checkmark + renk değişimi)

#### Adım 2: Gezilecek Yerler
- **Otomatik Seçim** toggle: Açıksa en popüler yerler otomatik seçilir
- Manuel modda:
  - Metin arama
  - Kategori filtresi (yatay kaydırılabilir chip'ler)
  - Seçilen yer sayısı rozeti
  - PlaceSelectionCard bileşeni ile yer seçimi

#### Adım 3: Tarih Seçimi
- Takvim bileşeni (react-native-calendars)
- Başlangıç ve bitiş tarihi seçimi (period marking)
- Seçilen gün sayısı ve tarih aralığı özeti
- Geçmiş tarihler devre dışı

#### Adım 4: Konaklama
- "Konaklama gerekli" toggle (günübirlik gezi seçeneği)
- **Otel Öner** modu: Mock otel listesi (şehre göre)
- **Kendi Yerim** modu: Kullanıcı kendi konaklamasını belirtir
- Google Maps'te otel ara butonu

**Plan Oluşturma Algoritması:**
- `itineraryGenerator.js` ile günlere yerler dağıtılır
- Haversine mesafe hesabı ile coğrafi optimizasyon
- Supabase Edge Function ile OpenRouteService rota optimizasyonu (fallback: haversine)
- Plan Supabase'e kaydedilir, ItineraryDetail ekranına yönlendirilir

---

### 4.9 Gezi Planı Detay Ekranı

**Dosya:** `src/screens/itinerary/ItineraryDetailScreen.js`

Kaydedilmiş gezi planının gün gün görüntülendiği ekran.

**Özellikler:**
- Şehir adı, toplam gün, tahmini maliyet, toplam süre özeti
- Günlük DayCard bileşenleri (her gün için yerler listesi)
- Her yer için: fotoğraf, süre, ücret bilgisi
- Haritada Gör butonu (MapScreen'e yönlendirir)
- AI Asistan butonu (gezi bağlamıyla açılır)
- Planı Kaydet / Yeni Plan Oluştur butonları

---

### 4.10 Kayıtlı Planlar Ekranı

**Dosya:** `src/screens/itinerary/SavedItinerariesScreen.js`

Kullanıcının kaydettiği tüm gezi planlarının listesi.

---

### 4.11 Türkiye Haritası

**Dosya:** `src/screens/map/TurkeyMapScreen.js`

Türkiye'nin interaktif SVG haritası (WebView + Leaflet.js).

**Özellikler:**
- Ziyaret edilen şehirler yeşil renkte işaretlenir
- Bucket list'teki şehirler kırmızı renkte işaretlenir
- Şehre tıklandığında CityDetail ekranına yönlendirilir
- Renk açıklaması (legend): Gittim / Listede
- Yükleme timeout (10 saniye) ve hata durumu yönetimi

---

### 4.12 Harita Ekranı (Yer Haritası)

**Dosya:** `src/screens/map/MapScreen.js`

Belirli bir yer veya şehir için Leaflet.js tabanlı interaktif harita.

**Özellikler:**
- Tek yer veya çoklu yer işaretleme
- "Yol Tarifi" butonu → Google Maps deep link (driving modu)
- Çoklu yer için waypoint rota oluşturma (max 8 ara nokta)
- Alt bilgi çubuğu: yer adı + "Maps'te Aç" butonu

---

### 4.13 Favoriler Ekranı

**Dosya:** `src/screens/favorites/FavoritesScreen.js`

Kullanıcının favorilere eklediği yerlerin listesi.

**Özellikler:**
- Tam genişlikte yer kartları (fotoğraf + gradient overlay)
- Kategori rozeti (sol üst)
- Favori kaldır butonu (kalp ikonu, sağ üst — onay alert'i ile)
- Her kart: yer adı, şehir, süre, ücret, popülerlik puanı
- Boş durum: "Şehirleri Keşfet" butonu
- Pull-to-refresh

---

### 4.14 Profil Ekranı

**Dosya:** `src/screens/profile/ProfileScreen.js`

Kullanıcı profili ve istatistikleri.

**Bölümler:**

#### Header (Gradient Arka Plan)
- Avatar (baş harf veya fotoğraf — galeriden seçilebilir)
- Ad, e-posta, kısa bio
- Rozet: Kaşif Adayı / Gezgin / Seyyah / Maceracı / Usta Gezgin (gezilen şehir sayısına göre)
- Seyahat tarzı etiketi (Kültürel / Macera / Rahat / Gastronomi / Doğa / Fotoğraf)
- Düzenleme modu: ad, bio ve seyahat tarzı güncellenebilir

#### İstatistik Grid (2x2)
- Gezilen Şehir sayısı
- Bucket List (gitmek istenen şehir) sayısı
- Tamamlanan Plan sayısı
- Favori Yer sayısı

#### Türkiye İlerleme Çubuğu
- "Türkiye'yi Keşfet" başlığı
- Yüzde göstergesi (gezilen il / 81)
- Renkli progress bar

#### Menü
- Favorilerim → FavoritesScreen
- Gezi Planlarım → SavedItinerariesScreen
- Yardım & Destek → TravelAssistantScreen

#### Çıkış Yap butonu

---

### 4.15 AI Gezi Asistanı

**Dosya:** `src/screens/assistant/TravelAssistantScreen.js`

Gemini 2.0 Flash Lite tabanlı sohbet arayüzü.

**Özellikler:**
- Bağlama duyarlı karşılama mesajı (şehir, gezi planı veya genel mod)
- Mesaj balonları: kullanıcı (sağ, marka rengi) / asistan (sol, beyaz kart)
- "Yazıyor..." animasyonu (ActivityIndicator)
- Hızlı soru chip'leri (bağlama göre değişir):
  - Gezi planı bağlamında: rota optimizasyonu, boş vakit önerileri, yakın kafe
  - Şehir bağlamında: en önemli 5 yer, yerel lezzetler, bütçe seçenekleri
  - Genel: İstanbul önerileri, bütçe seyahat, popüler şehirler
- Gerçek zamanlı hava durumu entegrasyonu (OpenWeatherMap — asistana bağlam olarak iletilir)
- Konuşma geçmişi (multi-turn)
- Floating buton ile herhangi bir ekrandan erişilebilir

**Sistem Prompt Bağlamı:**
- Aktif şehir, gezi günü, başlangıç tarihi
- Bugünkü plan ve tamamlanan yerler
- Kalan boş vakit
- Güncel hava durumu tahmini (5 günlük)

---

## 5. Navigasyon Yapısı

```
AppNavigator
├── Onboarding (ilk açılış)
├── Auth (giriş yapılmamış)
│   ├── AuthScreen
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── PasswordResetScreen
└── Main (giriş yapılmış veya misafir)
    ├── Tab: Ana Sayfa
    │   ├── HomeScreen
    │   ├── AllCitiesScreen
    │   ├── CityDetailScreen
    │   ├── CreateItineraryScreen
    │   ├── ItineraryDetailScreen
    │   ├── SavedItinerariesScreen
    │   ├── MapScreen
    │   ├── EtkinliklerScreen
    │   └── TravelAssistantScreen
    ├── Tab: Planlar (misafir → GuestGate)
    │   ├── SavedItinerariesScreen
    │   ├── ItineraryDetailScreen
    │   └── TravelAssistantScreen
    └── Tab: Profil (misafir → GuestGate)
        ├── ProfileScreen
        ├── FavoritesScreen
        ├── SavedItinerariesScreen
        ├── CityDetailScreen
        └── TravelAssistantScreen
```

**Alt Navigasyon Çubuğu:** Ana Sayfa / Planlar / Profil (animasyonlu ikonlar — seçilince scale + translateY animasyonu + nokta göstergesi)

---

## 6. Teknik Altyapı

### 6.1 Frontend
| Teknoloji | Kullanım |
|---|---|
| React Native (Expo SDK) | Mobil uygulama çatısı |
| React Navigation v6 | Ekran navigasyonu (Stack + Bottom Tab) |
| Expo Linear Gradient | Gradient efektler |
| Expo Blur | Glassmorphism efektler |
| Lottie React Native | Animasyonlar (onboarding, loading) |
| React Native Calendars | Tarih seçici |
| React Native WebView | Harita görüntüleme (Leaflet.js) |
| Expo Image | Optimize görsel yükleme |
| Expo Image Picker | Avatar seçimi |
| Expo Secure Store | JWT token güvenli depolama |

### 6.2 Backend & Veri
| Teknoloji | Kullanım |
|---|---|
| Supabase | Auth, veritabanı (PostgreSQL), Edge Functions |
| Supabase Auth | E-posta/şifre, Google OAuth, Apple Sign-In, PKCE flow |
| Supabase Edge Functions | Rota optimizasyonu (OpenRouteService) |
| OpenStreetMap / Overpass API | Restoran, kafe, otel, ATM, eczane verileri |
| Wikipedia API | Yer açıklamaları ve fotoğrafları |
| Kültür Portalı | Tarihi yer açıklamaları ve görselleri |
| Google Gemini 2.0 Flash Lite | AI asistan yanıtları |
| OpenWeatherMap | Hava durumu tahmini |

### 6.3 Veri Kaynakları
- **Statik JSON:** `turkiye_gezilecek_yerler.json`, `turkiye_gezilecek_yerler_detay.json`, `turkiye_mutfak.json` (81 il yöresel yemek verisi)
- **Supabase Tabloları:** cities, places, itineraries, favorites, profiles, city_visits
- **Dinamik:** Overpass API (POI), Wikipedia (açıklama + fotoğraf), Kültür Portalı

### 6.4 Güvenlik
- JWT token'lar Expo SecureStore (iOS Keychain / Android Keystore) ile saklanır
- PKCE OAuth flow
- API key'ler `secrets.js` dosyasında (`.gitignore`'da) ve EAS build'de environment variable olarak yönetilir

---

## 7. Kullanıcı Yetkilendirme Matrisi

| Özellik | Misafir | Kayıtlı Kullanıcı |
|---|---|---|
| Şehirleri görüntüleme | ✅ | ✅ |
| Gezilecek yerleri inceleme | ✅ | ✅ |
| Etkinlikleri görüntüleme | ✅ | ✅ |
| Gezi planı oluşturma | ❌ | ✅ |
| Favorilere ekleme | ❌ | ✅ |
| Profil yönetimi | ❌ | ✅ |
| Şehir ziyaret takibi | ❌ | ✅ |
| Türkiye haritası (kişisel) | ❌ | ✅ |
| AI Asistan | ✅ | ✅ |

---

## 8. Tasarım Sistemi

### 8.1 Renk Paleti
- **Ana Renk:** `#3D7A62` (koyu pastel yeşil-teal — oklch(43.2% 0.095 166.913))
- **Arka Plan:** `#F8FAF9` (hafif yeşilimsi beyaz)
- **Yüzey:** `#FFFFFF`
- **Hata:** `#C0392B`
- **Uyarı:** `#B7791F`
- **Bilgi:** `#2563EB`

### 8.2 Tipografi
- **Font Ailesi:** Inter (400 Regular, 500 Medium, 600 SemiBold, 700 Bold)
- **Başlıklar:** Inter Bold
- **Gövde:** Inter Regular / Medium

### 8.3 Tasarım Prensipleri
- Glassmorphism efektler (blur + şeffaf arka plan)
- Smooth spring animasyonları (React Native Animated API)
- Skeleton loader'lar (yükleme durumları için)
- Parallax hero görseller
- Gradient overlay'ler (fotoğraf üzeri metin okunabilirliği)
- Rounded corner'lar (border radius sistemi)

---

## 9. Performans Optimizasyonları

- `React.memo` ile gereksiz re-render önleme (PlaceCard, EtkinlikCard vb.)
- FlatList `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `removeClippedSubviews`
- Görsel önbellekleme (`cacheService.js`)
- Prefetch servisi (`prefetchService.js`) — uygulama açılışında kritik veriler önceden yüklenir
- Sayfalama (Keşfet ekranı: 10 yer/sayfa)
- Batch fotoğraf yükleme (`getBatchPlacePhotos`)

---

## 10. Bildirimler ve Hata Yönetimi

- Ağ hatalarında kullanıcı dostu hata mesajları (`ErrorMessage` bileşeni)
- Skeleton loader'lar ile yükleme durumu gösterimi
- Pull-to-refresh desteği
- Harita yükleme timeout (10 saniye) ve yeniden deneme butonu
- AI asistan bağlantı hatası fallback mesajı

---

## 11. Gelecek Özellikler (Backlog)

- Çevrimdışı mod (indirilen şehir verileri)
- Sosyal özellikler (plan paylaşma, arkadaş aktivitesi)
- Bildirimler (etkinlik hatırlatıcıları)
- Çoklu dil desteği (İngilizce)
- Uçuş ve otobüs bilet entegrasyonu
- Kullanıcı yorumları ve puanlama sistemi
- Augmented Reality (AR) yer tanıma
