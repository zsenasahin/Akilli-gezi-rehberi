/**
 * Map Service — Supabase Edge Function'lar üzerinden
 * harita verilerine erişim sağlar.
 * 
 * Tüm API key'ler backend'de tutulur.
 * Frontend ASLA doğrudan Overpass/ORS'a istek atmaz.
 */

import { supabase } from '../config/supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/secrets';

/**
 * Belirli bir koordinatın çevresindeki otelleri getirir.
 * Backend: Overpass API → Supabase Edge Function
 * 
 * @param {number} lat - Enlem
 * @param {number} lng - Boylam
 * @param {number} radius - Yarıçap (metre, varsayılan 2000)
 * @returns {Promise<{ data: Array, error: string|null }>}
 */
export async function getNearbyHotels(lat, lng, radius = 2000) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/nearby-hotels`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ lat, lng, radius }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Hotel API error:', errorText);
            return { data: null, error: 'Oteller yüklenirken hata oluştu.' };
        }

        const data = await response.json();
        return { data: data.hotels || [], error: null };
    } catch (err) {
        console.error('getNearbyHotels error:', err);
        return { data: null, error: 'Bağlantı hatası.' };
    }
}

/**
 * Konaklama noktasının çevresindeki restoranları getirir.
 * 
 * @param {number} lat - Enlem
 * @param {number} lng - Boylam
 * @param {number} radius - Yarıçap (metre, varsayılan 1000)
 * @returns {Promise<{ data: Array, error: string|null }>}
 */
export async function getNearbyRestaurants(lat, lng, radius = 1000) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/nearby-restaurants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ lat, lng, radius }),
        });

        if (!response.ok) {
            return { data: null, error: 'Restoranlar yüklenirken hata oluştu.' };
        }

        const data = await response.json();
        return { data: data.restaurants || [], error: null };
    } catch (err) {
        console.error('getNearbyRestaurants error:', err);
        return { data: null, error: 'Bağlantı hatası.' };
    }
}

/**
 * Konaklama noktasından başlayarak gezi noktalarını optimize eder
 * ve OpenRouteService üzerinden rota polyline döndürür.
 * 
 * @param {{ lat: number, lng: number }} accommodation - Konaklama koordinatı
 * @param {Array<{ lat: number, lng: number, name: string }>} places - Gezi noktaları
 * @returns {Promise<{ data: { route: Array, distance: number, duration: number, orderedPlaces: Array }, error: string|null }>}
 */
export async function getOptimizedRoute(accommodation, places) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/optimize-route`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ accommodation, places }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Route API error:', errorText);
            return { data: null, error: 'Rota hesaplanırken hata oluştu.' };
        }

        const data = await response.json();
        return { data, error: null };
    } catch (err) {
        console.error('getOptimizedRoute error:', err);
        return { data: null, error: 'Bağlantı hatası.' };
    }
}
