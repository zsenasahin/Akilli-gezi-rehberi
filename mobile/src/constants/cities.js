/**
 * Centralized city data used across the app.
 * Avoids copy-pasting CITY_CENTERS in multiple screens.
 */

/** Map default coordinates for each supported city. */
export const CITY_CENTERS = {
    İstanbul: { lat: 41.0082, lng: 28.9784 },
    Antalya: { lat: 36.8969, lng: 30.7133 },
    Konya: { lat: 37.8746, lng: 32.4932 },
    Trabzon: { lat: 41.0027, lng: 39.7168 },
    Kapadokya: { lat: 38.6431, lng: 34.8289 },
    İzmir: { lat: 38.4192, lng: 27.1287 },
};

/** Fallback coordinates when a city is not in the map. */
export const DEFAULT_CITY_CENTER = CITY_CENTERS.İstanbul;

/**
 * Get the center coordinates for a city by name.
 * Falls back to Istanbul if the city is not found.
 *
 * @param {string} cityName
 * @returns {{ lat: number, lng: number }}
 */
export const getCityCenter = (cityName) =>
    CITY_CENTERS[cityName] ?? DEFAULT_CITY_CENTER;
