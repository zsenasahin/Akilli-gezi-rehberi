export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @param start - Starting coordinates
 * @param end - Ending coordinates
 * @returns Distance in kilometers
 */
export function haversineDistance(start: Coordinates, end: Coordinates): number {
  const toRadian = (angle: number) => (Math.PI / 180) * angle;
  const distance = (a: number, b: number) => (Math.PI / 180) * (a - b);
  const RADIUS_OF_EARTH_IN_KM = 6371;

  const dLat = distance(end.latitude, start.latitude);
  const dLon = distance(end.longitude, start.longitude);

  const lat1 = toRadian(start.latitude);
  const lat2 = toRadian(end.latitude);

  const a =
    Math.pow(Math.sin(dLat / 2), 2) +
    Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.asin(Math.sqrt(a));

  return RADIUS_OF_EARTH_IN_KM * c;
}
