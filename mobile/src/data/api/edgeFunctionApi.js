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
export { getNearbyHotels, getNearbyRestaurants };

/**
 * Gemini 1.5 Flash — Doğrudan API çağrısı (Edge Function yok)
 * API key secrets.js'den gelir (.gitignore'da, güvende)
 */
export const askTravelAssistant = async (message, context = {}, history = []) => {
    try {
        const { GEMINI_API_KEY } = await import('../../config/secrets');

        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'BURAYA_KEY_YAZ') {
            return { data: { reply: '⚙️ Gemini API key henüz ayarlanmamış.' }, error: null };
        }

        const systemText = buildSystemPrompt(context);

        // Sistem promptu ilk user/model çifti olarak ekliyoruz
        // (systemInstruction bu model versiyonunda desteklenmiyor)
        const systemTurn = [
            { role: 'user', parts: [{ text: systemText }] },
            { role: 'model', parts: [{ text: 'Anladım, Türkçe olarak yardımcı olmaya hazırım! 👋' }] },
        ];

        const historyTurns = history.map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.text }],
        }));

        const contents = [
            ...systemTurn,
            ...historyTurns,
            { role: 'user', parts: [{ text: message }] },
        ];

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                        topP: 0.9,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.warn('Gemini API error:', errText);
            return { data: null, error: 'Asistan yanıt veremedi.' };
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Yanıt alınamadı.';
        return { data: { reply }, error: null };

    } catch (err) {
        console.warn('askTravelAssistant error:', err.message);
        return { data: null, error: 'Bağlantı hatası.' };
    }
};

// ─── Sistem Prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(context = {}) {
    let prompt = `Sen "Gezi Asistanı" adlı, Türkiye'yi seven ve bilen samimi bir seyahat rehberisin.
Kısa, net ve pratik yanıtlar verirsin. Emoji kullanmaktan çekinmezsin.
Yanıtlarını Türkçe verirsin.
Yalnızca seyahat, gezi, yemek, konaklama ve şehir rehberliği konularında yardımcı olursun.
ÖNEMLİ: Hava durumu sorusunda ASLA tahmin yapma. Sadece sana verilen gerçek veriyi kullan.
`;
    if (context.city) prompt += `\nKullanıcı şu an ${context.city} şehrinde gezi planlıyor veya gezide.`;
    if (context.days) prompt += ` Gezi toplam ${context.days} gün.`;
    if (context.startDate) prompt += ` Başlangıç tarihi: ${context.startDate}.`;
    if (context.currentDay) prompt += ` Şu an ${context.currentDay}. günde.`;
    if (context.remainingTime > 0) prompt += ` Bugünkü planında yaklaşık ${context.remainingTime} dakika boş vakti var.`;
    if (context.places?.length) {
        const todayPlaces = context.places.filter(p => p.day === context.currentDay).map(p => p.name);
        if (todayPlaces.length) prompt += ` Bugünkü plan: ${todayPlaces.join(', ')}.`;
    }
    if (context.completedPlaces?.length) {
        prompt += ` Tamamlanan yerler: ${context.completedPlaces.join(', ')}.`;
    }
    if (context.weatherInfo) {
        prompt += `\n\n${context.weatherInfo}`;
    } else {
        prompt += `\n\nHava durumu sorusunda: "Gerçek zamanlı hava verim yok, uygulamadaki Hava Durumu widget'ına bakabilirsiniz 🌤️" de.`;
    }
    prompt += `\n\nKullanıcının sorusuna göre pratik, özgün ve eğlenceli öneriler sun.
Yanıtların 2-4 cümle olsun, çok uzun yazma.`;
    return prompt;
}
