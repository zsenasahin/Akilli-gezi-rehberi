/**
 * Map Service — harita tabanlı POI ve rota işlemleri.
 *
 * Yakın otel ve restoranlar için doğrudan Overpass API kullanır.
 * Rota optimizasyonu için Supabase Edge Function'ı (optimize-route) çağırır.
 */

import {
    getNearbyHotels as overpassHotels,
    getNearbyRestaurants as overpassRestaurants,
} from './poiService';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/secrets';


/**
 * Belirli bir koordinat çevresindeki otelleri getirir (Overpass API).
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radius=2000] – metre cinsinden
 * @returns {Promise<{ data: Array, error: string|null }>}
 */
export const getNearbyHotels = (lat, lng, radius = 2000) =>
    overpassHotels(lat, lng, radius);


/**
 * Belirli bir koordinat çevresindeki restoranları getirir (Overpass API).
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radius=1000] – metre cinsinden
 * @returns {Promise<{ data: Array, error: string|null }>}
 */
export const getNearbyRestaurants = (lat, lng, radius = 1000) =>
    overpassRestaurants(lat, lng, radius);

/**
 * Konaklama noktasından başlayarak gezi noktalarını optimize eder.
 * Supabase Edge Function (optimize-route) → OpenRouteService API.
 *
 * Edge Function erişilemez olursa null döner; çağıran kod haversine
 * fallback'ini devreye almalıdır.
 *
 * @param {{ lat: number, lng: number }} accommodation
 * @param {Array<{ lat: number, lng: number, name: string }>} places
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export const getOptimizedRoute = async (accommodation, places) => {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/optimize-route`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ accommodation, places }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn('optimize-route Edge Function error:', errorText);
            return { data: null, error: 'Rota hesaplanırken hata oluştu.' };
        }

        const data = await response.json();
        return { data, error: null };
    } catch (err) {
        console.warn('getOptimizedRoute network error:', err.message);
        return { data: null, error: 'Bağlantı hatası.' };
    }
};
