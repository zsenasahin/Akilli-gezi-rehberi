import { supabase } from '../config/supabase';

/**
 * Overpass API'den otelleri çeker
 */
export const fetchHotelsNearCity = async (cityName, lat, lng, radius = 5000) => {
    try {
        // Overpass API query - oteller ve pansiyonlar
        const query = `
            [out:json][timeout:25];
            (
                node["tourism"="hotel"](around:${radius},${lat},${lng});
                node["tourism"="guest_house"](around:${radius},${lat},${lng});
                way["tourism"="hotel"](around:${radius},${lat},${lng});
                way["tourism"="guest_house"](around:${radius},${lat},${lng});
            );
            out body;
            >;
            out skel qt;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query,
        });

        if (!response.ok) {
            throw new Error('Overpass API hatası');
        }

        const data = await response.json();
        
        // Otelleri formatla
        const hotels = data.elements
            .filter(el => el.tags && el.tags.name)
            .map(el => ({
                id: el.id.toString(),
                name: el.tags.name,
                type: el.tags.tourism === 'hotel' ? 'Otel' : 'Pansiyon',
                address: el.tags['addr:street'] || el.tags['addr:city'] || '',
                stars: el.tags.stars ? parseInt(el.tags.stars) : null,
                phone: el.tags.phone || null,
                website: el.tags.website || null,
                lat: el.lat || (el.center ? el.center.lat : null),
                lng: el.lon || (el.center ? el.center.lon : null),
            }))
            .filter(hotel => hotel.lat && hotel.lng)
            .slice(0, 20); // İlk 20 otel

        return { data: hotels, error: null };
    } catch (error) {
        console.error('Hotel fetch error:', error);
        return { data: [], error: error.message };
    }
};

/**
 * Mock otel verisi (API başarısız olursa)
 */
export const getMockHotels = (cityName) => {
    const mockHotels = [
        {
            id: 'mock-1',
            name: `${cityName} Grand Hotel`,
            type: 'Otel',
            address: 'Merkez',
            stars: 5,
            lat: null,
            lng: null,
        },
        {
            id: 'mock-2',
            name: `${cityName} Boutique Hotel`,
            type: 'Otel',
            address: 'Tarihi Merkez',
            stars: 4,
            lat: null,
            lng: null,
        },
        {
            id: 'mock-3',
            name: `${cityName} Pansiyon`,
            type: 'Pansiyon',
            address: 'Şehir Merkezi',
            stars: 3,
            lat: null,
            lng: null,
        },
    ];
    return { data: mockHotels, error: null };
};
