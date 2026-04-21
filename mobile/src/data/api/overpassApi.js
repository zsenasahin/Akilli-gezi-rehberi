/**
 * OverpassApi – OpenStreetMap Overpass API istemcisi.
 *
 * Doğrudan Overpass API'ye erişir — Edge Function gerektirmez.
 * Tamamen ücretsiz, API key yok.
 *
 * Kategoriler: restaurant, cafe, bar, fast_food, hotel, atm, pharmacy, attraction
 */

const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];

// ─── Yardımcı çevirici fonksiyonlar ───────────────────────────────────────

function translateCuisine(cuisine) {
    if (!cuisine) return '';
    const map = {
        turkish: 'Türk Mutfağı', kebab: 'Kebap', pizza: 'Pizza',
        burger: 'Burger', seafood: 'Deniz Ürünleri', italian: 'İtalyan',
        chinese: 'Çin', japanese: 'Japon', indian: 'Hint',
        mexican: 'Meksika', french: 'Fransız', asian: 'Asya',
        mediterranean: 'Akdeniz', breakfast: 'Kahvaltı', coffee: 'Kahve',
        dessert: 'Tatlı', ice_cream: 'Dondurma', bakery: 'Fırın',
        pide: 'Pide', lahmacun: 'Lahmacun', doner: 'Döner',
        fish: 'Balık', regional: 'Yöresel', sandwich: 'Sandviç',
        sushi: 'Suşi', steak: 'Steak', chicken: 'Tavuk',
        tea: 'Çay', cake: 'Pasta', grill: 'Izgara',
    };
    return cuisine.split(';').map((c) => map[c.trim().toLowerCase()] || c.trim()).join(', ');
}

function getCategoryLabel(cat) {
    const map = {
        restaurant: 'Restoran', cafe: 'Kafe', fast_food: 'Fast Food',
        bar: 'Bar', pub: 'Pub', nightclub: 'Gece Kulübü',
        hotel: 'Otel', hostel: 'Hostel', guest_house: 'Pansiyon',
        motel: 'Motel', atm: 'ATM', bank: 'Banka',
        pharmacy: 'Eczane', attraction: 'Turistik Yer',
        museum: 'Müze', viewpoint: 'Manzara', artwork: 'Sanat',
    };
    return map[cat] || cat;
}

function getCategoryEmoji(cat) {
    const map = {
        restaurant: '🍽️', cafe: '☕', fast_food: '🍔',
        bar: '🍺', pub: '🍻', nightclub: '🎶',
        hotel: '🏨', hostel: '🛏️', guest_house: '🏠',
        motel: '🏨', atm: '🏧', bank: '🏦',
        pharmacy: '💊', attraction: '🏛️',
        museum: '🎨', viewpoint: '👁️',
    };
    return map[cat] || '📍';
}

function getPriceRange(stars) {
    if (stars >= 5) return '₺₺₺₺';
    if (stars >= 4) return '₺₺₺';
    if (stars >= 3) return '₺₺';
    if (stars >= 1) return '₺';
    return '';
}

function getAmenityPrice(amenity) {
    if (amenity === 'fast_food') return '₺';
    if (amenity === 'cafe') return '₺₺';
    if (amenity === 'restaurant') return '₺₺';
    if (amenity === 'bar' || amenity === 'pub') return '₺₺';
    return '';
}

// ─── Overpass sorgusu ──────────────────────────────────────────────────────

async function queryOverpass(query) {
    for (const server of OVERPASS_SERVERS) {
        try {
            const res = await fetch(server, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `data=${encodeURIComponent(query)}`,
            });
            if (res.ok) {
                const data = await res.json();
                if (data.elements) return data;
            }
        } catch {
            // Bir sonraki sunucuyu dene
        }
    }
    throw new Error('Overpass sunucularına ulaşılamadı');
}

function buildFilter(category, radius, lat, lng) {
    switch (category) {
        case 'restaurant': return `node["amenity"="restaurant"](around:${radius},${lat},${lng});`;
        case 'cafe': return `node["amenity"~"cafe|coffee_shop"](around:${radius},${lat},${lng});`;
        case 'bar': return `node["amenity"~"bar|pub"](around:${radius},${lat},${lng});`;
        case 'fast_food': return `node["amenity"="fast_food"](around:${radius},${lat},${lng});`;
        case 'hotel': return `node["tourism"~"hotel|hostel|guest_house|motel"](around:${radius},${lat},${lng});way["tourism"~"hotel|hostel|guest_house"](around:${radius},${lat},${lng});`;
        case 'atm': return `node["amenity"~"atm|bank"](around:${radius},${lat},${lng});`;
        case 'pharmacy': return `node["amenity"="pharmacy"](around:${radius},${lat},${lng});`;
        case 'attraction': return `node["tourism"~"attraction|museum|viewpoint"](around:${radius},${lat},${lng});node["historic"](around:${radius},${lat},${lng});`;
        default: return `node["amenity"~"restaurant|cafe|fast_food|bar"](around:${radius},${lat},${lng});node["tourism"~"hotel|hostel"](around:${radius},${lat},${lng});`;
    }
}

function parseElement(el) {
    const tags = el.tags || {};
    const cat = tags.tourism || tags.amenity || tags.historic || 'other';
    return {
        id: el.id,
        name: tags.name,
        lat: el.lat || el.center?.lat,
        lng: el.lon || el.center?.lon,
        category: cat,
        categoryLabel: getCategoryLabel(cat),
        emoji: getCategoryEmoji(cat),
        phone: tags.phone || tags['contact:phone'] || '',
        website: tags.website || tags['contact:website'] || '',
        address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']]
            .filter(Boolean).join(' ') || tags['addr:full'] || '',
        cuisine: translateCuisine(tags.cuisine || ''),
        stars: parseInt(tags.stars) || 0,
        openingHours: tags.opening_hours || '',
        internetAccess: tags.internet_access === 'wlan' || tags.internet_access === 'yes',
        wheelchair: tags.wheelchair || '',
        dietVegan: tags['diet:vegan'] === 'yes',
        dietVegetarian: tags['diet:vegetarian'] === 'yes',
        priceRange: tags.tourism === 'hotel'
            ? getPriceRange(parseInt(tags.stars))
            : getAmenityPrice(tags.amenity),
    };
}

import { cache, TTL } from '../../services/cacheService';

/**
 * Belirli kategorideki POI'ları getirir.
 * @param {number} lat
 * @param {number} lng
 * @param {string} [category='all']
 * @param {number} [radius=2000]
 */
export async function getCityPOIs(lat, lng, category = 'all', radius = 2000) {
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
        return { data: [], error: 'Geçersiz koordinatlar' };
    }
    
    // Koordinatları 0.01 hassasiyetle yuvarlayarak cache anahtarı oluştur
    const roundedLat = Math.round(lat * 100) / 100;
    const roundedLng = Math.round(lng * 100) / 100;
    const CACHE_KEY = `pois_${category}_${roundedLat}_${roundedLng}_${radius}`;
    
    try {
        const cached = await cache.get(CACHE_KEY);
        if (cached) return { data: cached, error: null, fromCache: true };

        const limit = category === 'atm' || category === 'pharmacy' ? 10 : 25;
        const filter = buildFilter(category, radius, lat, lng);
        const query = `[out:json][timeout:20];(${filter});out body ${limit};`;
        const overpassData = await queryOverpass(query);

        const pois = overpassData.elements
            .filter((el) => el.tags?.name)
            .map(parseElement)
            .filter((p) => p.lat && p.lng);

        if (pois.length > 0) {
            await cache.set(CACHE_KEY, pois, TTL.MEDIUM); // 1 saatlik cache
        }

        return { data: pois, error: null, fromCache: false };
    } catch (err) {
        console.error('getCityPOIs error:', err.message);
        return { data: [], error: err.message };
    }
}

// Kolaylık fonksiyonları
export const getNearbyRestaurants = (lat, lng, r = 1500) => getCityPOIs(lat, lng, 'restaurant', r);
export const getNearbyCafes = (lat, lng, r = 1500) => getCityPOIs(lat, lng, 'cafe', r);
export const getNearbyBars = (lat, lng, r = 1500) => getCityPOIs(lat, lng, 'bar', r);
export const getNearbyHotels = (lat, lng, r = 2000) => getCityPOIs(lat, lng, 'hotel', r);
export const getNearbyAttractions = (lat, lng, r = 3000) => getCityPOIs(lat, lng, 'attraction', r);
export const getNearbyATMs = (lat, lng, r = 1000) => getCityPOIs(lat, lng, 'atm', r);
export const getNearbyPharmacies = (lat, lng, r = 1000) => getCityPOIs(lat, lng, 'pharmacy', r);
