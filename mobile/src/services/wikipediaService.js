/**
 * Wikipedia REST API servisi
 * Tamamen ücretsiz, API key gerektirmez
 * 
 * Kullanım:
 *   const info = await getPlaceSummary('Ayasofya');
 *   // → { title, description, imageUrl, fullImageUrl }
 */

const TR_API = 'https://tr.wikipedia.org/api/rest_v1';
const EN_API = 'https://en.wikipedia.org/api/rest_v1';

/**
 * Bir yerin Wikipedia özet bilgisini getirir.
 * Önce Türkçe Wikipedia'da arar, bulamazsa İngilizce'ye düşer.
 * 
 * @param {string} placeName - Yer adı (örn: "Ayasofya")
 * @returns {{ title, description, imageUrl, fullImageUrl } | null}
 */
export async function getPlaceSummary(placeName) {
    if (!placeName) return null;

    const encoded = encodeURIComponent(placeName);

    // 1) Türkçe Wikipedia'dan dene
    const trResult = await fetchSummary(`${TR_API}/page/summary/${encoded}`);
    if (trResult) return trResult;

    // 2) İngilizce Wikipedia fallback
    const enResult = await fetchSummary(`${EN_API}/page/summary/${encoded}`);
    if (enResult) return enResult;

    return null;
}

/**
 * Birden fazla yer için Wikipedia bilgisi getirir (paralel).
 * 
 * @param {string[]} placeNames - Yer adları listesi
 * @returns {Object} - { "Ayasofya": { title, description, imageUrl }, ... }
 */
export async function getBatchSummaries(placeNames) {
    const results = {};

    const promises = placeNames.map(async (name) => {
        try {
            const info = await getPlaceSummary(name);
            if (info) {
                results[name] = info;
            }
        } catch (err) {
            // Sessizce devam et — bir yer için bilgi bulunamazsa sorun değil
        }
    });

    await Promise.allSettled(promises);
    return results;
}

// ── Yardımcı fonksiyon ──
async function fetchSummary(url) {
    try {
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                // Wikipedia API kibarlık kuralı: User-Agent bildirmek
                'User-Agent': 'SmartTravelGuide/1.0 (React Native App)',
            },
        });

        if (!res.ok) return null;

        const data = await res.json();

        // "disambiguation" sayfalarını atla
        if (data.type === 'disambiguation') return null;

        return {
            title: data.title || '',
            description: data.extract || '',
            imageUrl: data.thumbnail?.source || null,
            fullImageUrl: data.originalimage?.source || null,
        };
    } catch {
        return null;
    }
}
