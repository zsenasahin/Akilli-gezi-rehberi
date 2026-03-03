/**
 * WikipediaApi – Wikipedia REST API istemcisi.
 * Tamamen ücretsiz, API key gerektirmez.
 *
 * Kullanım:
 *   const info = await getPlaceSummary('Ayasofya');
 *   // → { title, description, imageUrl, fullImageUrl }
 */

const TR_API = 'https://tr.wikipedia.org/api/rest_v1';
const EN_API = 'https://en.wikipedia.org/api/rest_v1';

async function fetchSummary(url) {
    try {
        const res = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'SmartTravelGuide/1.0 (React Native App)',
            },
        });

        if (!res.ok) return null;

        const data = await res.json();
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

/**
 * Bir yer için Wikipedia özeti getirir.
 * Önce Türkçe Wikipedia dener, bulamazsa İngilizce'ye düşer.
 *
 * @param {string} placeName
 * @returns {{ title, description, imageUrl, fullImageUrl } | null}
 */
export async function getPlaceSummary(placeName) {
    if (!placeName) return null;

    const encoded = encodeURIComponent(placeName);
    const trResult = await fetchSummary(`${TR_API}/page/summary/${encoded}`);
    if (trResult) return trResult;

    return fetchSummary(`${EN_API}/page/summary/${encoded}`);
}

/**
 * Birden fazla yer için Wikipedia bilgisi getirir (paralel).
 *
 * @param {string[]} placeNames
 * @returns {Object} { "Ayasofya": { title, description, imageUrl }, ... }
 */
export async function getBatchSummaries(placeNames) {
    const results = {};
    await Promise.allSettled(
        placeNames.map(async (name) => {
            const info = await getPlaceSummary(name);
            if (info) results[name] = info;
        })
    );
    return results;
}
