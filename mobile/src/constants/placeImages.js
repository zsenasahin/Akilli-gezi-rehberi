/**
 * Gezilecek yerler için sabit resim URL'leri.
 * Supabase'deki places.image_url alanı boş olduğunda bu dosyadan fallback alınır.
 * 
 * Kaynak: Unsplash (ücretsiz, API key gerektirmez) ve Wikimedia Commons
 */

const PLACE_IMAGES = {
    // ─── İSTANBUL ───
    'Ayasofya': 'https://images.unsplash.com/photo-1545459720-aab3f41d311f?w=500&h=400&fit=crop&q=80',
    'Topkapı Sarayı': 'https://images.unsplash.com/photo-1575993781592-064d6e1fc01a?w=500&h=400&fit=crop&q=80',
    'Sultanahmet Camii': 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=500&h=400&fit=crop&q=80',
    'Kapalıçarşı': 'https://images.unsplash.com/photo-1558642084-fd07fae5282e?w=500&h=400&fit=crop&q=80',
    'Galata Kulesi': 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=500&h=400&fit=crop&q=80',
    'Dolmabahçe Sarayı': 'https://images.unsplash.com/photo-1614537899007-1bc7e0e5c581?w=500&h=400&fit=crop&q=80',
    'Basilika Sarnıcı': 'https://images.unsplash.com/photo-1568816588703-8a4aa81e4641?w=500&h=400&fit=crop&q=80',
    'İstanbul Arkeoloji Müzesi': 'https://images.unsplash.com/photo-1580413017907-4a70c3f684ef?w=500&h=400&fit=crop&q=80',
    'Miniatürk': 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=500&h=400&fit=crop&q=80',
    'Emirgan Korusu': 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=500&h=400&fit=crop&q=80',

    // ─── KONYA ───
    'Mevlana Müzesi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/MevlanaMuseum.jpg/500px-MevlanaMuseum.jpg',
    'Alaeddin Tepesi': 'https://images.unsplash.com/photo-1590080876351-941da357b89e?w=500&h=400&fit=crop&q=80',
    'Karatay Medresesi': 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=500&h=400&fit=crop&q=80',
    'İnce Minareli Medrese': 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=500&h=400&fit=crop&q=80',
    'Sille Köyü': 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=500&h=400&fit=crop&q=80',
    'Kelebek Bahçesi': 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=500&h=400&fit=crop&q=80',

    // ─── ANTALYA ───
    'Kaleiçi': 'https://images.unsplash.com/photo-1593238739364-18cfde3c3c2b?w=500&h=400&fit=crop&q=80',
    'Düden Şelalesi': 'https://images.unsplash.com/photo-1432405972618-c6b0cfba1d5a?w=500&h=400&fit=crop&q=80',
    'Antalya Müzesi': 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=500&h=400&fit=crop&q=80',
    'Konyaaltı Plajı': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&h=400&fit=crop&q=80',
    'Aspendos Antik Tiyatrosu': 'https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?w=500&h=400&fit=crop&q=80',
    'Perge Antik Kenti': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=500&h=400&fit=crop&q=80',
    'Manavgat Şelalesi': 'https://images.unsplash.com/photo-1432405972618-c6b0cfba1d5a?w=500&h=400&fit=crop&q=80',
    'Olimpos': 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=500&h=400&fit=crop&q=80',

    // ─── TRABZON ───
    'Sümela Manastırı': 'https://images.unsplash.com/photo-1615627121117-e3278bc8b1db?w=500&h=400&fit=crop&q=80',
    'Uzungöl': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&h=400&fit=crop&q=80',
    'Atatürk Köşkü': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500&h=400&fit=crop&q=80',
    'Boztepe': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=400&fit=crop&q=80',
    'Çal Mağarası': 'https://images.unsplash.com/photo-1568816588703-8a4aa81e4641?w=500&h=400&fit=crop&q=80',

    // ─── KAPADOKYA ───
    'Göreme Açık Hava Müzesi': 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=500&h=400&fit=crop&q=80',
    'Uçhisar Kalesi': 'https://images.unsplash.com/photo-1570939274717-7eda259c50ed?w=500&h=400&fit=crop&q=80',
    'Derinkuyu Yeraltı Şehri': 'https://images.unsplash.com/photo-1568816588703-8a4aa81e4641?w=500&h=400&fit=crop&q=80',
    'Paşabağları': 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=500&h=400&fit=crop&q=80',
    'Ihlara Vadisi': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500&h=400&fit=crop&q=80',

    // ─── İZMİR ───
    'Efes Antik Kenti': 'https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?w=500&h=400&fit=crop&q=80',
    'Saat Kulesi': 'https://images.unsplash.com/photo-1589491106922-a8c2a4b18dab?w=500&h=400&fit=crop&q=80',
    'Kemeraltı Çarşısı': 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=500&h=400&fit=crop&q=80',
    'Kadifekale': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=500&h=400&fit=crop&q=80',
    'Kordon': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&h=400&fit=crop&q=80',
    'Alaçatı': 'https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=500&h=400&fit=crop&q=80',
};

// Default fallback image
const DEFAULT_PLACE_IMAGE = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&h=400&fit=crop&q=80';

/**
 * Bir yerin resim URL'sini döndürür.
 * Öncelik: Supabase DB image_url > sabit harita > kategori fallback > genel default
 * @param {string} placeName - Yer adı
 * @param {string|null} dbImageUrl - Supabase'den gelen image_url
 * @param {string|null} category - Yer kategorisi
 * @returns {string}
 */
export function getPlaceImage(placeName, dbImageUrl, category) {
    // 1. DB'de varsa onu kullan
    if (dbImageUrl && dbImageUrl.startsWith('http')) {
        return dbImageUrl;
    }

    // 2. Sabit haritada varsa onu kullan
    if (placeName && PLACE_IMAGES[placeName]) {
        return PLACE_IMAGES[placeName];
    }

    // 3. Kategori bazlı fallback
    const CATEGORY_FALLBACK = {
        historical: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&h=300&fit=crop&q=80',
        museum: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=400&h=300&fit=crop&q=80',
        nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&q=80',
        religious: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=400&h=300&fit=crop&q=80',
        shopping: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop&q=80',
        beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop&q=80',
    };
    if (category && CATEGORY_FALLBACK[category]) {
        return CATEGORY_FALLBACK[category];
    }

    // 4. Genel default
    return DEFAULT_PLACE_IMAGE;
}

export { PLACE_IMAGES, DEFAULT_PLACE_IMAGE };
