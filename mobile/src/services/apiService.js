/**
 * API service – abstracts all external API calls.
 * The mobile app should NEVER call external APIs directly from components.
 * All external data is fetched here and cached into Supabase.
 */

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php';
const WIKIPEDIA_TR_API_URL = 'https://tr.wikipedia.org/w/api.php';

/**
 * Query OpenStreetMap Overpass API for POIs near a location.
 *
 * @param {number} lat – center latitude
 * @param {number} lng – center longitude
 * @param {number} radius – search radius in meters
 * @param {string} poiType – OSM tag type: 'tourism', 'amenity', 'leisure'
 * @param {string} [poiValue] – e.g. 'hotel', 'museum', 'park'
 * @returns {Promise<{ data: Array, error: string|null }>}
 */
export const fetchPOIsFromOSM = async (lat, lng, radius = 5000, poiType = 'tourism', poiValue) => {
    try {
        let filter = `["${poiType}"]`;
        if (poiValue) {
            filter = `["${poiType}"="${poiValue}"]`;
        }

        const query = `
            [out:json][timeout:25];
            (
                node${filter}(around:${radius},${lat},${lng});
                way${filter}(around:${radius},${lat},${lng});
            );
            out center tags;
        `;

        const response = await fetch(OVERPASS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`,
        });

        if (!response.ok) {
            return { data: null, error: `Overpass API error: ${response.status}` };
        }

        const result = await response.json();

        const pois = (result.elements || [])
            .filter((el) => el.tags?.name)
            .map((el) => ({
                osmId: el.id,
                name: el.tags.name,
                nameEn: el.tags['name:en'] || null,
                lat: el.lat || el.center?.lat,
                lng: el.lon || el.center?.lon,
                type: el.tags[poiType] || poiType,
                phone: el.tags.phone || null,
                website: el.tags.website || null,
                openingHours: el.tags.opening_hours || null,
                stars: el.tags.stars || null,
                address: el.tags['addr:street']
                    ? `${el.tags['addr:street']} ${el.tags['addr:housenumber'] || ''}`
                    : null,
            }));

        return { data: pois, error: null };
    } catch (err) {
        return { data: null, error: err.message };
    }
};

/**
 * Fetch nearby hotels from OSM.
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radius=5000] – meters
 */
export const fetchNearbyHotels = async (lat, lng, radius = 5000) => {
    return fetchPOIsFromOSM(lat, lng, radius, 'tourism', 'hotel');
};

/**
 * Fetch nearby restaurants from OSM.
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radius=2000] – meters
 */
export const fetchNearbyRestaurants = async (lat, lng, radius = 2000) => {
    return fetchPOIsFromOSM(lat, lng, radius, 'amenity', 'restaurant');
};

/**
 * Fetch Wikipedia summary for a topic.
 * Tries Turkish Wikipedia first, then falls back to English.
 *
 * @param {string} title – Article title / search query
 * @returns {Promise<{ data: { title: string, extract: string, thumbnail: string|null }, error: string|null }>}
 */
export const fetchWikipediaSummary = async (title) => {
    // Try Turkish first
    const trResult = await _fetchWikiSummary(WIKIPEDIA_TR_API_URL, title);
    if (trResult.data) return trResult;

    // Fallback to English
    return _fetchWikiSummary(WIKIPEDIA_API_URL, title);
};

/**
 * Internal: fetch summary from a specific Wikipedia language API.
 */
const _fetchWikiSummary = async (baseUrl, title) => {
    try {
        const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            titles: title,
            prop: 'extracts|pageimages',
            exintro: '1',
            explaintext: '1',
            piprop: 'thumbnail',
            pithumbsize: 500,
            origin: '*',
        });

        const response = await fetch(`${baseUrl}?${params.toString()}`);
        if (!response.ok) {
            return { data: null, error: `Wikipedia API error: ${response.status}` };
        }

        const result = await response.json();
        const pages = result.query?.pages;

        if (!pages) return { data: null, error: 'No pages found' };

        const page = Object.values(pages)[0];

        if (page.missing !== undefined) {
            return { data: null, error: 'Article not found' };
        }

        return {
            data: {
                title: page.title,
                extract: page.extract || '',
                thumbnail: page.thumbnail?.source || null,
            },
            error: null,
        };
    } catch (err) {
        return { data: null, error: err.message };
    }
};
