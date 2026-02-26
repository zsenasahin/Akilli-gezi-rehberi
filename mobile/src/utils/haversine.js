/**
 * Haversine formülü ile iki koordinat arasındaki mesafeyi hesaplar.
 * 
 * @param {number} lat1 - Başlangıç enlemi
 * @param {number} lon1 - Başlangıç boylamı
 * @param {number} lat2 - Bitiş enlemi
 * @param {number} lon2 - Bitiş boylamı
 * @returns {number} Mesafe (km cinsinden)
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Dünya yarıçapı (km)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Konaklama noktasından başlayarak gezi noktalarını en yakından uzağa sıralar.
 * Greedy nearest-neighbor algoritması kullanır.
 * 
 * @param {{ lat: number, lng: number }} start - Konaklama koordinatı
 * @param {Array<{ id: number, name: string, lat: number, lng: number }>} places - Gezi noktaları
 * @returns {Array} Sıralanmış gezi noktaları (mesafe bilgisiyle)
 */
export function sortPlacesByNearest(start, places) {
    if (!places || places.length === 0) return [];

    const remaining = [...places];
    const sorted = [];
    let current = { lat: start.lat, lng: start.lng };

    while (remaining.length > 0) {
        let nearestIndex = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const dist = haversineDistance(
                current.lat, current.lng,
                remaining[i].lat, remaining[i].lng
            );
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIndex = i;
            }
        }

        const nearest = remaining.splice(nearestIndex, 1)[0];
        sorted.push({
            ...nearest,
            distanceFromPrev: Math.round(nearestDist * 1000), // metre cinsinden
        });
        current = { lat: nearest.lat, lng: nearest.lng };
    }

    return sorted;
}

/**
 * Toplam rota mesafesini hesaplar.
 * @param {{ lat: number, lng: number }} start
 * @param {Array<{ lat: number, lng: number }>} waypoints
 * @returns {number} Toplam mesafe (km)
 */
export function calculateTotalDistance(start, waypoints) {
    if (!waypoints || waypoints.length === 0) return 0;

    let total = haversineDistance(start.lat, start.lng, waypoints[0].lat, waypoints[0].lng);

    for (let i = 0; i < waypoints.length - 1; i++) {
        total += haversineDistance(
            waypoints[i].lat, waypoints[i].lng,
            waypoints[i + 1].lat, waypoints[i + 1].lng
        );
    }

    return Math.round(total * 100) / 100;
}
