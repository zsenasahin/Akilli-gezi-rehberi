/**
 * Itinerary Generator – core business logic.
 *
 * Generates a day-by-day travel plan using distance-based grouping
 * and the Haversine formula for route optimization.
 *
 * Algorithm:
 *   1. Sort places by popularity_score (top picks first)
 *   2. Use nearest-neighbor heuristic to group by proximity
 *   3. Distribute across days respecting MAX_HOURS_PER_DAY
 *   4. Balance days so no day is overloaded
 *
 * Later scalable: replace with k-means clustering or DBSCAN.
 */

// ─── Constants ──────────────────────────────────────
const MAX_HOURS_PER_DAY = 8;
const EARTH_RADIUS_KM = 6371;

// ─── Haversine Distance ─────────────────────────────

/**
 * Calculate distance between two coordinates in kilometers.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in km
 */
export const haversineDistance = (lat1, lng1, lat2, lng2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
};

// ─── Nearest-Neighbor Ordering ──────────────────────

/**
 * Order places using nearest-neighbor heuristic starting from a point.
 * This produces a route that minimizes large distance jumps.
 *
 * @param {Array} places – must have lat/lng
 * @param {{ lat: number, lng: number }|null} startPoint – optional starting coords
 * @returns {Array} ordered places
 */
const orderByNearestNeighbor = (places, startPoint = null) => {
    if (places.length <= 1) return [...places];

    const remaining = [...places];
    const ordered = [];

    // Start from provided point or the first place
    let currentLat = startPoint?.lat ?? remaining[0].lat;
    let currentLng = startPoint?.lng ?? remaining[0].lng;

    while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const dist = haversineDistance(
                currentLat,
                currentLng,
                remaining[i].lat,
                remaining[i].lng
            );
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        }

        const nearest = remaining.splice(nearestIdx, 1)[0];
        ordered.push({ ...nearest, distanceFromPrev: nearestDist });
        currentLat = nearest.lat;
        currentLng = nearest.lng;
    }

    return ordered;
};

// ─── Main Generator ─────────────────────────────────

/**
 * Generate an optimized itinerary.
 *
 * @param {Array} places – sorted by popularity_score (descending) from DB
 * @param {number} days – number of trip days
 * @param {object} [options]
 * @param {{ lat: number, lng: number }|null} [options.startLocation] – starting coordinates (e.g. hotel)
 * @param {number} [options.maxHoursPerDay=8]
 * @returns {{
 *   plan: Array<{ day: number, places: Array, totalHours: number, totalDistance: number }>,
 *   totalHours: number,
 *   totalDistance: number,
 *   items: Array<{ place_id: number, day_number: number, order_index: number }>
 * }}
 */
export const generateItinerary = (places, days, options = {}) => {
    const {
        startLocation = null,
        maxHoursPerDay = MAX_HOURS_PER_DAY,
    } = options;

    // Filter out places without coordinates
    const validPlaces = places.filter(
        (p) => p.lat != null && p.lng != null
    );

    if (validPlaces.length === 0 || days <= 0) {
        return {
            plan: Array.from({ length: days }, (_, i) => ({
                day: i + 1,
                places: [],
                totalHours: 0,
                totalDistance: 0,
            })),
            totalHours: 0,
            totalDistance: 0,
            items: [],
        };
    }

    // Step 1: Order places by nearest-neighbor route
    const orderedPlaces = orderByNearestNeighbor(validPlaces, startLocation);

    // Step 2: Distribute across days respecting time budget
    const plan = Array.from({ length: days }, (_, i) => ({
        day: i + 1,
        places: [],
        totalHours: 0,
        totalDistance: 0,
    }));

    let currentDayIdx = 0;

    for (const place of orderedPlaces) {
        const duration = place.avg_duration || 1;
        const distance = place.distanceFromPrev || 0;

        // If current day is full and there are more days, move to next
        if (
            plan[currentDayIdx].totalHours + duration > maxHoursPerDay &&
            currentDayIdx < days - 1
        ) {
            currentDayIdx++;
        }

        plan[currentDayIdx].places.push(place);
        plan[currentDayIdx].totalHours += duration;
        plan[currentDayIdx].totalDistance += distance;
    }

    // Step 3: Build flat items for DB insertion
    const items = [];
    for (const dayPlan of plan) {
        dayPlan.places.forEach((place, idx) => {
            items.push({
                place_id: place.id,
                day_number: dayPlan.day,
                order_index: idx,
            });
        });
    }

    // Step 4: Summary stats
    const totalHours = plan.reduce((sum, d) => sum + d.totalHours, 0);
    const totalDistance = plan.reduce((sum, d) => sum + d.totalDistance, 0);

    return { plan, totalHours, totalDistance: Math.round(totalDistance * 10) / 10, items };
};

/**
 * Suggest an alternative place for a given day.
 * Returns a place from the same city that isn't already in the itinerary.
 *
 * @param {Array} allCityPlaces – all places in the city
 * @param {Array} usedPlaceIds – IDs already in the itinerary
 * @param {string|null} [preferCategory] – try to match category
 * @returns {object|null} – suggested place or null
 */
export const suggestAlternative = (allCityPlaces, usedPlaceIds, preferCategory = null) => {
    const available = allCityPlaces.filter((p) => !usedPlaceIds.includes(p.id));

    if (available.length === 0) return null;

    // Prefer same category if specified
    if (preferCategory) {
        const sameCat = available.filter((p) => p.category === preferCategory);
        if (sameCat.length > 0) {
            return sameCat.sort((a, b) => b.popularity_score - a.popularity_score)[0];
        }
    }

    // Otherwise return most popular available
    return available.sort((a, b) => b.popularity_score - a.popularity_score)[0];
};
