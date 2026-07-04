import { Coordinates } from '../algorithms/haversine';

export interface OverpassPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
}

/**
 * OpenStreetMap Overpass API kullanarak belirli bir koordinatın etrafındaki mekanları (restoran, kafe vb.) ücretsiz bulur.
 * @param location - Merkez koordinatlar (Enlem, Boylam)
 * @param radius - Arama yarıçapı (metre cinsinden, varsayılan: 500)
 * @param amenityType - Mekan tipi ('restaurant', 'cafe', vb.)
 */
export async function findNearbyPlaces(
  location: Coordinates, 
  radius: number = 500, 
  amenityType: string = 'restaurant'
): Promise<OverpassPlace[]> {
  
  // Overpass QL (Query Language) Sorgusu
  // Sadece isimlendirilmiş düğümleri (nodes) getirmesi ve en fazla 5 sonuç dönmesi için optimize edildi.
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="${amenityType}"](around:${radius},${location.latitude},${location.longitude});
    );
    out body 5;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      throw new Error(`Overpass API hatası: ${response.status}`);
    }

    const data = await response.json();

    // Sadece adı (tags.name) olan mekanları filtrele
    return data.elements
      .filter((el: any) => el.tags && el.tags.name)
      .map((el: any) => ({
        id: el.id.toString(),
        name: el.tags.name,
        latitude: el.lat,
        longitude: el.lon,
        type: amenityType
      }));
  } catch (error) {
    console.error('Overpass fetch error:', error);
    return [];
  }
}
