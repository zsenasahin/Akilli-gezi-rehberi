# 05 · Tasarım, Planlama Sihirbazı ve Bölge Farkındalıklı Planlayıcı

## Görsel hatalar (SDK 57 sonrası)

| Belirti | Sebep | Çözüm |
|---|---|---|
| Şehir/yer resimleri yüklenmiyor | Kültür Portalı adreslerinde kodlanmamış boşluk ve parantez (`…SULTANAHMET CAMI (1) kopya.jpg`). Yeni `expo-image` bu adresleri açamıyor. | `utils/imageUrl.js` → `normalizeImageUrl`; SmartImage, yer/şehir/etkinlik/aktivite servisleri ve yemek kartlarında uygulanır. Yer önbelleği `v2`'ye yükseltildi (eski bozuk adresler kullanılmaz). |
| "Gezi Planla" butonunun yarısı kesik | Hero yüksekliği ekranın %48'ine sabitti; başlık + alt yazı + buton sığmayınca içerik kartı butonun üstüne biniyordu. | Hero yüksekliği içerik ölçülerek belirleniyor, üst boşluk güvenli alandan (safe area) alınıyor. |
| Renk tonu farklı | `ThemeContext` açık tema renkleri `colors.js` ile uyuşmuyordu; ilk karede bir palet, sonra diğeri uygulanıyordu. | İkisi aynı palete bağlandı. |

## Renk paleti

Koyu orman/zeytin yeşili (`#4F6342`), haki (`#B3A274`), yumuşak kahverengi (`#8B6B4E`), krem zemin (`#F6F3EC`), sıcak beyaz kartlar (`#FFFDF8`). Hata/uyarı renkleri de toprak tonlarına çekildi (terracotta `#B5523B`, hardal `#B8893A`). Ekranlardaki canlı sabit renkler (mor, pembe, parlak yeşil, mavi) bu paletteki karşılıklarıyla değiştirildi.

## Planlama sihirbazı

Adımlar: **Şehir → Tarih → Yerler → Ulaşım & Tempo → Konaklama → Özet → (gerekirse) Karar**

- Yaylı ilerleme çubuğu ve adım ikonları (`components/planner/PlannerHeader.js`)
- Adımlar arası yöne duyarlı kayma animasyonu (Reanimated)
- Fotoğraflı şehir kartları, arama
- "Benim için seç / Kendim seçeceğim" kartları; manuel seçimde canlı **kapasite göstergesi** ("9 yer · ~14 saat — 2 güne sığmayabilir")
- Basınca küçülen kartlar (`PressableScale`)
- Özet ekranında her satıra dokununca o adıma dönülür
- Plan hesaplanırken Lottie animasyonlu bekleme katmanı (`PlanningOverlay`)
- **Karar adımı** (`DecisionStep`): motorun kendi başına karar vermemesi gereken durumlarda seçenek sunar

## Bölge farkındalıklı planlayıcı (`domain/dayPlanner.js`)

K-Means'in yerine geçti. Sıra:

1. **Tam gün süren duraklar** (≥ 4 saat: piknik, mesire, kamp…) kendi günlerini alır. O güne yalnızca çok yakın ve ≤ 1,5 saatlik bir ek durak eklenebilir.
2. Kalan duraklar ulaşım moduna göre **bölgelere** ayrılır (merkezler arası ≤ 1,2 km yürüyüş / 3,5 km toplu taşıma / 8 km araç).
3. Bir güne sığmayan bölge rota sırasıyla parçalara bölünür.
4. Boş gün varsa ağır günler (kapasitenin > %70'i) ikiye bölünür; gün yetmiyorsa en yakın ve süresi uyan parçalar birleştirilir.
5. Aşağıdaki durumlarda **kullanıcıya sorulur**:

| Tür | Örnek |
|---|---|
| `overloaded_area` | C, D, E birbirine yakın ama ~9 saat; tek güne sığmıyor |
| `far_merge` | Gün yetmediği için birbirinden uzak iki bölge aynı güne düşüyor |
| `not_enough_days` | Seçilen yerler gün sayısına hiç sığmıyor |
| `too_many_full_day` | Tam gün süren yer sayısı gün sayısından fazla |
| `closing_time` | Bir yere kapanış saatinden önce yetişilemiyor |

Seçenekler: **Tempoyu yoğun yap**, **Geziye 1 gün ekle**, **Bir yeri çıkar** (önerilen yerler listelenir), **Önerdiğin şekilde devam et**. Her seçenek motoru yeniden çalıştırır; sorun kalmayınca plan kaydedilir. Otomatik seçim modunda soru sorulmaz.

Senaryonuz test olarak eklendi (`npm run test:planner`, 14 test): A-B aynı gün, F piknik tek başına, C-D-E için soru; yoğun tempoda C-D-E tek günde.

## Şehir ekranı

- **Hava durumu:** Open-Meteo ile 5 günlük tahmin şeridi (ücretsiz, anahtarsız, 1 saat önbellek). "Hava Durumu" butonu artık Google'a değil bu şeride kaydırıyor.
- **Bu şehirde yapılacaklar:** Kültür Portalı turizm aktiviteleri. Veri 12 kayıttan **551 kayda (66 il)** çıkarıldı (`scripts/scrape_tourism_activities.mjs`).

## Veritabanı ve güvenlik

`supabase/migrations/20261023120000_security_and_content.sql` (**henüz çalıştırılmadı**, sizin çalıştırmanız gerekiyor):

- **`api_cache` açığı kapatıldı.** Eski politika `FOR ALL USING (true)` idi; anon anahtarı olan herkes (anahtar APK'da bulunur) önbelleği okuyup yazabiliyordu. Bu, uygulamada gösterilen restoran/otel verisinin dışarıdan değiştirilmesine izin veriyordu. Doğrulandı: anon anahtarla 62 satır okunabiliyor ve insert denemesi RLS'e takılmıyor.
- İçerik tablolarında (`cities`, `places`, …) istemcinin yazma yetkisi kaldırıldı.
- `cities`'e `image_url`, `hero_image_url`, `gallery` eklendi.
- `tourism_activities` tablosu (yalnızca okunabilir).

Aktarım: `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/import_tourism_activities.mjs`. Bu komut aktiviteleri ve şehir kapak görsellerini yazar; görseli önceden doldurulmuş şehirlere dokunmaz.

Uygulama tarafı:

- Kullanılmayan mikrofon izni (`RECORD_AUDIO`) kaldırıldı ve engellendi.
- `allowBackup: false`.

## Yayın öncesi yapılacaklar (Google Play)

1. Migration'ı çalıştırın, ardından aktarım betiğini çalıştırın.
2. `mobile/.env` içindeki `SUPABASE_SERVICE_ROLE_KEY`'i mobil klasörden kaldırın. Bu anahtar yalnızca betikleri çalıştırdığınız terminalde ve Edge Function secret'larında olmalı.
3. Daha önce açığa çıkan Gemini anahtarını yenileyin.
4. `supabase/config.toml`'da `generate-itinerary` fonksiyonu `verify_jwt = false`; uygulama bu fonksiyonu kullanmıyor. Kullanılmayacaksa silin veya JWT doğrulamasını açın.
5. Supabase Dashboard → Authentication'da e-posta doğrulamasını ve şifre politikasını kontrol edin.

## Yapay zekâ hakkında

Rota oluşturmak için ücretli bir yapay zekâ API'sine gerek yok, ve aslında bu iş için uygun da değil. Dil modelleri mesafe, kapanış saati ve süreyi güvenilir biçimde hesaplayamaz; aynı girdiye her seferinde farklı plan üretebilir. Buradaki planlayıcı ücretsiz, çevrimdışı çalışır ve test edilebilir.

Yapay zekâ isterseniz doğru yeri "plan anlatımı"dır. Örneğin her gün için 2 cümlelik özet ("Bugün tarihi yarımadadasın…") Gemini'nin ücretsiz katmanıyla, `travel-assistant` Edge Function üzerinden (anahtar sunucuda kalır) eklenebilir.

---

## 2. tur düzeltmeleri

### Resimler
| Sorun | Sebep | Çözüm |
|---|---|---|
| Resimler yüklenmiyor / rastgele resim çıkıyor | `SmartImage` expo-image'a `placeholder={{ color }}` veriyordu. Bu geçerli bir kaynak değil; hata olayını tetikleyip asıl resmin yerine Unsplash yedeğini gösteriyordu. | Yer tutucu yalnızca arka plan rengi; yedeğe yalnızca gerçek hata olunca geçiliyor; `recyclingKey` ile listelerde resim karışması engellendi. |
| Yer detayında yanlış fotoğraflar | Eski kazıma, sayfadaki "diğer yerler" küçük resimlerini galeriye katmış (7.049 fotoğrafın 3.914'ü birden çok yerde geçiyor; ör. Adana Taş Köprü galerisinde Ariassos ve Nemrut). | `cleanGallery`: yalnızca tek bir yere ait fotoğraflar kalır. Yer önbelleği `v3`. Veritabanı yerlerinde de galeri gösteriliyor. |
| Yavaş yükleme | `/large/` görseller 100 KB–2,2 MB. | Kart ve listelerde Kültür Portalı'nın `/small/` sürümü (5–6 kat küçük); yoksa otomatik büyüğe geçer. Ek depolama/trafik maliyeti yok. |
| Planlar kartında yazı görünmüyor | Beyaz yazı fotoğrafın üstünde; fotoğraf yüklenmeyince açık zeminde kayboluyordu. | Resim düzeldi; kart karartması koyulaştırıldı. |

Tüm ekranlardaki doğrudan `expo-image` kullanımları `SmartImage`'a taşındı.

### Tema
- **Açık:** beyaz zemin (`#FFFFFF`), nötr gri yüzeyler, zeytin yeşili vurgu.
- **Koyu:** `#0E110F` zemin, `#171B18` kartlar.
- **Sistem:** varsayılan; telefonun ayarını takip eder.
- `utils/themedStyles.js` → `createThemedStyles(() => ({ … }))`. 41 stil tanımı otomatik dönüştürüldü. Tema değişince stiller yeniden üretilir; uygulama ağacı kullanıcının bulunduğu ekran korunarak yeniden çizilir. Gezinme teması ve durum çubuğu da temaya bağlı.
- Stillerde sabit yazılmış açık zemin/koyu yazı renkleri tema değişkenlerine bağlandı.

### Şehir ekranı
- "Haritada Gör" ve "Hava Durumu" butonları kaldırıldı.
- Ekranın altında yüzen, animasyonlu **"<Şehir> gezini planla"** butonu eklendi (yaylı giriş, ışık süzülmesi, nefes alan ikon).

### Diğer
- `ReviewRow` key uyarısı giderildi.
- Karavan animasyonu "henüz planın yok" ekranında da kullanılıyor.

### Gemini anahtarı
`mobile/.env` içindeki `GEMINI_API_KEY` uygulamaya girmez (doğru). Asistanın kullanabilmesi için anahtar Supabase'e secret olarak eklenmeli:

```bash
supabase secrets set GEMINI_API_KEY=...
```

Bunu yaptıktan sonra `mobile/.env`'den de silebilirsiniz.
