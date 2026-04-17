/**
 * Türkiye'nin 81 ili + popüler ilçelerini Supabase'e ekleyen seed script.
 * 
 * Kullanım:
 *   node scripts/seedCities.js
 * 
 * Not: Bu scripti çalıştırmadan önce secrets.js'deki SUPABASE_URL ve
 * SUPABASE_ANON_KEY değerlerini kullanarak ortam değişkenlerini ayarlayın.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ─── Supabase bağlantısı ─────────────────────────────────────────────────────
// secrets.js ES modül formatında olduğu için require edilemiyor, dosyayı okuyup parse ediyoruz
let SUPABASE_URL, SUPABASE_ANON_KEY;
try {
    const secretsContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'config', 'secrets.js'), 'utf8');
    const urlMatch = secretsContent.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
    const keyMatch = secretsContent.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
    SUPABASE_URL = urlMatch?.[1];
    SUPABASE_ANON_KEY = keyMatch?.[1];
} catch (e) {
    SUPABASE_URL = process.env.SUPABASE_URL;
    SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ SUPABASE_URL ve SUPABASE_ANON_KEY gerekli!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Türkiye'nin 81 ili ──────────────────────────────────────────────────────
const CITIES = [
    // Marmara
    { name: 'İstanbul', region: 'Marmara', lat: 41.0082, lng: 28.9784, description: 'Boğazın iki yakasına kurulmuş, tarihi ve modern dokusuyla büyüleyen mega kent.' },
    { name: 'Bursa', region: 'Marmara', lat: 40.1824, lng: 29.0669, description: 'Osmanlı\'nın ilk başkenti, Uludağ\'ın eteğinde tarihi ve doğal güzellikleriyle ünlü.' },
    { name: 'Kocaeli', region: 'Marmara', lat: 40.8533, lng: 29.8815, description: 'Sanayisiyle öne çıkan, doğal güzellikleri ve tarihi dokusuyla da dikkat çeken şehir.' },
    { name: 'Sakarya', region: 'Marmara', lat: 40.6940, lng: 30.4358, description: 'Sapanca Gölü ve doğal güzellikleriyle tanınan, huzurlu bir Marmara şehri.' },
    { name: 'Tekirdağ', region: 'Marmara', lat: 40.9781, lng: 27.5117, description: 'Rakısı, köftesi ve bağlarıyla ünlü, Trakya\'nın gözde şehri.' },
    { name: 'Edirne', region: 'Marmara', lat: 41.6818, lng: 26.5623, description: 'Selimiye Camii ve tarihi yapılarıyla Osmanlı mirasını yaşatan sınır şehri.' },
    { name: 'Kırklareli', region: 'Marmara', lat: 41.7333, lng: 27.2167, description: 'Istranca ormanları ve longoz ormanlarıyla doğa tutkunlarının gözdesi.' },
    { name: 'Çanakkale', region: 'Marmara', lat: 40.1553, lng: 26.4142, description: 'Gelibolu yarımadası ve Truva antik kentiyle tarihe tanıklık eden şehir.' },
    { name: 'Balıkesir', region: 'Marmara', lat: 39.6484, lng: 27.8826, description: 'Hem Marmara hem Ege kıyılarına sahip, termal kaynakları ve doğasıyla zengin.' },
    { name: 'Yalova', region: 'Marmara', lat: 40.6500, lng: 29.2667, description: 'Termal kaplıcaları ve İstanbul\'a yakınlığıyla bilinen küçük ama şirin şehir.' },
    { name: 'Bilecik', region: 'Marmara', lat: 40.1500, lng: 29.9833, description: 'Osmanlı Devleti\'nin kuruluş yeri, tarihi Söğüt ilçesiyle tanınır.' },

    // Ege
    { name: 'İzmir', region: 'Ege', lat: 38.4192, lng: 27.1287, description: 'Ege\'nin incisi, körfezi, Kordon\'u ve eşsiz mutfağıyla büyüleyen liman şehri.' },
    { name: 'Manisa', region: 'Ege', lat: 38.6191, lng: 27.4289, description: 'Mesir macunu festivali ve Spil Dağı\'yla tanınan tarihi Ege şehri.' },
    { name: 'Aydın', region: 'Ege', lat: 37.8444, lng: 27.8458, description: 'Zeytinlikleri, inciri ve Kuşadası kıyılarıyla ünlü Ege cenneti.' },
    { name: 'Denizli', region: 'Ege', lat: 37.7765, lng: 29.0864, description: 'Pamukkale travertenleri ve antik Hierapolis kentiyle dünyaca ünlü.' },
    { name: 'Muğla', region: 'Ege', lat: 37.2153, lng: 28.3636, description: 'Bodrum, Marmaris, Fethiye gibi tatil cennetlerini barındıran turizm başkenti.' },
    { name: 'Uşak', region: 'Ege', lat: 38.6823, lng: 29.4082, description: 'Halıları ve seramikleriyle bilinen, tarihi Lidya medeniyetine ev sahipliği yapan şehir.' },
    { name: 'Afyonkarahisar', region: 'Ege', lat: 38.7507, lng: 30.5567, description: 'Termal kaplıcaları, kaymağı ve tarihi kalesiyle tanınan İç Batı Anadolu şehri.' },
    { name: 'Kütahya', region: 'Ege', lat: 39.4167, lng: 29.9833, description: 'Çinileri ve seramikleriyle dünyaca ünlü, tarihi ve kültürel açıdan zengin.' },

    // İç Anadolu
    { name: 'Ankara', region: 'İç Anadolu', lat: 39.9208, lng: 32.8541, description: 'Türkiye\'nin başkenti, Anıtkabir ve modern müzeleriyle öne çıkan şehir.' },
    { name: 'Konya', region: 'İç Anadolu', lat: 37.8746, lng: 32.4932, description: 'Mevlana\'nın şehri, Selçuklu mirası ve manevi atmosferiyle büyüleyen.' },
    { name: 'Kayseri', region: 'İç Anadolu', lat: 38.7312, lng: 35.4787, description: 'Erciyes Dağı ve pastırmasıyla ünlü, tarihi Selçuklu başkenti.' },
    { name: 'Sivas', region: 'İç Anadolu', lat: 39.7477, lng: 37.0179, description: 'Divriği Ulu Camii ve kongre tarihiyle öne çıkan kadim Anadolu şehri.' },
    { name: 'Yozgat', region: 'İç Anadolu', lat: 39.8181, lng: 34.8147, description: 'Çamlık Milli Parkı ve tarihi yapılarıyla bilinen İç Anadolu şehri.' },
    { name: 'Kırıkkale', region: 'İç Anadolu', lat: 39.8468, lng: 33.5153, description: 'Ankara\'ya yakın konumuyla stratejik öneme sahip sanayi şehri.' },
    { name: 'Aksaray', region: 'İç Anadolu', lat: 38.3687, lng: 34.0370, description: 'Ihlara Vadisi ve Kapadokya\'nın batı kapısı olarak bilinen tarihi şehir.' },
    { name: 'Niğde', region: 'İç Anadolu', lat: 37.9667, lng: 34.6833, description: 'Aladağlar Milli Parkı ve tarihi kaleleriyle doğa ve tarih harmanı.' },
    { name: 'Nevşehir', region: 'İç Anadolu', lat: 38.6939, lng: 34.6857, description: 'Kapadokya\'nın kalbi, peri bacaları ve yeraltı şehirleriyle eşsiz.' },
    { name: 'Kırşehir', region: 'İç Anadolu', lat: 39.1425, lng: 34.1709, description: 'Ahi Evran\'ın şehri, Türk esnaf geleneğinin merkezi.' },
    { name: 'Eskişehir', region: 'İç Anadolu', lat: 39.7667, lng: 30.5256, description: 'Porsuk Çayı, üniversiteleri ve modern yaşam alanlarıyla genç ve dinamik.' },
    { name: 'Çankırı', region: 'İç Anadolu', lat: 40.6013, lng: 33.6134, description: 'Kaya tuzu mağaraları ve doğal güzellikleriyle keşfedilmeyi bekleyen şehir.' },
    { name: 'Karaman', region: 'İç Anadolu', lat: 37.1759, lng: 33.2287, description: 'Karamanoğulları Beyliği\'nin başkenti, tarihi medreseleriyle tanınır.' },

    // Karadeniz
    { name: 'Trabzon', region: 'Karadeniz', lat: 41.0027, lng: 39.7168, description: 'Sümela Manastırı ve yaylalarıyla büyüleyen Karadeniz\'in incisi.' },
    { name: 'Samsun', region: 'Karadeniz', lat: 41.2928, lng: 36.3313, description: 'Milli mücadelenin başlangıç noktası, Atatürk\'ün Samsun\'a çıkışıyla anılan şehir.' },
    { name: 'Ordu', region: 'Karadeniz', lat: 40.9860, lng: 37.8797, description: 'Fındığın başkenti, Boztepe\'si ve sahil şeridiyle cazibe merkezi.' },
    { name: 'Giresun', region: 'Karadeniz', lat: 40.9128, lng: 38.3895, description: 'Giresun Adası ve fındık bahçeleriyle yeşilin her tonunu barındıran şehir.' },
    { name: 'Rize', region: 'Karadeniz', lat: 41.0201, lng: 40.5234, description: 'Çay bahçeleri ve yaylalarıyla Karadeniz\'in en yeşil şehri.' },
    { name: 'Artvin', region: 'Karadeniz', lat: 41.1828, lng: 41.8183, description: 'Çoruh Vadisi, yaylaları ve doğa sporlarıyla macera tutkunlarının gözdesi.' },
    { name: 'Gümüşhane', region: 'Karadeniz', lat: 40.4386, lng: 39.4814, description: 'Karaca Mağarası ve yaylalarıyla doğa harikası Karadeniz şehri.' },
    { name: 'Bayburt', region: 'Karadeniz', lat: 40.2552, lng: 40.2249, description: 'Türkiye\'nin en küçük illerinden, tarihi kalesi ve ehram dokumasıyla bilinir.' },
    { name: 'Amasya', region: 'Karadeniz', lat: 40.6499, lng: 35.8353, description: 'Yeşilırmak boyunca sıralanan yalıboyu evleriyle romantik atmosfer.' },
    { name: 'Tokat', region: 'Karadeniz', lat: 40.3167, lng: 36.5500, description: 'Ballıca Mağarası ve kebabıyla ünlü, tarihi İpek Yolu şehri.' },
    { name: 'Sinop', region: 'Karadeniz', lat: 42.0231, lng: 35.1531, description: 'Türkiye\'nin en kuzey noktası, tarihi cezaevi ve sakin denizi ile huzur dolu.' },
    { name: 'Bartın', region: 'Karadeniz', lat: 41.6358, lng: 32.3375, description: 'Amasra ve İnkumu sahilleriyle Batı Karadeniz\'in tatil cenneti.' },
    { name: 'Karabük', region: 'Karadeniz', lat: 41.2061, lng: 32.6204, description: 'Safranbolu evleriyle UNESCO Dünya Mirası listesinde yer alan şehir.' },
    { name: 'Zonguldak', region: 'Karadeniz', lat: 41.4535, lng: 31.7987, description: 'Maden şehri olarak bilinen, doğal güzellikleriyle de dikkat çeken il.' },
    { name: 'Bolu', region: 'Karadeniz', lat: 40.7396, lng: 31.6060, description: 'Abant Gölü ve Kartalkaya kayak merkeziyle doğa ve kış turizmi cenneti.' },
    { name: 'Düzce', region: 'Karadeniz', lat: 40.8438, lng: 31.1565, description: 'Gölleri ve yaylalarıyla eko-turizmin yükselen değeri.' },
    { name: 'Kastamonu', region: 'Karadeniz', lat: 41.3887, lng: 33.7827, description: 'İstiklal Yolu ve tarihi konakları, doğal güzellikleriyle keşfedilmeyi bekliyor.' },

    // Akdeniz
    { name: 'Antalya', region: 'Akdeniz', lat: 36.8969, lng: 30.7133, description: 'Türk Rivierası, antik kentleri ve turkuaz sahilleriyle dünya turizm başkenti.' },
    { name: 'Mersin', region: 'Akdeniz', lat: 36.8121, lng: 34.6415, description: 'Akdeniz kıyısında liman şehri, Kızkalesi ve tantunisiyle meşhur.' },
    { name: 'Adana', region: 'Akdeniz', lat: 37.0000, lng: 35.3213, description: 'Adana kebabı, Seyhan Nehri ve Taşköprü ile Akdeniz\'in ateşli şehri.' },
    { name: 'Hatay', region: 'Akdeniz', lat: 36.2025, lng: 36.1606, description: 'Mozaikler diyarı, medeniyetler beşiği ve eşsiz mutfağıyla gastronomi başkenti.' },
    { name: 'Isparta', region: 'Akdeniz', lat: 37.7648, lng: 30.5566, description: 'Gül ve lavanta tarlaları, Eğirdir Gölü ile doğa cenneti.' },
    { name: 'Burdur', region: 'Akdeniz', lat: 37.7265, lng: 30.2906, description: 'Burdur Gölü ve Sagalassos antik kentiyle tarih ve doğa bütünlüğü.' },
    { name: 'Kahramanmaraş', region: 'Akdeniz', lat: 37.5753, lng: 36.9228, description: 'Dondurması ve biberiyele dünyaca ünlü, kahramanlık tarihiyle anılan şehir.' },
    { name: 'Osmaniye', region: 'Akdeniz', lat: 37.0742, lng: 36.2478, description: 'Kastabala antik kenti ve doğal güzellikleriyle Akdeniz\'in saklı köşesi.' },

    // Güneydoğu Anadolu
    { name: 'Gaziantep', region: 'Güneydoğu Anadolu', lat: 37.0662, lng: 37.3833, description: 'UNESCO gastronomi şehri, baklavası ve zeugma mozaikleriyle dünyaca ünlü.' },
    { name: 'Şanlıurfa', region: 'Güneydoğu Anadolu', lat: 37.1591, lng: 38.7969, description: 'Peygamberler şehri, Balıklıgöl ve Göbeklitepe ile tarihin sıfır noktası.' },
    { name: 'Diyarbakır', region: 'Güneydoğu Anadolu', lat: 37.9144, lng: 40.2306, description: 'UNESCO listesindeki surlarıyla çevrili, karpuzu ve tarihi dokusuyla tanınan.' },
    { name: 'Mardin', region: 'Güneydoğu Anadolu', lat: 37.3212, lng: 40.7245, description: 'Taş evleri ve Mezopotamya ovasına bakan manzarasıyla masalsı şehir.' },
    { name: 'Şırnak', region: 'Güneydoğu Anadolu', lat: 37.5164, lng: 42.4611, description: 'Cudi Dağı ve doğal güzellikleriyle bilinen güneydoğu şehri.' },
    { name: 'Siirt', region: 'Güneydoğu Anadolu', lat: 37.9333, lng: 41.9500, description: 'Büryan kebabı ve battaniyesiyle ünlü, tarihi ve kültürel değerleriyle zengin.' },
    { name: 'Batman', region: 'Güneydoğu Anadolu', lat: 37.8812, lng: 41.1351, description: 'Hasankeyf antik kenti ve Dicle Nehri ile tarihi doku.' },
    { name: 'Adıyaman', region: 'Güneydoğu Anadolu', lat: 37.7648, lng: 38.2786, description: 'Nemrut Dağı\'ndaki dev heykelleriyle UNESCO Dünya Mirası.' },
    { name: 'Kilis', region: 'Güneydoğu Anadolu', lat: 36.7184, lng: 37.1212, description: 'Zeytinyağı ve mutfak kültürüyle bilinen sınır şehri.' },

    // Doğu Anadolu
    { name: 'Erzurum', region: 'Doğu Anadolu', lat: 39.9000, lng: 41.2700, description: 'Palandöken kayak merkezi ve çifte minarelisiyle kış sporları başkenti.' },
    { name: 'Erzincan', region: 'Doğu Anadolu', lat: 39.7500, lng: 39.5000, description: 'Tulum peyniri ve Kemaliye\'nin tarihi evleriyle tanınan şehir.' },
    { name: 'Malatya', region: 'Doğu Anadolu', lat: 38.3552, lng: 38.3095, description: 'Kayısısıyla dünyaca ünlü, Nemrut\'a komşu Doğu Anadolu şehri.' },
    { name: 'Elazığ', region: 'Doğu Anadolu', lat: 38.6810, lng: 39.2264, description: 'Harput Kalesi ve Hazar Gölü ile tarih ve doğa iç içe.' },
    { name: 'Tunceli', region: 'Doğu Anadolu', lat: 39.1079, lng: 39.5480, description: 'Munzur Vadisi Milli Parkı ile bozulmamış doğasıyla eşsiz.' },
    { name: 'Bingöl', region: 'Doğu Anadolu', lat: 38.8854, lng: 40.4983, description: 'Bin göl bölgesi, yaylaları ve doğal güzellikleriyle saklı cennet.' },
    { name: 'Muş', region: 'Doğu Anadolu', lat: 38.7432, lng: 41.4914, description: 'Muş Ovası ve tulumbasıyla bilinen Doğu Anadolu şehri.' },
    { name: 'Bitlis', region: 'Doğu Anadolu', lat: 38.4015, lng: 42.1232, description: 'Van Gölü kıyısında, tarihi kaleleri ve kış sporlarıyla dikkat çeken şehir.' },
    { name: 'Van', region: 'Doğu Anadolu', lat: 38.4891, lng: 43.4089, description: 'Van Gölü, Akdamar Adası ve kahvaltısıyla efsanevi Doğu şehri.' },
    { name: 'Hakkari', region: 'Doğu Anadolu', lat: 37.5744, lng: 43.7408, description: 'Cilo-Sat Dağları ve buzul gölleriyle doğa harikası sınır şehri.' },
    { name: 'Ağrı', region: 'Doğu Anadolu', lat: 39.7191, lng: 43.0503, description: 'Türkiye\'nin çatısı Ağrı Dağı ve İshak Paşa Sarayı ile tanınan.' },
    { name: 'Iğdır', region: 'Doğu Anadolu', lat: 39.9167, lng: 44.0333, description: 'Ağrı Dağı manzarası ve kayısı bahçeleriyle Doğu\'nun ovası.' },
    { name: 'Ardahan', region: 'Doğu Anadolu', lat: 41.1105, lng: 42.7022, description: 'Çıldır Gölü ve kış manzaralarıyla büyüleyen kuzeydoğu şehri.' },
    { name: 'Kars', region: 'Doğu Anadolu', lat: 40.6013, lng: 43.0975, description: 'Ani Harabeleri ve kaz peyniriyle tanınan, Kafkas sınırındaki tarihi şehir.' },
];

// ─── Ana fonksiyon ───────────────────────────────────────────────────────────
async function seedCities() {
    console.log('🌍 Türkiye\'nin tüm şehirleri Supabase\'e ekleniyor...\n');

    // Mevcut şehirleri kontrol et
    const { data: existing, error: fetchError } = await supabase
        .from('cities')
        .select('name');

    if (fetchError) {
        console.error('❌ Mevcut şehirler okunamadı:', fetchError.message);
        process.exit(1);
    }

    const existingNames = new Set((existing || []).map(c => c.name));
    const newCities = CITIES.filter(c => !existingNames.has(c.name));

    if (newCities.length === 0) {
        console.log('✅ Tüm şehirler zaten mevcut! Toplam:', existingNames.size);
        return;
    }

    console.log(`📊 Mevcut: ${existingNames.size}, Eklenecek: ${newCities.length}\n`);

    // Batch olarak ekle (Supabase 1000'e kadar batch destekler)
    const batchSize = 50;
    let added = 0;

    for (let i = 0; i < newCities.length; i += batchSize) {
        const batch = newCities.slice(i, i + batchSize);
        // DB'de sadece name ve region var
        const batchData = batch.map(c => ({ name: c.name, region: c.region }));
        const { error: insertError } = await supabase
            .from('cities')
            .insert(batchData);

        if (insertError) {
            console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} hata:`, insertError.message);
            console.error('   Detay:', JSON.stringify(insertError));
            // Tek tek dene
            for (const city of batch) {
                // Sadece name ve region gönder (DB şemasına uygun)
                const insertData = { name: city.name, region: city.region };
                
                const { error: singleError } = await supabase
                    .from('cities')
                    .insert(insertData);
                if (singleError) {
                    console.error(`  ⚠️  ${city.name}: ${singleError.message}`);
                } else {
                    added++;
                    console.log(`  ✅ ${city.name}`);
                }
            }
        } else {
            added += batch.length;
            batch.forEach(c => console.log(`  ✅ ${c.name}`));
        }
    }

    console.log(`\n🎉 Toplam ${added} yeni şehir eklendi!`);
    console.log(`📊 Veritabanında toplam: ${existingNames.size + added} şehir`);
}

seedCities().catch(console.error);
