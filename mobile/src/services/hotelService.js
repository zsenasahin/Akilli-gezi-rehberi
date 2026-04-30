import { getCityCenter } from '../constants/cities';
import { getCityPOIs } from '../data/api/overpassApi';

/**
 * hotelService.js
 *
 * Overpass API'den gerçek otel verisi çeker.
 * API başarısız olursa Google Maps araması için link üretir.
 */

/**
 * Şehir için gerçek otel önerileri çeker (Overpass API).
 * places parametresi verilirse gezilen yerlerin ağırlık merkezine
 * en yakın oteller öne çıkar.
 *
 * @param {string} cityName
 * @param {Array} [places] - Gezilecek yerler (lat/lng içeren)
 * @returns {Promise<{ data: Array, error: null|string }>}
 */
export const getHotelSuggestions = async (cityName, places = []) => {
    const center = getCityCenter(cityName);

    // Gezilen yerlerin ağırlık merkezi
    const validPlaces = (places || []).filter(p => p.lat && p.lng);
    let pivotLat = center.lat;
    let pivotLng = center.lng;

    if (validPlaces.length > 0) {
        pivotLat = validPlaces.reduce((s, p) => s + p.lat, 0) / validPlaces.length;
        pivotLng = validPlaces.reduce((s, p) => s + p.lng, 0) / validPlaces.length;
    }

    try {
        const { data: pois, error } = await getCityPOIs(center.lat, center.lng, 'hotel', 5000);

        if (!error && pois && pois.length > 0) {
            // Mesafe hesapla ve sırala
            const withDist = pois.map(h => ({
                ...h,
                id: String(h.id),
                type: h.categoryLabel || 'Otel',
                stars: h.stars || 0,
                priceRange: h.priceRange || '',
                description: [h.cuisine, h.address].filter(Boolean).join(' · ') || `${cityName} merkezi`,
                amenities: [
                    h.internetAccess && 'WiFi',
                    h.phone && 'Telefon',
                    h.website && 'Web',
                ].filter(Boolean),
                distanceKm: Math.round(
                    haversine(pivotLat, pivotLng, h.lat, h.lng) * 10
                ) / 10,
            }));

            withDist.sort((a, b) => a.distanceKm - b.distanceKm);
            return { data: withDist.slice(0, 10), error: null };
        }
    } catch (err) {
        console.warn('getHotelSuggestions Overpass error:', err.message);
    }

    // Fallback: Google Maps araması için tek bir "kart" döndür
    const mapsUrl = `https://www.google.com/maps/search/oteller/@${center.lat},${center.lng},14z`;
    return {
        data: [{
            id: 'maps-search',
            name: `${cityName} Otelleri`,
            type: 'Google Maps',
            stars: 0,
            priceRange: '',
            description: 'Google Maps\'te yakın otelleri görüntüle',
            amenities: [],
            lat: center.lat,
            lng: center.lng,
            distanceKm: 0,
            address: cityName,
            mapsUrl,
            isMapsLink: true,
        }],
        error: null,
    };
};

function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Geriye dönük uyumluluk
 */
export const getMockHotels = (cityName) => ({
    data: [{
        id: 'maps-search',
        name: `${cityName} Otelleri`,
        type: 'Google Maps',
        stars: 0,
        priceRange: '',
        description: 'Google Maps\'te yakın otelleri görüntüle',
        amenities: [],
        lat: getCityCenter(cityName).lat,
        lng: getCityCenter(cityName).lng,
        distanceKm: 0,
        address: cityName,
        mapsUrl: `https://www.google.com/maps/search/oteller/@${getCityCenter(cityName).lat},${getCityCenter(cityName).lng},14z`,
        isMapsLink: true,
    }],
    error: null,
});
