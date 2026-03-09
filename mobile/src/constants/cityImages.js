/**
 * Şehir görselleri ve açıklama veri kaynağı.
 *
 * Unsplash Source API (ücretsiz, API key gerektirmez):
 *   https://source.unsplash.com/800x600/?istanbul,turkey
 *
 * Yedek olarak curated, yüksek kaliteli Unsplash fotoğrafları kullanılır.
 */

// ─── Curated high-quality city images ───
// Her şehir için el ile seçilmiş, stabil Unsplash resim URL'leri
const CITY_IMAGES = {
    istanbul: {
        hero: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=600&fit=crop&q=80',
        card: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=400&h=300&fit=crop&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&h=400&fit=crop&q=80',
            'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=600&h=400&fit=crop&q=80',
            'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=600&h=400&fit=crop&q=80',
            'https://images.unsplash.com/photo-1689010481374-03ed3b27e7b4?w=600&h=400&fit=crop&q=80',
        ],
    },
    antalya: {
        hero: 'https://images.unsplash.com/photo-1593238739364-18cfde3c3c2b?w=800&h=600&fit=crop&q=80',
        card: 'https://images.unsplash.com/photo-1593238739364-18cfde3c3c2b?w=400&h=300&fit=crop&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1593238739364-18cfde3c3c2b?w=600&h=400&fit=crop&q=80',
            'https://images.unsplash.com/photo-1601893211899-2e25b268e028?w=600&h=400&fit=crop&q=80',
            'https://images.unsplash.com/photo-1615460549969-36fa19c9d3e9?w=600&h=400&fit=crop&q=80',
        ],
    },
    konya: {
        hero: 'https://images.unsplash.com/photo-1590080876351-941da357b89e?w=800&h=600&fit=crop&q=80',
        card: 'https://images.unsplash.com/photo-1590080876351-941da357b89e?w=400&h=300&fit=crop&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1590080876351-941da357b89e?w=600&h=400&fit=crop&q=80',
        ],
    },
    trabzon: {
        hero: 'https://images.unsplash.com/photo-1615627121117-e3278bc8b1db?w=800&h=600&fit=crop&q=80',
        card: 'https://images.unsplash.com/photo-1615627121117-e3278bc8b1db?w=400&h=300&fit=crop&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1615627121117-e3278bc8b1db?w=600&h=400&fit=crop&q=80',
        ],
    },
    kapadokya: {
        hero: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=800&h=600&fit=crop&q=80',
        card: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=400&h=300&fit=crop&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=600&h=400&fit=crop&q=80',
            'https://images.unsplash.com/photo-1570939274717-7eda259c50ed?w=600&h=400&fit=crop&q=80',
        ],
    },
    izmir: {
        hero: 'https://images.unsplash.com/photo-1589491106922-a8c2a4b18dab?w=800&h=600&fit=crop&q=80',
        card: 'https://images.unsplash.com/photo-1589491106922-a8c2a4b18dab?w=400&h=300&fit=crop&q=80',
        gallery: [
            'https://images.unsplash.com/photo-1589491106922-a8c2a4b18dab?w=600&h=400&fit=crop&q=80',
        ],
    },
};

// Default fallback image
const DEFAULT_HERO = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop&q=80';
const DEFAULT_CARD = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop&q=80';

/**
 * Bir şehrin görsel URL'lerini döndürür.
 * @param {string} cityName - Şehir adı
 * @returns {{ hero: string, card: string, gallery: string[] }}
 */
export function getCityImages(cityName) {
    if (!cityName) return { hero: DEFAULT_HERO, card: DEFAULT_CARD, gallery: [DEFAULT_HERO] };

    const key = cityName
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .trim();

    const images = CITY_IMAGES[key];
    if (images) return images;

    // Fallback: bilinmeyen şehirler için genel Türkiye fotoğrafı
    return {
        hero: DEFAULT_HERO,
        card: DEFAULT_CARD,
        gallery: [DEFAULT_HERO],
    };
}

/**
 * Bir kategoriye uygun fallback görsel URL'si döndürür.
 * @param {string} category - Yer kategorisi
 * @returns {string}
 */
export function getCategoryImage(category) {
    const categoryImages = {
        historical: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&h=300&fit=crop&q=80',
        museum: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=400&h=300&fit=crop&q=80',
        nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&q=80',
        religious: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=400&h=300&fit=crop&q=80',
        shopping: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop&q=80',
        beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop&q=80',
    };
    return categoryImages[category] || DEFAULT_CARD;
}

export { DEFAULT_HERO, DEFAULT_CARD };
