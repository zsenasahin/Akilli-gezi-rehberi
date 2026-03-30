/**
 * Şehir görselleri ve açıklama veri kaynağı.
 * Her şehir için el ile seçilmiş, stabil ve birbirinden FARKLI Unsplash resimleri.
 */

const CITY_IMAGES = {
    istanbul: {
        hero: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&h=800&fit=crop&q=85',
        card: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=500&h=350&fit=crop&q=85',
        gallery: [
            'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1568048689711-5e0325cea8c0?w=800&h=500&fit=crop&q=80',
        ],
    },
    antalya: {
        hero: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&h=800&fit=crop&q=85',
        card: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=350&fit=crop&q=85',
        gallery: [
            'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1601893211899-2e25b268e028?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1615460549969-36fa19c9d3e9?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=500&fit=crop&q=80',
        ],
    },
    konya: {
        hero: 'https://images.unsplash.com/photo-1590080876351-941da357b89e?w=1200&h=800&fit=crop&q=85',
        card: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=500&h=350&fit=crop&q=85',
        gallery: [
            'https://images.unsplash.com/photo-1590080876351-941da357b89e?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&h=500&fit=crop&q=80',
        ],
    },
    trabzon: {
        hero: 'https://images.unsplash.com/photo-1615627121117-e3278bc8b1db?w=1200&h=800&fit=crop&q=85',
        card: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&h=350&fit=crop&q=85',
        gallery: [
            'https://images.unsplash.com/photo-1615627121117-e3278bc8b1db?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=500&fit=crop&q=80',
        ],
    },
    kapadokya: {
        hero: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=1200&h=800&fit=crop&q=85',
        card: 'https://images.unsplash.com/photo-1570939274717-7eda259c50ed?w=500&h=350&fit=crop&q=85',
        gallery: [
            'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1570939274717-7eda259c50ed?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1527576539890-dfa815648363?w=800&h=500&fit=crop&q=80',
        ],
    },
    izmir: {
        hero: 'https://images.unsplash.com/photo-1589491106922-a8c2a4b18dab?w=1200&h=800&fit=crop&q=85',
        card: 'https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=500&h=350&fit=crop&q=85',
        gallery: [
            'https://images.unsplash.com/photo-1589491106922-a8c2a4b18dab?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=80',
        ],
    },
    bursa: {
        hero: 'https://images.unsplash.com/photo-1565780248571-ece2c9a48ffd?w=1200&h=800&fit=crop&q=85',
        card: 'https://images.unsplash.com/photo-1565780248571-ece2c9a48ffd?w=500&h=350&fit=crop&q=85',
        gallery: [
            'https://images.unsplash.com/photo-1565780248571-ece2c9a48ffd?w=800&h=500&fit=crop&q=80',
        ],
    },
    ankara: {
        hero: 'https://images.unsplash.com/photo-1601049676869-702ea24cfd58?w=1200&h=800&fit=crop&q=85',
        card: 'https://images.unsplash.com/photo-1601049676869-702ea24cfd58?w=500&h=350&fit=crop&q=85',
        gallery: [
            'https://images.unsplash.com/photo-1601049676869-702ea24cfd58?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=500&fit=crop&q=80',
        ],
    },
    bodrum: {
        hero: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1200&h=800&fit=crop&q=85',
        card: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=500&h=350&fit=crop&q=85',
        gallery: [
            'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1551882547-ff40c63fe2fa?w=800&h=500&fit=crop&q=80',
        ],
    },
    fethiye: {
        hero: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=800&fit=crop&q=85',
        card: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&h=350&fit=crop&q=85',
        gallery: [
            'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=500&fit=crop&q=80',
            'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=500&fit=crop&q=80',
        ],
    },
};

// Default fallback
const DEFAULT_HERO = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=800&fit=crop&q=80';
const DEFAULT_CARD = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&h=350&fit=crop&q=80';

const buildCityFallback = (cityName, type = 'hero') => {
    const size = type === 'hero' ? '1200x800' : '500x350';
    const query = encodeURIComponent(`${cityName || 'turkey city'} skyline turkey`);
    return `https://source.unsplash.com/${size}/?${query}`;
};

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
        .replace(/\s+/g, '')
        .trim();

    const images = CITY_IMAGES[key];
    if (images) return images;

    return {
        hero: buildCityFallback(cityName, 'hero'),
        card: buildCityFallback(cityName, 'card'),
        gallery: [buildCityFallback(cityName, 'hero')],
    };
}

/**
 * Kategori bazlı fallback görsel URL'si döndürür.
 */
export function getCategoryImage(category) {
    const categoryImages = {
        historical: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=500&h=350&fit=crop&q=80',
        museum: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=500&h=350&fit=crop&q=80',
        nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500&h=350&fit=crop&q=80',
        religious: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=500&h=350&fit=crop&q=80',
        shopping: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=500&h=350&fit=crop&q=80',
        beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&h=350&fit=crop&q=80',
        entertainment: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=350&fit=crop&q=80',
        gastronomy: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=350&fit=crop&q=80',
    };
    return categoryImages[category] || DEFAULT_CARD;
}

export { DEFAULT_HERO, DEFAULT_CARD };
