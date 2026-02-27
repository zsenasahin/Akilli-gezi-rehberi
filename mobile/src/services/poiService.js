/**
 * POI (Point of Interest) Service
 * 
 * Overpass API'ye DOĞRUDAN erişir — Edge Function gerektirmez.
 * Tamamen ücretsiz, kart bilgisi yok, API key yok.
 * 
 * Kategoriler: restaurant, cafe, bar, fast_food, hotel, atm, pharmacy, attraction
 */

const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];

// Mutfak türünü Türkçe'ye çevir
function translateCuisine(cuisine) {
    if (!cuisine) return '';
    const map = {
        'turkish': 'Türk Mutfağı', 'kebab': 'Kebap', 'pizza': 'Pizza',
        'burger': 'Burger', 'seafood': 'Deniz Ürünleri', 'italian': 'İtalyan',
        'chinese': 'Çin', 'japanese': 'Japon', 'indian': 'Hint',
        'mexican': 'Meksika', 'french': 'Fransız', 'asian': 'Asya',
        'mediterranean': 'Akdeniz', 'breakfast': 'Kahvaltı', 'coffee': 'Kahve',
        'dessert': 'Tatlı', 'ice_cream': 'Dondurma', 'bakery': 'Fırın',
        'pide': 'Pide', 'lahmacun': 'Lahmacun', 'doner': 'Döner',
        'fish': 'Balık', 'regional': 'Yöresel', 'sandwich': 'Sandviç',
        'sushi': 'Suşi', 'steak': 'Steak', 'chicken': 'Tavuk',
        'tea': 'Çay', 'cake': 'Pasta', 'grill': 'Izgara',
    };
    return cuisine.split(';').map(c => map[c.trim().toLowerCase()] || c.trim()).join(', ');
}

function getCategoryLabel(cat) {
    const map = {
        'restaurant': 'Restoran', 'cafe': 'Kafe', 'fast_food': 'Fast Food',
        'bar': 'Bar', 'pub': 'Pub', 'nightclub': 'Gece Kulübü',
        'hotel': 'Otel', 'hostel': 'Hostel', 'guest_house': 'Pansiyon',
        'motel': 'Motel', 'atm': 'ATM', 'bank': 'Banka',
        'pharmacy': 'Eczane', 'attraction': 'Turistik Yer',
        'museum': 'Müze', 'viewpoint': 'Manzara', 'artwork': 'Sanat',
    };
    return map[cat] || cat;
}

function getCategoryEmoji(cat) {
    const map = {
        'restaurant': '🍽️', 'cafe': '☕', 'fast_food': '🍔',
        'bar': '🍺', 'pub': '🍻', 'nightclub': '🎶',
        'hotel': '🏨', 'hostel': '🛏️', 'guest_house': '🏠',
        'motel': '🏨', 'atm': '🏧', 'bank': '🏦',
        'pharmacy': '💊', 'attraction': '🏛️',
        'museum': '🎨', 'viewpoint': '👁️',
    };
    return map[cat] || '📍';
}

/**
 * Overpass API'ye sorgu gönderir — birden fazla sunucu dener.
 */
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
        } catch (e) {
            // Bir sonraki sunucuyu dene
        }
    }
    throw new Error('Overpass sunucularına ulaşılamadı');
}

/**
 * Belirli kategorideki POI'ları getirir.
 */
export async function getCityPOIs(lat, lng, category = 'all', radius = 2000) {
    try {
        let filter = '';
        const limit = category === 'atm' || category === 'pharmacy' ? 10 : 25;

        switch (category) {
            case 'restaurant':
                filter = `node["amenity"="restaurant"](around:${radius},${lat},${lng});`;
                break;
            case 'cafe':
                filter = `node["amenity"~"cafe|coffee_shop"](around:${radius},${lat},${lng});`;
                break;
            case 'bar':
                filter = `node["amenity"~"bar|pub"](around:${radius},${lat},${lng});`;
                break;
            case 'fast_food':
                filter = `node["amenity"="fast_food"](around:${radius},${lat},${lng});`;
                break;
            case 'hotel':
                filter = `node["tourism"~"hotel|hostel|guest_house|motel"](around:${radius},${lat},${lng});way["tourism"~"hotel|hostel|guest_house"](around:${radius},${lat},${lng});`;
                break;
            case 'atm':
                filter = `node["amenity"~"atm|bank"](around:${radius},${lat},${lng});`;
                break;
            case 'pharmacy':
                filter = `node["amenity"="pharmacy"](around:${radius},${lat},${lng});`;
                break;
            case 'attraction':
                filter = `node["tourism"~"attraction|museum|viewpoint"](around:${radius},${lat},${lng});node["historic"](around:${radius},${lat},${lng});`;
                break;
            default:
                filter = `node["amenity"~"restaurant|cafe|fast_food|bar"](around:${radius},${lat},${lng});node["tourism"~"hotel|hostel"](around:${radius},${lat},${lng});`;
        }

        const query = `[out:json][timeout:20];(${filter});out body ${limit};`;
        const overpassData = await queryOverpass(query);

        const pois = overpassData.elements
            .filter(el => el.tags?.name)
            .map(el => {
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
                    // İletişim
                    phone: tags.phone || tags['contact:phone'] || '',
                    website: tags.website || tags['contact:website'] || '',
                    // Adres
                    address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']]
                        .filter(Boolean).join(' ') || tags['addr:full'] || '',
                    // Detaylar
                    cuisine: translateCuisine(tags.cuisine || ''),
                    stars: parseInt(tags.stars) || 0,
                    openingHours: tags.opening_hours || '',
                    internetAccess: tags.internet_access === 'wlan' || tags.internet_access === 'yes',
                    wheelchair: tags.wheelchair || '',
                    dietVegan: tags['diet:vegan'] === 'yes',
                    dietVegetarian: tags['diet:vegetarian'] === 'yes',
                    priceRange: tags.tourism === 'hotel' ? getPriceRange(parseInt(tags.stars)) : getAmenityPrice(tags.amenity),
                };
            })
            .filter(p => p.lat && p.lng);

        return { data: pois, error: null };
    } catch (err) {
        console.error('getCityPOIs error:', err.message);
        return { data: [], error: err.message };
    }
}

/**
 * Yardımcılar
 */
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

// ── Kolaylık fonksiyonları ──
export const getNearbyRestaurants = (lat, lng, r = 1500) => getCityPOIs(lat, lng, 'restaurant', r);
export const getNearbyCafes = (lat, lng, r = 1500) => getCityPOIs(lat, lng, 'cafe', r);
export const getNearbyBars = (lat, lng, r = 1500) => getCityPOIs(lat, lng, 'bar', r);
export const getNearbyHotels = (lat, lng, r = 2000) => getCityPOIs(lat, lng, 'hotel', r);
export const getNearbyAttractions = (lat, lng, r = 3000) => getCityPOIs(lat, lng, 'attraction', r);
export const getNearbyATMs = (lat, lng, r = 1000) => getCityPOIs(lat, lng, 'atm', r);
export const getNearbyPharmacies = (lat, lng, r = 1000) => getCityPOIs(lat, lng, 'pharmacy', r);
