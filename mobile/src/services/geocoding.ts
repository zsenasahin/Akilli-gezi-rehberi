export interface GeocodeResult {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}

/**
 * OpenStreetMap Nominatim API kullanarak ücretsiz adres ve konum araması yapar.
 * Örnek kullanım: Kullanıcının kendi otelini aratması.
 * @param query - Aranacak kelime (Örn: "Hilton Taksim")
 */
export async function searchLocation(query: string): Promise<GeocodeResult[]> {
  try {
    // Nominatim ücretsiz servisi, isteklerin bloklanmaması için mutlaka bir "User-Agent" bekler.
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SmartTravelGuideApp/1.0 (zeynep@example.com)',
        'Accept-Language': 'tr-TR'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API hatası: ${response.status}`);
    }

    const data = await response.json();

    return data.map((item: any) => ({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      name: item.name || item.display_name.split(',')[0], // En anlamlı kısa ismi almaya çalış
      address: item.display_name
    }));
  } catch (error) {
    console.error('Geocoding search error:', error);
    return [];
  }
}
