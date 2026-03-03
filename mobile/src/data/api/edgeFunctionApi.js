import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../config/secrets';
import { getNearbyHotels, getNearbyRestaurants } from './overpassApi';

/**
 * EdgeFunctionApi – Supabase Edge Function çağrıları.
 * Her fonksiyon bir Edge Function endpoint'ini temsil eder.
 */

/**
 * optimize-route Edge Function — OpenRouteService ile rota optimizasyonu.
 * Edge Function erişilemezse null döner; çağıran kod haversine fallback uygular.
 *
 * @param {{ lat: number, lng: number }} accommodation
 * @param {Array<{ lat: number, lng: number, name: string }>} places
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

// Overpass'tan gelen kolaylık fonksiyonlarını buradan da export et
// (MapScreen gibi tek import noktası isteyen yerler için)
export { getNearbyHotels, getNearbyRestaurants };
