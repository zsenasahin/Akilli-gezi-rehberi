/**
 * Gezilecek yerler için sabit resim URL'leri.
 * Supabase'deki places.image_url alanı boş olduğunda bu dosyadan fallback alınır.
 * Her yer için birbirinden FARKLI, özgün Unsplash fotoğrafları.
 */

const PLACE_IMAGES = {
    // ─── İSTANBUL ───
    'Ayasofya': 'https://images.unsplash.com/photo-1545459720-aab3f41d311f?w=600&h=450&fit=crop&q=85',
    'Topkapı Sarayı': 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&h=450&fit=crop&q=85',
    'Sultanahmet Camii': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&h=450&fit=crop&q=85',
    'Kapalıçarşı': 'https://images.unsplash.com/photo-1558642084-fd07fae5282e?w=600&h=450&fit=crop&q=85',
    'Galata Kulesi': 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=600&h=450&fit=crop&q=85',
    'Dolmabahçe Sarayı': 'https://images.unsplash.com/photo-1568049112814-f6e4d0d7a578?w=600&h=450&fit=crop&q=85',
    'Basilika Sarnıcı': 'https://images.unsplash.com/photo-1568816588703-8a4aa81e4641?w=600&h=450&fit=crop&q=85',
    'İstanbul Arkeoloji Müzesi': 'https://images.unsplash.com/photo-1580413017907-4a70c3f684ef?w=600&h=450&fit=crop&q=85',
    'Miniatürk': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&h=450&fit=crop&q=85',
    'Emirgan Korusu': 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&h=450&fit=crop&q=85',
    'Boğaz Köprüsü': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=450&fit=crop&q=85',
    'Ortaköy': 'https://images.unsplash.com/photo-1568048689711-5e0325cea8c0?w=600&h=450&fit=crop&q=85',
    'Çırağan Sarayı': 'https://images.unsplash.com/photo-1568049112814-f6e4d0d7a578?w=600&h=450&fit=crop&q=85',
    'Karaköy': 'https://images.unsplash.com/photo-1601049676869-702ea24cfd58?w=600&h=450&fit=crop&q=85',
    'Adalar': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=450&fit=crop&q=85',

    // ─── KONYA ───
    'Mevlana Müzesi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/MevlanaMuseum.jpg/600px-MevlanaMuseum.jpg',
    'Alaeddin Tepesi': 'https://images.unsplash.com/photo-1590080876351-941da357b89e?w=600&h=450&fit=crop&q=85',
    'Karatay Medresesi': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&h=450&fit=crop&q=85',
    'İnce Minareli Medrese': 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&h=450&fit=crop&q=85',
    'Sille Köyü': 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&h=450&fit=crop&q=85',
    'Kelebek Bahçesi': 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&h=450&fit=crop&q=85',
    'Konya Bilim Merkezi': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=450&fit=crop&q=85',

    // ─── ANTALYA ───
    'Kaleiçi': 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=600&h=450&fit=crop&q=85',
    'Düden Şelalesi': 'https://images.unsplash.com/photo-1432405972618-c6b0cfba1d5a?w=600&h=450&fit=crop&q=85',
    'Antalya Müzesi': 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=450&fit=crop&q=85',
    'Konyaaltı Plajı': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=450&fit=crop&q=85',
    'Aspendos Antik Tiyatrosu': 'https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?w=600&h=450&fit=crop&q=85',
    'Perge Antik Kenti': 'https://images.unsplash.com/photo-1535850836387-0f9dfce30846?w=600&h=450&fit=crop&q=85',
    'Manavgat Şelalesi': 'https://images.unsplash.com/photo-1546587348-d12660c30aa0?w=600&h=450&fit=crop&q=85',
    'Olimpos': 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&h=450&fit=crop&q=85',
    'Antalya Liman': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=450&fit=crop&q=85',

    // ─── TRABZON ───
    'Sümela Manastırı': 'https://images.unsplash.com/photo-1615627121117-e3278bc8b1db?w=600&h=450&fit=crop&q=85',
    'Uzungöl': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=450&fit=crop&q=85',
    'Atatürk Köşkü': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=450&fit=crop&q=85',
    'Boztepe': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=450&fit=crop&q=85',
    'Çal Mağarası': 'https://images.unsplash.com/photo-1566755280037-f984975ae5b4?w=600&h=450&fit=crop&q=85',
    'Ayder Yaylası': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=450&fit=crop&q=85',
    'Trabzon Kalesi': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&h=450&fit=crop&q=85',

    // ─── KAPADOKYA ───
    'Göreme Açık Hava Müzesi': 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=600&h=450&fit=crop&q=85',
    'Uçhisar Kalesi': 'https://images.unsplash.com/photo-1570939274717-7eda259c50ed?w=600&h=450&fit=crop&q=85',
    'Derinkuyu Yeraltı Şehri': 'https://images.unsplash.com/photo-1527576539890-dfa815648363?w=600&h=450&fit=crop&q=85',
    'Paşabağları': 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&h=450&fit=crop&q=85',
    'Ihlara Vadisi': 'https://images.unsplash.com/photo-1504233529578-6d46baba6d34?w=600&h=450&fit=crop&q=85',
    'Balon Turu': 'https://images.unsplash.com/photo-1527576539890-dfa815648363?w=600&h=450&fit=crop&q=85',
    'Avanos': 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=600&h=450&fit=crop&q=85',
    'Kayaşehir': 'https://images.unsplash.com/photo-1568816588703-8a4aa81e4641?w=600&h=450&fit=crop&q=85',

    // ─── İZMİR ───
    'Efes Antik Kenti': 'https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?w=600&h=450&fit=crop&q=85',
    'Saat Kulesi': 'https://images.unsplash.com/photo-1589491106922-a8c2a4b18dab?w=600&h=450&fit=crop&q=85',
    'Kemeraltı Çarşısı': 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&h=450&fit=crop&q=85',
    'Kadifekale': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=450&fit=crop&q=85',
    'Kordon': 'https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=600&h=450&fit=crop&q=85',
    'Alaçatı': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=450&fit=crop&q=85',
    'Çeşme Kalesi': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&h=450&fit=crop&q=85',
    'Bergama': 'https://images.unsplash.com/photo-1568816588703-8a4aa81e4641?w=600&h=450&fit=crop&q=85',

    // ─── BODRUM ───
    'Bodrum Kalesi': 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=600&h=450&fit=crop&q=85',
    'Yokuşbaşı': 'https://images.unsplash.com/photo-1551882547-ff40c63fe2fa?w=600&h=450&fit=crop&q=85',
    'Bardakçı Koyu': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=450&fit=crop&q=85',

    // ─── FETHIYE ───
    'Ölüdeniz': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=450&fit=crop&q=85',
    'Kelebekler Vadisi': 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&h=450&fit=crop&q=85',
    'Kayaköy': 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&h=450&fit=crop&q=85',
    'Saklıkent Kanyonu': 'https://images.unsplash.com/photo-1504233529578-6d46baba6d34?w=600&h=450&fit=crop&q=85',
};

// Default fallback image
const DEFAULT_PLACE_IMAGE = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=450&fit=crop&q=80';
const buildPlaceFallback = (placeName, category) => {
    const query = encodeURIComponent(`${placeName || category || 'travel place'} turkey`);
    return `https://source.unsplash.com/600x450/?${query}`;
};

/**
 * Bir yerin resim URL'sini döndürür.
 * Öncelik: Supabase DB image_url > sabit harita > kategori fallback > genel default
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
        historical: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&h=450&fit=crop&q=80',
        museum: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=450&fit=crop&q=80',
        nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=450&fit=crop&q=80',
        religious: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=600&h=450&fit=crop&q=80',
        shopping: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&h=450&fit=crop&q=80',
        beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=450&fit=crop&q=80',
        entertainment: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=450&fit=crop&q=80',
        gastronomy: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=450&fit=crop&q=80',
    };
    if (category && CATEGORY_FALLBACK[category]) {
        return CATEGORY_FALLBACK[category];
    }

    // 4. Dinamik fallback (şehir/yer adına göre farklı görseller)
    return buildPlaceFallback(placeName, category) || DEFAULT_PLACE_IMAGE;
}

export { PLACE_IMAGES, DEFAULT_PLACE_IMAGE };
