import Constants from 'expo-constants';
import { getNearbyHotels, getNearbyRestaurants } from './overpassApi';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey;

/**
 * EdgeFunctionApi – Supabase Edge Function çağrıları.
 * Her fonksiyon bir Edge Function endpoint'ini temsil eder.
 */

/**
 * Timeout wrapper - fetch çağrılarına zaman aşımı ekler
 */
const fetchWithTimeout = (url, options = {}, timeout = 15000) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('İstek zaman aşımına uğradı')), timeout)
        )
    ]);
};

/**
 * optimize-route Edge Function — OpenRouteService ile rota optimizasyonu.
 * Edge Function erişilemezse null döner; çağıran kod haversine fallback uygular.
 *
 * @param {{ lat: number, lng: number }} accommodation
 * @param {Array<{ lat: number, lng: number, name: string }>} places
 */
export const getOptimizedRoute = async (accommodation, places) => {
    try {
        const response = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/optimize-route`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ accommodation, places }),
        }, 15000);

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
export { getNearbyHotels, getNearbyRestaurants };

export const askTravelAssistant = async (message, context = {}, history = []) => {
    const useRemoteAssistant = Constants.expoConfig?.extra?.useRemoteAssistant === true;

    if (!useRemoteAssistant) {
        return {
            data: {
                reply: 'Gezi asistanı şu anda devre dışı.',
                fallback: true,
                source: 'disabled',
            },
            error: null,
        };
    }

    try {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            return {
                data: {
                    reply: 'Gezi asistanı şu anda devre dışı.',
                    fallback: true,
                    source: 'disabled',
                },
                error: null,
            };
        }

        const response = await fetchWithTimeout(
            `${SUPABASE_URL}/functions/v1/travel-assistant`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    apikey: SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                    message,
                    context,
                    history,
                }),
            },
            15000
        );

        if (!response.ok) {
            const errText = await response.text();
            console.warn('travel-assistant Edge Function error:', errText);
            const isQuotaError =
                response.status === 429 ||
                errText.includes('RESOURCE_EXHAUSTED') ||
                errText.includes('Quota exceeded');

            if (isQuotaError) {
                return {
                    data: {
                        reply: buildOfflineAssistantReply(
                            message,
                            context,
                            'Asistan kotası dolu olduğu için şimdilik yerel öneriyle yardımcı oluyorum.'
                        ),
                        fallback: true,
                        source: 'local',
                    },
                    error: null,
                };
            }

            return { data: null, error: 'Asistan yanıt veremedi.' };
        }

        const data = await response.json();
        return { data, error: null };

    } catch (err) {
        console.warn('askTravelAssistant error:', err.message);
        return {
            data: {
                reply: buildOfflineAssistantReply(
                    message,
                    context,
                    'Bağlantı sorunu olduğu için çevrimdışı öneri sunuyorum.'
                ),
                fallback: true,
                source: 'local',
            },
            error: null,
        };
    }
};

function buildOfflineAssistantReply(message, context = {}, prefix = '') {
    const intro = prefix ? `${prefix}\n\n` : '';
    return intro + 'Gezi asistanı şu anda devre dışı.';
}
